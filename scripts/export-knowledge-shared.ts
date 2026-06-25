/**
 * Export health-link knowledge for Python health_agent RAG + health-linker indicators.
 * Run: npm run export:kb
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { L1_REFERENCE_RANGES } from '../src/data/knowledge/l1ReferenceRanges.ts';
import { L2_ANOMALY_CHUNKS } from '../src/data/knowledge/l2Anomaly.ts';
import { L3_RISK_CHUNKS } from '../src/data/knowledge/l3Risk.ts';
import { L4_LIFESTYLE_CHUNKS } from '../src/data/knowledge/l4Lifestyle.ts';
import { L5_CARE_CHUNKS } from '../src/data/knowledge/l5CareLevel.ts';
import { L6_SAFETY_CHUNKS } from '../src/data/knowledge/l6Safety.ts';
import { KNOWLEDGE_REGISTRY_VERSION } from '../src/data/knowledge/registry.ts';
import type { KnowledgeChunk } from '../src/data/knowledge/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDICATORS_PATH = resolve(__dirname, '../../health-linker/knowledge/indicators.json');
const CHUNKS_LINKER_PATH = resolve(__dirname, '../../health-linker/knowledge/knowledge_chunks.json');
const CHUNKS_AGENT_PATH = resolve(__dirname, '../../health_agent/data/knowledge_chunks.json');
const INDICATORS_AGENT_PATH = resolve(__dirname, '../../health_agent/data/indicators.json');

export interface IndicatorKbEntry {
  canonical_id: string;
  adjustable: boolean;
  reference_high?: number;
  reference_low?: number;
  reference_range: string;
  explanation: string;
  unit?: string;
}

export interface RagKnowledgeDocument {
  id: string;
  layer: string;
  title: string;
  content: string;
  canonical_ids: string[];
  direction?: 'high' | 'low' | 'positive' | 'critical';
  rule_ids?: string[];
  care_level?: string;
  keywords: string[];
}

export interface KnowledgeChunksFile {
  _meta: {
    schema_version: '1.0';
    source: 'health-link';
    knowledge_version: string;
    exported_at: string;
    chunk_count: number;
    layers: Record<string, number>;
    notes: string[];
  };
  chunks: RagKnowledgeDocument[];
}

const SUPPLEMENTAL: Record<string, Omit<IndicatorKbEntry, 'canonical_id'> & { canonical_id?: string }> = {
  胆囊息肉样变: {
    adjustable: false,
    reference_range: '—',
    explanation:
      '胆囊内壁小突起，多数为良性。按医嘱定期超声复查即可，不属于日常习惯能直接干预的项目。',
  },
};

const NON_ADJUSTABLE_CANONICAL = new Set([
  'urine_protein',
  'urine_blood',
  'hemoglobin',
  'wbc',
  'tsh',
  'creatinine',
  'egfr',
]);

function parseRangeLabel(label: string): { high?: number; low?: number } {
  const t = label.trim();
  if (!t || t === '阴性') return {};

  const lt = t.match(/^<\s*([\d.]+)/);
  if (lt) return { high: parseFloat(lt[1]) };

  const lte = t.match(/^≤\s*([\d.]+)/);
  if (lte) return { high: parseFloat(lte[1]) };

  const gte = t.match(/^≥\s*([\d.]+)/);
  if (gte) return { low: parseFloat(gte[1]) };

  const range = t.match(/^([\d.]+)\s*[～~\-–]\s*([\d.]+)/);
  if (range) return { low: parseFloat(range[1]), high: parseFloat(range[2]) };

  return {};
}

function pickL2Chunk(canonicalId: string, range: { high?: number; low?: number }): KnowledgeChunk | undefined {
  const chunks = L2_ANOMALY_CHUNKS.filter((c) => c.canonicalIds?.includes(canonicalId));
  if (!chunks.length) return undefined;

  const prefer =
    range.high != null && range.low == null
      ? 'high'
      : range.low != null && range.high == null
        ? 'low'
        : 'high';

  return (
    chunks.find((c) => c.direction === prefer) ??
    chunks.find((c) => c.direction === 'high') ??
    chunks[0]
  );
}

function isAdjustable(canonicalId: string): boolean {
  return !NON_ADJUSTABLE_CANONICAL.has(canonicalId);
}

function buildIndicators(): Record<string, IndicatorKbEntry> {
  const out: Record<string, IndicatorKbEntry> = {};

  for (const l1 of L1_REFERENCE_RANGES) {
    const range = parseRangeLabel(l1.rangeLabel);
    const l2 = pickL2Chunk(l1.canonicalId, range);
    const explanation =
      l2?.body ??
      `${l1.standardName} 请参考报告单参考范围（${l1.rangeLabel}${l1.unit ? ` ${l1.unit}` : ''}），结合趋势与医生意见理解。`;

    out[l1.standardName] = {
      canonical_id: l1.canonicalId,
      adjustable: isAdjustable(l1.canonicalId),
      ...(range.high != null ? { reference_high: range.high } : {}),
      ...(range.low != null ? { reference_low: range.low } : {}),
      reference_range: l1.rangeLabel,
      explanation,
      ...(l1.unit ? { unit: l1.unit } : {}),
    };
  }

  for (const [name, entry] of Object.entries(SUPPLEMENTAL)) {
    out[name] = {
      canonical_id: entry.canonical_id ?? name,
      adjustable: entry.adjustable,
      reference_range: entry.reference_range,
      explanation: entry.explanation,
      ...(entry.reference_high != null ? { reference_high: entry.reference_high } : {}),
      ...(entry.reference_low != null ? { reference_low: entry.reference_low } : {}),
      ...(entry.unit ? { unit: entry.unit } : {}),
    };
  }

  return out;
}

function assembleChunkContent(chunk: KnowledgeChunk): string {
  const parts = [chunk.body];
  if (chunk.commonFactors?.length) {
    parts.push(`常见因素：${chunk.commonFactors.join('、')}`);
  }
  if (chunk.relatedIndicators?.length) {
    parts.push(`相关指标：${chunk.relatedIndicators.join('、')}`);
  }
  if (chunk.suggestedAction) {
    parts.push(`建议：${chunk.suggestedAction}`);
  }
  if (chunk.forbidden?.length) {
    parts.push(`禁止表述：${chunk.forbidden.join('、')}`);
  }
  if (chunk.source?.name) {
    parts.push(`来源：${chunk.source.name}`);
  }
  return parts.join('\n');
}

function l1ToRagDocuments(): RagKnowledgeDocument[] {
  return L1_REFERENCE_RANGES.map((l1) => {
    const unitSuffix = l1.unit ? ` ${l1.unit}` : '';
    const note = l1.note ? ` ${l1.note}` : ' 以报告单参考范围为准。';
    return {
      id: `l1:${l1.canonicalId}:v1`,
      layer: 'L1',
      title: `${l1.standardName} 参考范围`,
      content: `${l1.standardName}（${l1.canonicalId}）行业参考范围：${l1.rangeLabel}${unitSuffix}。${note}`,
      canonical_ids: [l1.canonicalId],
      keywords: [l1.standardName, l1.canonicalId, l1.rangeLabel],
    };
  });
}

function chunksToRagDocuments(chunks: KnowledgeChunk[]): RagKnowledgeDocument[] {
  return chunks.map((chunk) => ({
    id: chunk.id,
    layer: chunk.layer,
    title: chunk.title,
    content: assembleChunkContent(chunk),
    canonical_ids: chunk.canonicalIds ?? [],
    ...(chunk.direction ? { direction: chunk.direction } : {}),
    ...(chunk.ruleIds?.length ? { rule_ids: chunk.ruleIds } : {}),
    ...(chunk.careLevel ? { care_level: chunk.careLevel } : {}),
    keywords: [
      chunk.title,
      ...(chunk.canonicalIds ?? []),
      ...(chunk.relatedIndicators ?? []),
      ...(chunk.ruleIds ?? []),
      ...(chunk.careLevel ? [chunk.careLevel] : []),
    ],
  }));
}

function buildKnowledgeChunks(): KnowledgeChunksFile {
  const l1 = l1ToRagDocuments();
  const l2 = chunksToRagDocuments(L2_ANOMALY_CHUNKS);
  const l3 = chunksToRagDocuments(L3_RISK_CHUNKS);
  const l4 = chunksToRagDocuments(L4_LIFESTYLE_CHUNKS);
  const l5 = chunksToRagDocuments(L5_CARE_CHUNKS);
  const l6 = chunksToRagDocuments(L6_SAFETY_CHUNKS);
  const chunks = [...l1, ...l2, ...l3, ...l4, ...l5, ...l6];

  return {
    _meta: {
      schema_version: '1.0',
      source: 'health-link',
      knowledge_version: KNOWLEDGE_REGISTRY_VERSION,
      exported_at: new Date().toISOString(),
      chunk_count: chunks.length,
      layers: {
        L1: l1.length,
        L2: l2.length,
        L3: l3.length,
        L4: l4.length,
        L5: l5.length,
        L6: l6.length,
      },
      notes: [
        '由 health-link/scripts/export-knowledge-shared.ts 自动生成，请勿手工编辑',
        '编辑源：health-link/src/data/knowledge/ 后运行 npm run export:kb',
        'health_agent RAG 读取此文件；indicators.json 供结构化指标查询',
      ],
    },
    chunks,
  };
}

function main() {
  const indicators = buildIndicators();
  const indicatorPayload = {
    _meta: {
      schema_version: '1.0' as const,
      source: 'health-link',
      knowledge_version: KNOWLEDGE_REGISTRY_VERSION,
      exported_at: new Date().toISOString(),
      indicator_count: Object.keys(indicators).length,
      notes: [
        '由 health-link/scripts/export-knowledge-shared.ts 自动生成，请勿手工编辑',
        '编辑源：health-link/src/data/knowledge/ 后运行 npm run export:kb',
      ],
    },
    ...indicators,
  };

  const chunksPayload = buildKnowledgeChunks();

  writeFileSync(INDICATORS_PATH, `${JSON.stringify(indicatorPayload, null, 2)}\n`, 'utf-8');
  writeFileSync(CHUNKS_LINKER_PATH, `${JSON.stringify(chunksPayload, null, 2)}\n`, 'utf-8');
  writeFileSync(CHUNKS_AGENT_PATH, `${JSON.stringify(chunksPayload, null, 2)}\n`, 'utf-8');
  writeFileSync(INDICATORS_AGENT_PATH, `${JSON.stringify(indicatorPayload, null, 2)}\n`, 'utf-8');

  console.log(`Exported ${indicatorPayload._meta.indicator_count} indicators → ${INDICATORS_PATH}`);
  console.log(`Copied indicators → ${INDICATORS_AGENT_PATH}`);
  console.log(`Exported ${chunksPayload._meta.chunk_count} RAG chunks → ${CHUNKS_LINKER_PATH}`);
  console.log(`Copied RAG chunks → ${CHUNKS_AGENT_PATH}`);
  console.log(`Knowledge version: ${KNOWLEDGE_REGISTRY_VERSION}`);
  console.log(`Layers: ${JSON.stringify(chunksPayload._meta.layers)}`);
}

main();
