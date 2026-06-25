export * from '@/src/data/knowledge/types';
export { L0_SOURCES, L0_BY_ID, resolveSourceUrl, resolveSourceMeta } from '@/src/data/knowledge/l0Sources';
export { L1_REFERENCE_RANGES, L1_BY_CANONICAL } from '@/src/data/knowledge/l1ReferenceRanges';
export { KNOWLEDGE_REGISTRY, KNOWLEDGE_REGISTRY_VERSION } from '@/src/data/knowledge/registry';
export { L2_ANOMALY_CHUNKS } from '@/src/data/knowledge/l2Anomaly';
export { L3_RISK_CHUNKS } from '@/src/data/knowledge/l3Risk';
export { L4_LIFESTYLE_CHUNKS } from '@/src/data/knowledge/l4Lifestyle';
export { L5_CARE_CHUNKS } from '@/src/data/knowledge/l5CareLevel';
export { L6_DISCLAIMER, L6_SAFETY_CHUNKS } from '@/src/data/knowledge/l6Safety';

import { L2_ANOMALY_CHUNKS } from '@/src/data/knowledge/l2Anomaly';
import { L3_RISK_CHUNKS } from '@/src/data/knowledge/l3Risk';
import { L4_LIFESTYLE_CHUNKS } from '@/src/data/knowledge/l4Lifestyle';
import { L5_CARE_CHUNKS } from '@/src/data/knowledge/l5CareLevel';
import { L6_SAFETY_CHUNKS } from '@/src/data/knowledge/l6Safety';
import type { KnowledgeChunk } from '@/src/data/knowledge/types';

export const ALL_KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  ...L2_ANOMALY_CHUNKS,
  ...L3_RISK_CHUNKS,
  ...L4_LIFESTYLE_CHUNKS,
  ...L5_CARE_CHUNKS,
  ...L6_SAFETY_CHUNKS,
];

export const KNOWLEDGE_BY_ID = new Map(ALL_KNOWLEDGE_CHUNKS.map((c) => [c.id, c]));
