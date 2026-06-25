import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  generateStructuredJson,
  getLlmStatus,
  resolveLlmConfig,
} from './llmProvider.js';
import {
  filterCitations,
  sanitizeChatReply,
  sanitizeItemPayload,
  sanitizeSummaryPayload,
} from './knowledgeUtils.js';

type AgentObservation = {
  id?: string;
  canonicalId?: string | null;
  standardName: string;
  originalName?: string;
  value?: string | null;
  unit?: string;
  referenceRange?: string | null;
  abnormalFlag?: string | null;
  reportDate?: string;
};

type AgentRedFlag = {
  ruleId: string;
  severity: string;
  title: string;
  message: string;
};

type InterpretTarget = {
  observationId: string;
  medicalTerm: string;
  value: string;
};

function requireLlm(_req: Request, res: Response, next: NextFunction) {
  if (!getLlmStatus().configured) {
    res.status(503).json({
      message:
        '未配置可用 LLM。请在 .env.local 设置 DASHSCOPE_API_KEY（百炼）或 HUNYUAN_API_KEY，并重启 npm run dev。',
    });
    return;
  }
  next();
}

function formatObsSummary(observations: AgentObservation[]): string {
  return observations
    .slice(0, 24)
    .map(
      (o) =>
        `- ${o.standardName}${o.value != null ? `: ${o.value}${o.unit ? ` ${o.unit}` : ''}` : ''}${
          o.abnormalFlag ? ` [${o.abnormalFlag}]` : ''
        }${o.referenceRange ? ` (参考 ${o.referenceRange})` : ''}`,
    )
    .join('\n');
}

function formatFlagSummary(redFlags: AgentRedFlag[]): string {
  return redFlags
    .slice(0, 8)
    .map((f) => `- [${f.severity}] ${f.title}: ${f.message}`)
    .join('\n');
}

function formatBehaviorBlock(behaviorContext?: string): string {
  if (!behaviorContext?.trim()) return '';
  return `\n\n${behaviorContext.trim()}\n\n（行为数据仅作背景，不得推断因果关系；只能引用上述事实中的数字。）`;
}

function inferRiskLevel(redFlags: AgentRedFlag[]): 'low' | 'medium' | 'high' {
  if (redFlags.some((f) => f.severity === 'critical')) return 'high';
  if (redFlags.some((f) => f.severity === 'high')) return 'high';
  if (redFlags.some((f) => f.severity === 'moderate')) return 'medium';
  return 'low';
}

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    headline: { type: 'string' },
    followUpHint: { type: 'string' },
    careLevel: { type: 'string' },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chunkId: { type: 'string' },
          title: { type: 'string' },
          excerpt: { type: 'string' },
        },
        required: ['chunkId', 'title'],
      },
    },
  },
  required: ['summary', 'riskLevel', 'headline', 'followUpHint', 'careLevel', 'citations'],
};

type AgentCitation = { chunkId: string; title: string; excerpt?: string };

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    observationId: { type: 'string' },
    plainExplanation: { type: 'string' },
    whyAbnormal: { type: 'string' },
    lifestyleTips: { type: 'array', items: { type: 'string' } },
    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
    nature: { type: 'string', enum: ['transient', 'persistent'] },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chunkId: { type: 'string' },
          title: { type: 'string' },
          excerpt: { type: 'string' },
        },
        required: ['chunkId', 'title'],
      },
    },
  },
  required: ['observationId', 'plainExplanation', 'whyAbnormal', 'lifestyleTips', 'severity', 'nature'],
};

async function chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
  const config = resolveLlmConfig();
  if (!config) throw new Error('LLM 未配置');

  let baseUrl: string;
  let apiKey: string;
  if (config.provider === 'dashscope') {
    baseUrl = process.env.DASHSCOPE_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    apiKey = process.env.DASHSCOPE_API_KEY!;
  } else if (config.provider === 'hunyuan') {
    baseUrl = process.env.HUNYUAN_BASE_URL ?? 'https://tokenhub.tencentmaas.com/v1';
    apiKey = process.env.HUNYUAN_API_KEY!;
  } else {
    throw new Error('Agent 聊天暂仅支持百炼/混元 OpenAI 兼容模式');
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.4,
    }),
  });

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(payload.error?.message ?? `LLM 请求失败 (${res.status})`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM 返回空内容');
  return content;
}

