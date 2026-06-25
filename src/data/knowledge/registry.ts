import { L0_SOURCES } from '@/src/data/knowledge/l0Sources';
import { L2_ANOMALY_CHUNKS } from '@/src/data/knowledge/l2Anomaly';
import { L3_RISK_CHUNKS } from '@/src/data/knowledge/l3Risk';
import { L4_LIFESTYLE_CHUNKS } from '@/src/data/knowledge/l4Lifestyle';
import { L5_CARE_CHUNKS } from '@/src/data/knowledge/l5CareLevel';
import { L6_SAFETY_CHUNKS } from '@/src/data/knowledge/l6Safety';
import { L1_REFERENCE_RANGES } from '@/src/data/knowledge/l1ReferenceRanges';

export const KNOWLEDGE_REGISTRY_VERSION = '2025.06.1';

export interface KnowledgeRegistryMeta {
  version: string;
  publishedAt: string;
  updatedAt: string;
  layers: Record<string, number>;
  notes: string[];
}

export const KNOWLEDGE_REGISTRY: KnowledgeRegistryMeta = {
  version: KNOWLEDGE_REGISTRY_VERSION,
  publishedAt: '2025-06-09',
  updatedAt: '2025-06-09',
  layers: {
    L0: L0_SOURCES.length,
    L1: L1_REFERENCE_RANGES.length,
    L2: L2_ANOMALY_CHUNKS.length,
    L3: L3_RISK_CHUNKS.length,
    L4: L4_LIFESTYLE_CHUNKS.length,
    L5: L5_CARE_CHUNKS.length,
    L6: L6_SAFETY_CHUNKS.length,
  },
  notes: [
    'L1 参考范围：报告单优先，无报告范围时使用 WS/T 等行业标准兜底并标注来源',
    'L5 S4：危急值/急诊规则触发，前端强提示立即就医',
    'Citation 仅允许引用本次检索注入的 chunkId',
    'L6 后处理过滤诊断性、处方性表述',
  ],
};
