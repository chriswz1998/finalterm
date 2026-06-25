import type { Observation } from '@/src/types/observation';
import type { RedFlagHit } from '@/src/lib/redFlagRules';
import type {
  AgentChatResponse,
  AgentItemsResponse,
  AgentSummaryResponse,
} from '@/src/agent/types';
import { retrieveKnowledge, formatChunksForPrompt, inferCareLevel } from '@/src/lib/knowledgeRetrieve';
import {
  loadBehaviorContext,
  formatBehaviorContextForPrompt,
  correlationRuleIds,
  correlationCitationIds,
} from '@/src/lib/behaviorContext';

class AgentApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AgentApiError';
  }
}

async function postJson<T>(path: string, body: object, timeoutMs = 120_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/agent${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AgentApiError(
        typeof payload.message === 'string' ? payload.message : `请求失败 (${res.status})`,
        res.status,
      );
    }
    return payload as T;
  } catch (err) {
    if (err instanceof AgentApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AgentApiError('请求超时，请稍后重试');
    }
    const raw = err instanceof Error ? err.message : String(err);
    if (/failed to fetch|networkerror/i.test(raw)) {
      throw new AgentApiError('无法连接后端，请确认已运行 npm run dev');
    }
    throw new AgentApiError(raw || '网络错误');
  } finally {
    clearTimeout(timer);
  }
}

function obsDto(observations: Observation[]) {
  return observations.map((o) => ({
    id: o.id,
    canonicalId: o.canonicalId,
    standardName: o.standardName,
    originalName: o.originalName,
    value: o.value,
    unit: o.unit,
    referenceRange: o.referenceRange,
    abnormalFlag: o.abnormalFlag,
    reportDate: o.reportDate,
  }));
}

function flagDto(redFlags: RedFlagHit[]) {
  return redFlags.map((f) => ({
    ruleId: f.ruleId,
    severity: f.severity,
    title: f.title,
    message: f.message,
  }));
}

export async function fetchAgentHealth(): Promise<{ llmConfigured: boolean; llmLabel?: string | null }> {
  const res = await fetch('/api/agent/health');
  const payload = await res.json().catch(() => ({}));
  return payload as { llmConfigured: boolean; llmLabel?: string | null };
}

export async function agentInterpretSummary(
  observations: Observation[],
  redFlags: RedFlagHit[],
): Promise<AgentSummaryResponse> {
  const behaviorCtx = await loadBehaviorContext();
  const retrieved = retrieveKnowledge({
    observations,
    redFlags,
    correlationRuleIds: correlationRuleIds(behaviorCtx),
    correlationCitationIds: correlationCitationIds(behaviorCtx),
  });
  const knowledgeContext = [
    formatChunksForPrompt(retrieved.chunks),
    formatBehaviorContextForPrompt(behaviorCtx),
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');
  if (!knowledgeContext.trim()) {
    throw new AgentApiError(
      '知识库检索结果为空。请确认报告已识别到指标，或稍后重试。',
    );
  }
  return postJson<AgentSummaryResponse>('/interpret', {
    mode: 'summary',
    observations: obsDto(observations),
    redFlags: flagDto(redFlags),
    careLevel: inferCareLevel(redFlags),
    knowledgeContext,
    chunkIds: retrieved.chunkIds,
    behaviorContext: formatBehaviorContextForPrompt(behaviorCtx),
  });
}

export async function agentInterpretItems(
  observations: Observation[],
  redFlags: RedFlagHit[],
  targets: Array<{ observationId: string; medicalTerm: string; value: string }>,
): Promise<AgentItemsResponse> {
  const behaviorCtx = await loadBehaviorContext();
  const retrieved = retrieveKnowledge({
    observations,
    redFlags,
    correlationRuleIds: correlationRuleIds(behaviorCtx),
    correlationCitationIds: correlationCitationIds(behaviorCtx),
  });
  const knowledgeContext = [
    formatChunksForPrompt(retrieved.chunks),
    formatBehaviorContextForPrompt(behaviorCtx),
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');
  return postJson<AgentItemsResponse>(
    '/interpret',
    {
      mode: 'items',
      observations: obsDto(observations),
      redFlags: flagDto(redFlags),
      careLevel: inferCareLevel(redFlags),
      knowledgeContext,
      chunkIds: retrieved.chunkIds,
      targets,
      behaviorContext: formatBehaviorContextForPrompt(behaviorCtx),
    },
    180_000,
  );
}

export async function agentChat(opts: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  observations: Observation[];
  reportSummary?: string;
  interpretedItems?: Array<{ standardName: string; plainExplanation: string }>;
}): Promise<AgentChatResponse> {
  const behaviorCtx = await loadBehaviorContext();
  return postJson<AgentChatResponse>('/chat', {
    messages: opts.messages,
    observations: obsDto(opts.observations),
    reportSummary: opts.reportSummary,
    interpretedItems: opts.interpretedItems,
    behaviorContext: formatBehaviorContextForPrompt(behaviorCtx),
  });
}

export { AgentApiError };
