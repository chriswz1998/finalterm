import { GoogleGenAI, Type } from '@google/genai';

export type LlmProviderId = 'gemini' | 'dashscope' | 'hunyuan' | 'sensenova';

export interface LlmConfig {
  provider: LlmProviderId;
  model: string;
  label: string;
}

const PLACEHOLDER_PATTERNS = [
  /MY_/i,
  /^sk-\.\.\.$/,
  /^your[-_]/i,
  /^xxx$/i,
  /^sk-your-/i,
  /你的/i,
  /placeholder/i,
  /replace[-_]?me/i,
];

function isConfiguredKey(key: string | undefined): boolean {
  const trimmed = key?.trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed));
}

function resolveHunyuanBaseUrl(): string {
  const configured = process.env.HUNYUAN_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  // TokenHub 广州默认域名为 https://tokenhub.tencentmaas.com（OpenAI 兼容路径 /v1）
  // 备用: https://tokenhub.tencentmaas.cn/v1 — 见官方文档 product/1823/130078
  return 'https://tokenhub.tencentmaas.com/v1';
}

function resolveHunyuanModel(): string {
  const configured = process.env.HUNYUAN_MODEL?.trim();
  const base = resolveHunyuanBaseUrl().toLowerCase();
  if (base.includes('tokenhub')) {
    if (!configured || configured === 'hunyuan-turbos-latest') {
      return process.env.HUNYUAN_TOKENHUB_MODEL?.trim() || 'hy3-preview';
    }
  }
  return configured || 'hunyuan-turbos-latest';
}

function resolveSensenovaBaseUrl(): string {
  return (process.env.SENSENOVA_API_BASE ?? 'https://token.sensenova.cn/v1').replace(/\/$/, '');
}

function resolveLlmConfigForProvider(provider: LlmProviderId): LlmConfig | null {
  if (provider === 'dashscope' && isConfiguredKey(process.env.DASHSCOPE_API_KEY)) {
    return {
      provider,
      model: process.env.DASHSCOPE_CHAT_MODEL?.trim() || 'qwen-plus',
      label: '阿里云百炼 / 通义千问',
    };
  }
  if (provider === 'hunyuan' && isConfiguredKey(process.env.HUNYUAN_API_KEY)) {
    return {
      provider,
      model: resolveHunyuanModel(),
      label: '腾讯混元 / TokenHub',
    };
  }
  if (provider === 'sensenova' && isConfiguredKey(process.env.SENSENOVA_API_KEY)) {
    return {
      provider,
      model: process.env.SENSENOVA_MODEL?.trim() || 'sensenova-6.7-flash-lite',
      label: '小浣熊 / SenseNova',
    };
  }
  if (provider === 'gemini' && isConfiguredKey(process.env.GEMINI_API_KEY)) {
    return {
      provider,
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash',
      label: 'Google Gemini',
    };
  }
  return null;
}

export function listConfiguredLlmProviders(): LlmConfig[] {
  // ② 标准化 / ③ RAG / ④ 摘要 / 健康问答 — 不用 SenseNova LLM，仅百炼/混元/Gemini
  const order: LlmProviderId[] = ['dashscope', 'hunyuan', 'gemini'];
  return order
    .map((p) => resolveLlmConfigForProvider(p))
    .filter((c): c is LlmConfig => c != null);
}

export function resolveLlmConfig(): LlmConfig | null {
  const preferred = process.env.LLM_PROVIDER?.trim().toLowerCase();
  const order: LlmProviderId[] =
    preferred === 'sensenova'
      ? ['sensenova']
      : preferred === 'dashscope'
        ? ['dashscope']
        : preferred === 'hunyuan'
          ? ['hunyuan']
          : preferred === 'gemini'
            ? ['gemini']
            : ['dashscope', 'hunyuan', 'gemini'];

  for (const provider of order) {
    const cfg = resolveLlmConfigForProvider(provider);
    if (cfg) return cfg;
  }
  return null;
}

