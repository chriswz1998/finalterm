import { ALL_KNOWLEDGE_CHUNKS } from '@/src/data/knowledge/index';
import { L6_DISCLAIMER } from '@/src/data/knowledge/l6Safety';
import { resolveSourceUrl } from '@/src/data/knowledge/l0Sources';
import type { KnowledgeChunk, RetrievedContext } from '@/src/data/knowledge/types';
import type { Observation } from '@/src/types/observation';
import type { RedFlagHit } from '@/src/lib/redFlagRules';

export interface RetrieveInput {
  observations: Observation[];
  redFlags?: RedFlagHit[];
  maxChunks?: number;
  correlationRuleIds?: string[];
  correlationCitationIds?: string[];
}

const EMERGENCY_RULE_PREFIX = 'emergency_';

const SEVERITY_TO_CARE: Record<string, KnowledgeChunk['careLevel']> = {
  critical: 'S3',
  high: 'S2',
  moderate: 'S2',
  info: 'S1',
};

function isEmergencyRule(ruleId: string): boolean {
  return ruleId.startsWith(EMERGENCY_RULE_PREFIX);
}

function matchL2(obs: Observation, chunk: KnowledgeChunk): boolean {
  if (chunk.layer !== 'L2' || !obs.canonicalId || !obs.abnormalFlag) return false;
  if (!chunk.canonicalIds?.includes(obs.canonicalId)) return false;
  if (!chunk.direction) return true;
  if (obs.abnormalFlag === chunk.direction || obs.abnormalFlag === 'critical') return true;
  return false;
}

function matchL4(canonicalIds: Set<string>, chunk: KnowledgeChunk): boolean {
  if (chunk.layer !== 'L4') return false;
  return chunk.canonicalIds?.some((id) => canonicalIds.has(id)) ?? false;
}

function matchL3(redFlagIds: Set<string>, chunk: KnowledgeChunk): boolean {
  if (chunk.layer !== 'L3') return false;
  return chunk.ruleIds?.some((id) => redFlagIds.has(id)) ?? false;
}

function matchL5(redFlagIds: Set<string>, chunk: KnowledgeChunk): boolean {
  if (chunk.layer !== 'L5') return false;
  return chunk.ruleIds?.some((id) => redFlagIds.has(id)) ?? false;
}

function appendL6Mandatory(chunks: KnowledgeChunk[]): KnowledgeChunk[] {
  const ids = new Set(chunks.map((c) => c.id));
  const mandatory = ['l6:disclaimer:v1', 'l6:refusal:diagnosis:v1'];
  const out = [...chunks];
  for (const id of mandatory) {
    if (!ids.has(id)) {
      const chunk = ALL_KNOWLEDGE_CHUNKS.find((c) => c.id === id);
      if (chunk) out.push(chunk);
    }
  }
  return out;
}

export function retrieveKnowledge(input: RetrieveInput): RetrievedContext {
  const maxChunks = input.maxChunks ?? 8;
  const redFlagIds = new Set(input.redFlags?.map((f) => f.ruleId) ?? []);
  const abnormalObs = input.observations.filter((o) => o.abnormalFlag != null);
  const canonicalIds = new Set(
    input.observations.map((o) => o.canonicalId).filter((id): id is string => id != null),
  );

  const picked = new Map<string, KnowledgeChunk>();

  for (const obs of abnormalObs) {
    for (const chunk of ALL_KNOWLEDGE_CHUNKS) {
      if (matchL2(obs, chunk)) picked.set(chunk.id, chunk);
    }
  }

  for (const chunk of ALL_KNOWLEDGE_CHUNKS) {
    if (matchL3(redFlagIds, chunk)) picked.set(chunk.id, chunk);
    if (matchL5(redFlagIds, chunk)) picked.set(chunk.id, chunk);
  }

  for (const chunk of ALL_KNOWLEDGE_CHUNKS) {
    if (matchL4(canonicalIds, chunk)) picked.set(chunk.id, chunk);
  }

  const corrRuleIds = new Set(input.correlationRuleIds ?? []);
  const corrCitationIds = new Set(input.correlationCitationIds ?? []);
  if (corrRuleIds.size || corrCitationIds.size) {
    for (const chunk of ALL_KNOWLEDGE_CHUNKS) {
      if (chunk.layer !== 'L4') continue;
      if (chunk.ruleIds?.some((id) => corrRuleIds.has(id))) picked.set(chunk.id, chunk);
      if (corrCitationIds.has(chunk.id)) picked.set(chunk.id, chunk);
    }
  }

  const l6Ids = new Set(['l6:disclaimer:v1', 'l6:refusal:diagnosis:v1']);
  const withoutL6 = [...picked.values()].filter((c) => !l6Ids.has(c.id));
  const bodyLimit = Math.max(maxChunks - 2, 1);
  const body = withoutL6.slice(0, bodyLimit);
  const chunks = appendL6Mandatory(body);
  return { chunks, chunkIds: chunks.map((c) => c.id) };
}

export function formatChunksForPrompt(chunks: KnowledgeChunk[]): string {
  return chunks
    .map((c) => {
      const url = resolveSourceUrl(c.source);
      return `[${c.id}] (${c.layer}) ${c.title}\n${c.body}${
        c.suggestedAction ? `\n建议动作：${c.suggestedAction}` : ''
      }${c.forbidden?.length ? `\n禁止：${c.forbidden.join('；')}` : ''}\n来源：${c.source.name} (${c.source.evidenceLevel})${
        url ? `\n链接：${url}` : ''
      }`;
    })
    .join('\n\n---\n\n');
}

export function inferCareLevel(redFlags: RedFlagHit[] | undefined): string {
  if (!redFlags?.length) return 'S0';
  if (redFlags.some((f) => isEmergencyRule(f.ruleId))) return 'S4';

  const order = ['S4', 'S3', 'S2', 'S1', 'S0'] as const;
  const fromRules = redFlags
    .map((f) => SEVERITY_TO_CARE[f.severity])
    .filter(Boolean) as Array<'S1' | 'S2' | 'S3'>;
  for (const level of order) {
    if (fromRules.includes(level as 'S1' | 'S2' | 'S3')) return level;
  }
  return 'S1';
}

export function buildRagDisclaimer(): string {
  return L6_DISCLAIMER;
}

export function isEmergencyCareLevel(careLevel?: string | null): boolean {
  return careLevel === 'S4';
}

export function hasEmergencyRedFlags(redFlags: RedFlagHit[] | undefined): boolean {
  return redFlags?.some((f) => isEmergencyRule(f.ruleId)) ?? false;
}
