export interface TranslationResult {
  title: string;
  familyExplanation: string;
  actionableSteps: string[];
  severity: 'low' | 'medium' | 'high';
  nature: 'transient' | 'persistent';
  natureExplanation: string;
  abnormalReason: string;
}

export interface AdjustedProtocol {
  medicalNecessity: string;
  userConstraint: string;
  reconciledStrategy: string;
  quantifiableMetrics: {
    label: string;
    target: string;
    unit: string;
  }[];
}

export interface RagCitation {
  chunkId: string;
  title: string;
  excerpt?: string;
}

export interface RagInterpretResult extends TranslationResult {
  summary: string;
  citations: RagCitation[];
  careLevel: string;
  disclaimer: string;
  chunkIds: string[];
  ragEnabled: boolean;
  provider?: string;
  model?: string;
}

export interface RagInterpretRequest {
  observations: Array<{
    canonicalId?: string | null;
    standardName: string;
    value?: string | null;
    unit?: string;
    abnormalFlag?: string | null;
    reportDate?: string;
  }>;
  redFlags: Array<{ ruleId: string; severity: string; title: string; message: string }>;
  medicalTerm?: string;
  value?: string;
  knowledgeContext: string;
  chunkIds: string[];
  careLevel: string;
}

class GeminiApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export function isGeminiApiError(err: unknown): err is GeminiApiError {
  return err instanceof GeminiApiError || (err instanceof Error && err.name === 'GeminiApiError');
}

async function postJson<T>(path: string, body: object, timeoutMs = 120_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`/api/gemini${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GeminiApiError('解读请求超时（>2 分钟）。LLM 可能繁忙，请稍后重试。');
    }
    const raw = err instanceof Error ? err.message : String(err);
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
      throw new GeminiApiError(
        '无法连接后端 API。请在 health-link 目录运行 npm run dev，并用 http://localhost:3000 打开（需同时启动 3001 API）。',
      );
    }
    throw new GeminiApiError(raw || '网络请求失败');
  } finally {
    clearTimeout(timer);
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GeminiApiError(
      typeof payload.message === 'string' ? payload.message : `请求失败 (${res.status})`,
      res.status,
    );
  }
  return payload as T;
}

export const translateMedicalToFamily = async (
  medicalTerm: string,
  value: string,
): Promise<TranslationResult> => {
  return postJson<TranslationResult>('/translate', { medicalTerm, value });
};

export const reconcileLifestyleConflict = async (
  medicalAdvise: string,
  userHabit: string,
): Promise<AdjustedProtocol> => {
  return postJson<AdjustedProtocol>('/reconcile', { medicalAdvise, userHabit });
};

export const interpretWithRag = async (payload: RagInterpretRequest): Promise<RagInterpretResult> => {
  return postJson<RagInterpretResult>('/interpret-rag', payload);
};

export const interpretWithRagMulti = async (
  payload: RagInterpretRequest,
): Promise<MultiModelRagResult> => {
  return postJson<MultiModelRagResult>('/interpret-rag-multi', payload, 180_000);
};

export interface MultiModelRagResult {
  primary: RagInterpretResult;
  alternatives: Array<RagInterpretResult & { error?: string; label?: string }>;
  all: Array<RagInterpretResult & { error?: string; label?: string }>;
}

export interface LlmStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
  label: string | null;
  preferred: string;
  dashscopeConfigured: boolean;
  hunyuanConfigured: boolean;
  geminiConfigured: boolean;
  sensenovaConfigured?: boolean;
  configuredProviders?: Array<{ provider: string; model: string; label: string }>;
  /** fetch 失败时为 false（API 未启动或网络问题，不等于 Key 未配置） */
  apiReachable?: boolean;
}

export const fetchLlmStatus = async (): Promise<LlmStatus> => {
  let res: Response;
  try {
    res = await fetch('/api/gemini/status');
  } catch {
    return {
      configured: false,
      provider: null,
      model: null,
      label: null,
      preferred: 'auto',
      dashscopeConfigured: false,
      hunyuanConfigured: false,
      geminiConfigured: false,
      apiReachable: false,
    };
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GeminiApiError(
      typeof payload.message === 'string' ? payload.message : `状态请求失败 (${res.status})`,
      res.status,
    );
  }
  return { ...(payload as LlmStatus), apiReachable: true };
};

/** @deprecated use GeminiApiError — kept for existing imports */
export { GeminiApiError as LlmApiError, GeminiApiError };