export function getLlmStatus() {
  const active = resolveLlmConfig();
  return {
    configured: active != null,
    provider: active?.provider ?? null,
    model: active?.model ?? null,
    label: active?.label ?? null,
    preferred: process.env.LLM_PROVIDER?.trim() || 'auto',
    dashscopeConfigured: isConfiguredKey(process.env.DASHSCOPE_API_KEY),
    hunyuanConfigured: isConfiguredKey(process.env.HUNYUAN_API_KEY),
    geminiConfigured: isConfiguredKey(process.env.GEMINI_API_KEY),
    sensenovaConfigured: isConfiguredKey(process.env.SENSENOVA_API_KEY),
    configuredProviders: listConfiguredLlmProviders().map((c) => ({
      provider: c.provider,
      model: c.model,
      label: c.label,
    })),
  };
}

function authHintFor401(providerLabel: string): string {
  if (providerLabel.includes('百炼') || providerLabel.includes('通义')) {
    return '请检查 DASHSCOPE_API_KEY 是否为百炼控制台的有效密钥（https://dashscope.console.aliyun.com/），并确认已开通 qwen-plus 等模型。';
  }
  if (providerLabel.includes('混元')) {
    return '请检查 TokenHub HUNYUAN_API_KEY 是否有效、是否已在控制台「在线推理」启用对应模型（如 hy3-preview）。';
  }
  if (providerLabel.includes('小浣熊') || providerLabel.includes('SenseNova')) {
    return '请检查 SENSENOVA_API_KEY 是否有效（https://console.sensenova.cn/），并确认模型 SenseChat-5 已开通。';
  }
  return '请检查 API Key 是否有效、是否已在对应控制台启用模型。';
}