export function createAgentRouter() {
  const router = Router();

  router.get('/health', (_req, res) => {
    const llm = getLlmStatus();
    res.json({
      ok: true,
      llmConfigured: llm.configured,
      llmProvider: llm.provider,
      llmLabel: llm.label,
    });
  });

  router.post('/interpret', requireLlm, async (req, res) => {
    try {
      const {
        mode,
        observations = [],
        redFlags = [],
        careLevel = 'S1',
        knowledgeContext = '',
        chunkIds = [],
        targets = [],
        behaviorContext = '',
      } = req.body as {
        mode?: 'summary' | 'items';
        observations?: AgentObservation[];
        redFlags?: AgentRedFlag[];
        careLevel?: string;
        knowledgeContext?: string;
        chunkIds?: string[];
        targets?: InterpretTarget[];
        behaviorContext?: string;
      };

      if (mode !== 'summary' && mode !== 'items') {
        res.status(400).json({ message: 'mode 必须为 summary 或 items' });
        return;
      }

      const obsSummary = formatObsSummary(observations);
      const flagSummary = formatFlagSummary(redFlags);
      const ruleRisk = inferRiskLevel(redFlags);
      const config = resolveLlmConfig();

      if (mode === 'summary') {
        if (!knowledgeContext?.trim()) {
          res.status(400).json({ message: 'summary 模式需要 knowledgeContext（客户端知识库检索）' });
          return;
        }

        const abnormalCount = observations.filter((o) => o.abnormalFlag != null).length;
        const prompt = `你是 Health Link 健康解读 Agent。基于下方「知识库片段」与用户体检报告，用温暖、诚实的「说人话」给出整份报告摘要。

硬性约束（L6 安全层）：
- 不得诊断、不得开处方、不得建议停药
- 使用「可能与…有关」「建议进一步评估」等表述
- 不得保证无疾病
- 必须在 citations 中引用所用知识片段 id（格式 l2:... / l3:... / l5:... / l6:...）
- 若 careLevel 为 S4，必须明确建议立即/急诊就医，但仍不得下诊断或在线处置
- 若 careLevel 为 S2/S3，强调及时就医复查，但仍不得下诊断

报告概况：共 ${observations.length} 项，${abnormalCount} 项标记异常。
规则引擎风险等级（参考）：${ruleRisk}
照护等级（参考）：${careLevel}

检验项目（节选）：
${obsSummary || '（无）'}

规则引擎提示（节选）：
${flagSummary || '（无）'}

知识库片段（仅可引用以下内容，勿编造指南）：
---
${knowledgeContext}
---${formatBehaviorBlock(behaviorContext)}

请用简体中文返回 JSON：summary（2～4 句整段说人话摘要）、riskLevel（low|medium|high）、headline（一句话标题，15 字内）、followUpHint（复查/就医建议，1 句）、careLevel（S0|S1|S2|S3|S4）、citations（[{chunkId,title,excerpt}]，至少 1 条）。`;

        const { data } = await generateStructuredJson(prompt, SUMMARY_SCHEMA);
        const sanitized = sanitizeSummaryPayload(data as Record<string, unknown>);
        const citations = filterCitations(sanitized.citations, chunkIds);
        res.json({
          mode: 'summary',
          summary: sanitized.summary,
          riskLevel: sanitized.riskLevel ?? ruleRisk,
          headline: sanitized.headline,
          followUpHint: sanitized.followUpHint,
          careLevel: typeof sanitized.careLevel === 'string' ? sanitized.careLevel : careLevel,
          citations,
          chunkIds,
          l6Filtered: sanitized.l6Filtered === true,
          disclaimer:
            '本解读仅供健康管理参考，不能替代医生面诊、诊断或治疗。如有不适请及时就医。',
          provider: config?.provider,
          model: config?.model,
        });
        return;
      }

      if (!knowledgeContext?.trim()) {
        res.status(400).json({ message: 'items 模式需要 knowledgeContext（客户端知识库检索）' });
        return;
      }

      if (!targets.length) {
        res.status(400).json({ message: 'items 模式需要 targets 数组' });
        return;
      }

      const limited = targets.slice(0, 5);
      const items: Record<string, unknown>[] = [];

      for (const target of limited) {
        const prompt = `你是 Health Link 健康解读 Agent。基于知识库片段，用说人话解读单项异常。

硬性约束：不得诊断、不得开处方；必须在 citations 中引用知识片段 id。

照护等级：${careLevel}
用户关注：${target.medicalTerm} = ${target.value}

报告观测（节选）：
${obsSummary}

规则红旗（节选）：
${flagSummary}

知识库片段：
---
${knowledgeContext}
---${formatBehaviorBlock(behaviorContext)}

请返回 JSON：observationId="${target.observationId}", plainExplanation, whyAbnormal, lifestyleTips (string[] 最多3条), severity (low|medium|high), nature (transient|persistent), citations ([{chunkId,title,excerpt}]).`;

        const { data } = await generateStructuredJson(prompt, ITEM_SCHEMA);
        const sanitized = sanitizeItemPayload(data as Record<string, unknown>);
        items.push({
          ...sanitized,
          observationId: sanitized.observationId ?? target.observationId,
          citations: filterCitations(sanitized.citations, chunkIds),
          chunkIds,
        });
      }

      res.json({
        mode: 'items',
        items,
        disclaimer:
          '本解读仅供健康管理参考，不能替代医生面诊、诊断或治疗。如有不适请及时就医。',
        provider: config?.provider,
        model: config?.model,
      });
    } catch (error) {
      console.error('[agent/interpret]', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Interpret failed.' });
    }
  });

  router.post('/chat', requireLlm, async (req, res) => {
    try {
      const {
        messages = [],
        observations = [],
        reportSummary = '',
        interpretedItems = [],
        behaviorContext = '',
      } = req.body as {
        messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
        observations?: AgentObservation[];
        reportSummary?: string;
        interpretedItems?: Array<{ standardName: string; plainExplanation: string }>;
        behaviorContext?: string;
      };

      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUser?.content?.trim()) {
        res.status(400).json({ message: '需要至少一条用户消息' });
        return;
      }

      if (!observations.length) {
        res.status(400).json({ message: '需要报告观测数据作为上下文' });
        return;
      }

      const obsSummary = formatObsSummary(observations);
      const itemBlock = interpretedItems
        .slice(0, 8)
        .map((i) => `- ${i.standardName}: ${i.plainExplanation.slice(0, 200)}`)
        .join('\n');

      const system = `你是 Health Link 健康解读 Agent，帮助用户理解本次体检报告。

硬性约束：
- 不得诊断、不得开处方、不得建议停药
- 仅基于下方报告上下文回答；若无足够信息，诚实说明并建议就医复查
- 用简体中文、温暖、简洁（手机阅读，每段不超过 3 句）

报告摘要：${reportSummary || '（暂无）'}

已解读异常项：
${itemBlock || '（暂无）'}

报告观测（节选）：
${obsSummary}${formatBehaviorBlock(behaviorContext)}`;

      const chatMessages = [
        { role: 'system', content: system },
        ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      ];

      const replyRaw = await chatCompletion(chatMessages);
      const { reply, l6Filtered } = sanitizeChatReply(replyRaw);
      const config = resolveLlmConfig();

      res.json({
        reply,
        l6Filtered,
        disclaimer: '本回复仅供参考，不能替代医生面诊与诊断。',
        provider: config?.provider,
        model: config?.model,
      });
    } catch (error) {
      console.error('[agent/chat]', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Chat failed.' });
    }
  });

  return router;
}
