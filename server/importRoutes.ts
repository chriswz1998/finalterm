import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  generateStructuredJson,
  getLlmStatus,
} from './llmProvider.js';
import { buildBatchAnalysisPrompt, buildRagInterpretPrompt } from './prompts/examImportPrompts.js';
import {
  analyzeHealthReportsWithRaccoon,
  getRaccoonStatus,
  isRaccoonConfigured,
  mapRaccoonToBatchAnalysis,
} from './raccoonService.js';
import type { RaccoonReportPayload } from './exportReportsCsv.js';

const BATCH_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    overallSummary: { type: 'string' },
    improving: { type: 'array', items: { type: 'string' } },
    worsening: { type: 'array', items: { type: 'string' } },
    stable: { type: 'array', items: { type: 'string' } },
    crossReportInsights: { type: 'array', items: { type: 'string' } },
    suggestedQuestions: { type: 'array', items: { type: 'string' } },
    chartHints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          metric: { type: 'string' },
          unit: { type: 'string' },
          points: {
            type: 'array',
            items: {
              type: 'object',
              properties: { date: { type: 'string' }, value: { type: 'number' } },
            },
          },
        },
      },
    },
    disclaimer: { type: 'string' },
  },
  required: ['headline', 'overallSummary', 'disclaimer'],
};

function requireAnalysisBackend(_req: Request, res: Response, next: NextFunction) {
  if (!isRaccoonConfigured() && !getLlmStatus().configured) {
    res.status(503).json({
      message:
        '未配置跨报告分析后端。请设置 RACCOON_API_TOKEN（办公小浣熊）或 DASHSCOPE_API_KEY / HUNYUAN_API_KEY（LLM 降级）。',
    });
    return;
  }
  next();
}

async function llmBatchFallback(
  reports: Array<{
    fileName: string;
    reportDate: string;
    observationCount: number;
    abnormalCount: number;
    topAbnormal?: string[];
  }>,
) {
  const reportsSummary = reports
    .map(
      (r) =>
        `- ${r.fileName} (${r.reportDate})：${r.observationCount} 项，${r.abnormalCount} 项异常${
          r.topAbnormal?.length ? ` · ${r.topAbnormal.join('、')}` : ''
        }`,
    )
    .join('\n');

  const abnormalSummary = reports
    .flatMap((r) => r.topAbnormal ?? [])
    .filter(Boolean)
    .join('、');

  const prompt = buildBatchAnalysisPrompt(reportsSummary, abnormalSummary || '（无显著异常）');
  const { data, config } = await generateStructuredJson(prompt, BATCH_SCHEMA);
  return {
    ...data,
    source: 'llm' as const,
    provider: config.provider,
    model: config.model,
    label: config.label,
  };
}

export function createImportRouter() {
  const router = Router();

  router.get('/raccoon-status', (_req, res) => {
    res.json(getRaccoonStatus());
  });

  /** 阶段 2+ · 多份报告跨期分析：优先办公小浣熊 OpenClaw，降级 LLM */
  router.post('/batch-analyze', requireAnalysisBackend, async (req, res) => {
    try {
      const { reports = [], memberName = '' } = req.body as {
        reports?: RaccoonReportPayload[];
        memberName?: string;
      };

      if (!reports.length) {
        res.status(400).json({ message: 'reports 不能为空' });
        return;
      }

      const okReports = reports.filter((r) => r.ok !== false);
      const hasIndicators = okReports.some((r) => (r.indicators?.length ?? 0) > 0);

      const raccoonEnabled = process.env.ENABLE_RACCOON_ANALYSIS !== 'false' && isRaccoonConfigured();

      if (raccoonEnabled && hasIndicators) {
        const raccoon = await analyzeHealthReportsWithRaccoon({ reports, memberName });
        if (raccoon.ok) {
          res.json(mapRaccoonToBatchAnalysis(raccoon));
          return;
        }
        console.warn('[import/batch-analyze] raccoon failed, fallback LLM:', raccoon.error);
      }

      if (!getLlmStatus().configured) {
        res.status(503).json({
          message:
            raccoonEnabled && !hasIndicators
              ? '报告缺少结构化指标，无法调用办公小浣熊。请确认导入成功后再试。'
              : '办公小浣熊分析失败且未配置 LLM 降级。请检查 RACCOON_API_TOKEN 或 DASHSCOPE_API_KEY。',
        });
        return;
      }

      const summaryReports = okReports.map((r) => ({
        fileName: r.fileName ?? r.source_file ?? 'report',
        reportDate: r.reportDate ?? r.report_date ?? '',
        observationCount: r.indicators?.length ?? 0,
        abnormalCount: r.indicators?.filter((i) => i.is_abnormal).length ?? 0,
        topAbnormal: (r.indicators ?? [])
          .filter((i) => i.is_abnormal)
          .slice(0, 5)
          .map((i) => i.standard_name),
      }));

      const payload = await llmBatchFallback(summaryReports);
      res.json(payload);
    } catch (error) {
      console.error('[import/batch-analyze]', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Batch analyze failed.' });
    }
  });

  return router;
}

export function buildRagPromptBody(body: {
  observations?: Array<{
    standardName: string;
    value?: string | null;
    unit?: string;
    abnormalFlag?: string | null;
    reportDate?: string;
  }>;
  redFlags?: Array<{ ruleId: string; severity: string; title: string; message: string }>;
  medicalTerm?: string;
  value?: string;
  knowledgeContext?: string;
  careLevel?: string;
}): string {
  const obsSummary = (body.observations ?? [])
    .slice(0, 20)
    .map(
      (o) =>
        `- ${o.standardName}${o.value != null ? `: ${o.value}${o.unit ? ` ${o.unit}` : ''}` : ''}${
          o.abnormalFlag ? ` [${o.abnormalFlag}]` : ''
        }${o.reportDate ? ` (${o.reportDate})` : ''}`,
    )
    .join('\n');

  const flagSummary = (body.redFlags ?? [])
    .slice(0, 10)
    .map((f) => `- [${f.severity}] ${f.title}: ${f.message}`)
    .join('\n');

  const focusBlock =
    body.medicalTerm && body.value ? `\n用户当前关注指标：${body.medicalTerm} = ${body.value}\n` : '';

  return buildRagInterpretPrompt({
    careLevel: body.careLevel ?? 'S1',
    focusBlock,
    obsSummary,
    flagSummary,
    knowledgeContext: body.knowledgeContext ?? '',
  });
}

export function normalizeRagPayload(data: Record<string, unknown>, careLevel?: string): Record<string, unknown> {
  const steps = data.actionableSteps;
  if (typeof steps === 'string') {
    data.actionableSteps = [steps];
  } else if (!Array.isArray(steps)) {
    data.actionableSteps = [];
  }
  if (!Array.isArray(data.citations)) data.citations = [];
  if (typeof data.careLevel !== 'string' || !data.careLevel) {
    data.careLevel = careLevel ?? 'S1';
  }
  if (typeof data.summary !== 'string') {
    data.summary = typeof data.title === 'string' ? data.title : '';
  }
  if (typeof data.disclaimer !== 'string') {
    data.disclaimer =
      '本解读仅供健康管理参考，不能替代医生面诊、诊断或治疗。如有不适请及时就医。';
  }
  return data;
}

export { RAG_SCHEMA } from './llmProvider.js';
export { sanitizeSummaryPayload, filterCitations } from './knowledgeUtils.js';