async function openAiCompatibleJson(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  providerLabel: string;
  useMaxCompletionTokens?: boolean;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: 'user', content: opts.prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      ...(opts.useMaxCompletionTokens
        ? { max_completion_tokens: 4096 }
        : { max_tokens: 4096 }),
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const detail = payload.error?.message ?? `${opts.providerLabel} 请求失败 (${res.status})`;
    if (res.status === 401) {
      throw new Error(`${detail} — ${authHintFor401(opts.providerLabel)}`);
    }
    throw new Error(detail);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${opts.providerLabel} 返回空内容`);
  return parseLlmJsonContent(content);
}

/** Tolerate markdown fences or trailing prose around JSON objects. */
export function parseLlmJsonContent(raw: string): Record<string, unknown> {
  let body = raw.trim();
  const fenced = body.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) body = fenced[1].trim();

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error('LLM 返回的不是合法 JSON，请重试');
  }
}

async function geminiJson(model: string, prompt: string, schema: object): Promise<Record<string, unknown>> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });
  const text = response.text;
  if (!text) throw new Error('Gemini 返回空内容');
  return parseLlmJsonContent(text);
}

export async function generateStructuredJsonForProvider(
  provider: LlmProviderId,
  prompt: string,
  schema: object,
): Promise<{ data: Record<string, unknown>; config: LlmConfig }> {
  const config = resolveLlmConfigForProvider(provider);
  if (!config) {
    throw new Error(`LLM 提供商 ${provider} 未配置有效 API Key。`);
  }
  const data = await runProviderJson(config, prompt, schema);
  return { data, config };
}

async function runProviderJson(
  config: LlmConfig,
  prompt: string,
  schema: object,
): Promise<Record<string, unknown>> {
  if (config.provider === 'dashscope') {
    return openAiCompatibleJson({
      baseUrl: process.env.DASHSCOPE_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: process.env.DASHSCOPE_API_KEY!,
      model: config.model,
      prompt: `${prompt}\n\n严格返回合法 JSON 对象，不要 markdown 代码块。`,
      providerLabel: config.label,
    });
  }
  if (config.provider === 'hunyuan') {
    return openAiCompatibleJson({
      baseUrl: resolveHunyuanBaseUrl(),
      apiKey: process.env.HUNYUAN_API_KEY!,
      model: config.model,
      prompt: `${prompt}\n\n严格返回合法 JSON 对象，不要 markdown 代码块。`,
      providerLabel: config.label,
    });
  }
  if (config.provider === 'sensenova') {
    return openAiCompatibleJson({
      baseUrl: resolveSensenovaBaseUrl(),
      apiKey: process.env.SENSENOVA_API_KEY!,
      model: config.model,
      prompt: `${prompt}\n\n严格返回合法 JSON 对象，不要 markdown 代码块。`,
      providerLabel: config.label,
      useMaxCompletionTokens: true,
    });
  }
  try {
    return await geminiJson(config.model, prompt, schema);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('fetch failed') || msg.includes('Connect Timeout')) {
      throw new Error(
        'Gemini 网络连接失败（国内常见）。请改用 LLM_PROVIDER=sensenova、dashscope 或 hunyuan。',
      );
    }
    throw err;
  }
}

export async function generateStructuredJsonAll(
  prompt: string,
  schema: object,
): Promise<Array<{ data: Record<string, unknown>; config: LlmConfig; error?: string }>> {
  const providers = listConfiguredLlmProviders();
  if (!providers.length) {
    throw new Error(
      '未配置可用 LLM。请在 .env.local 设置 SENSENOVA_API_KEY、DASHSCOPE_API_KEY、HUNYUAN_API_KEY 或 GEMINI_API_KEY。',
    );
  }
  const results = await Promise.all(
    providers.map(async (config) => {
      try {
        const data = await runProviderJson(config, prompt, schema);
        return { data, config };
      } catch (err) {
        return {
          data: {},
          config,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );
  return results;
}

export async function generateStructuredJson(
  prompt: string,
  schema: object,
): Promise<{ data: Record<string, unknown>; config: LlmConfig }> {
  const providers = listConfiguredLlmProviders();
  if (!providers.length) {
    throw new Error(
      '未配置可用 LLM。请在 .env.local 设置 SENSENOVA_API_KEY（小浣熊）、DASHSCOPE_API_KEY（百炼）、HUNYUAN_API_KEY（混元）或 GEMINI_API_KEY。',
    );
  }

  let lastError: Error | undefined;
  for (const config of providers) {
    try {
      const data = await runProviderJson(config, prompt, schema);
      return { data, config };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      const authOrQuota =
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('Forbidden') ||
        msg.includes('无效') ||
        msg.includes('Incorrect API key');
      if (authOrQuota && providers.indexOf(config) < providers.length - 1) {
        console.warn(`[llm] ${config.label} 不可用，尝试下一提供商: ${msg.slice(0, 120)}`);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error('所有已配置的 LLM 均调用失败');
}

/** Shared Gemini-style JSON schemas for translate / reconcile / rag */
export const TRANSLATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    familyExplanation: { type: Type.STRING },
    actionableSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    nature: { type: Type.STRING, enum: ['transient', 'persistent'] },
    natureExplanation: { type: Type.STRING },
    abnormalReason: { type: Type.STRING },
  },
  required: ['title', 'familyExplanation', 'actionableSteps', 'severity', 'nature', 'natureExplanation', 'abnormalReason'],
};

export const RECONCILE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    medicalNecessity: { type: Type.STRING },
    userConstraint: { type: Type.STRING },
    reconciledStrategy: { type: Type.STRING },
    quantifiableMetrics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          target: { type: Type.STRING },
          unit: { type: Type.STRING },
        },
        required: ['label', 'target', 'unit'],
      },
    },
  },
  required: ['medicalNecessity', 'userConstraint', 'reconciledStrategy', 'quantifiableMetrics'],
};

export const RAG_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    familyExplanation: { type: Type.STRING },
    actionableSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    nature: { type: Type.STRING, enum: ['transient', 'persistent'] },
    natureExplanation: { type: Type.STRING },
    abnormalReason: { type: Type.STRING },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          chunkId: { type: Type.STRING },
          title: { type: Type.STRING },
          excerpt: { type: Type.STRING },
        },
        required: ['chunkId', 'title'],
      },
    },
    careLevel: { type: Type.STRING },
    disclaimer: { type: Type.STRING },
  },
  required: [
    'title',
    'summary',
    'familyExplanation',
    'actionableSteps',
    'severity',
    'nature',
    'natureExplanation',
    'abnormalReason',
    'citations',
    'careLevel',
    'disclaimer',
  ],
};
