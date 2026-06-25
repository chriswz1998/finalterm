import { retrieveKnowledge, formatChunksForPrompt, inferCareLevel, buildRagDisclaimer } from '@/src/lib/knowledgeRetrieve';
import { interpretWithRag, interpretWithRagMulti, GeminiApiError, type RagInterpretResult, type MultiModelRagResult } from '@/src/services/geminiService';
import type { Observation } from '@/src/types/observation';
import type { RedFlagHit } from '@/src/lib/redFlagRules';

/** Keep RAG POST body small — server only uses first 20 obs anyway. */
function trimObservationsForRag(observations: Observation[], medicalTerm: string): Observation[] {
  const term = medicalTerm.toLowerCase();
  const abnormal = observations.filter((o) => o.abnormalFlag != null);
  const focused = observations.filter(
    (o) =>
      o.standardName.toLowerCase().includes(term) ||
      o.originalName.toLowerCase().includes(term) ||
      (o.canonicalId != null && term.includes(o.canonicalId.replace(/_/g, ''))),
  );
  const merged = new Map<string, Observation>();
  for (const o of [...abnormal, ...focused, ...observations]) {
    merged.set(o.id, o);
    if (merged.size >= 40) break;
  }
  return [...merged.values()];
}

export async function runRagInterpretation(opts: {
  observations: Observation[];
  redFlags: RedFlagHit[];
  medicalTerm: string;
  value: string;
}): Promise<RagInterpretResult> {
  const trimmed = trimObservationsForRag(opts.observations, opts.medicalTerm);
  const retrieved = retrieveKnowledge({
    observations: trimmed,
    redFlags: opts.redFlags,
  });
  const knowledgeContext = formatChunksForPrompt(retrieved.chunks);
  if (!knowledgeContext.trim()) {
    throw new GeminiApiError(
      '知识库检索结果为空。请确认档案已加载，或取消「档案 RAG 模式」改用普通解读。',
    );
  }

  return interpretWithRag({
    observations: trimmed.map((o) => ({
      canonicalId: o.canonicalId,
      standardName: o.standardName,
      value: o.value,
      unit: o.unit,
      abnormalFlag: o.abnormalFlag,
      reportDate: o.reportDate,
    })),
    redFlags: opts.redFlags.map((f) => ({
      ruleId: f.ruleId,
      severity: f.severity,
      title: f.title,
      message: f.message,
    })),
    medicalTerm: opts.medicalTerm,
    value: opts.value,
    knowledgeContext,
    chunkIds: retrieved.chunkIds,
    careLevel: inferCareLevel(opts.redFlags),
  });
}

export async function runMultiModelRagInterpretation(opts: {
  observations: Observation[];
  redFlags: RedFlagHit[];
  medicalTerm: string;
  value: string;
}): Promise<MultiModelRagResult> {
  const trimmed = trimObservationsForRag(opts.observations, opts.medicalTerm);
  const retrieved = retrieveKnowledge({
    observations: trimmed,
    redFlags: opts.redFlags,
  });
  const knowledgeContext = formatChunksForPrompt(retrieved.chunks);
  if (!knowledgeContext.trim()) {
    throw new GeminiApiError('知识库检索结果为空。');
  }

  return interpretWithRagMulti({
    observations: trimmed.map((o) => ({
      canonicalId: o.canonicalId,
      standardName: o.standardName,
      value: o.value,
      unit: o.unit,
      abnormalFlag: o.abnormalFlag,
      reportDate: o.reportDate,
    })),
    redFlags: opts.redFlags.map((f) => ({
      ruleId: f.ruleId,
      severity: f.severity,
      title: f.title,
      message: f.message,
    })),
    medicalTerm: opts.medicalTerm,
    value: opts.value,
    knowledgeContext,
    chunkIds: retrieved.chunkIds,
    careLevel: inferCareLevel(opts.redFlags),
  });
}
