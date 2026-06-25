/**
 * Export health-link L1+L2 knowledge → health-linker/knowledge/indicators.json
 * Run: npm run export:kb
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { L1_REFERENCE_RANGES } from '../src/data/knowledge/l1ReferenceRanges.ts';
import { L2_ANOMALY_CHUNKS } from '../src/data/knowledge/l2Anomaly.ts';
import { KNOWLEDGE_REGISTRY_VERSION } from '../src/data/knowledge/registry.ts';
import type { KnowledgeChunk } from '../src/data/knowledge/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../../health-linker/knowledge/indicators.json');

export interface IndicatorKbEntry {
  canonical_id: string;
  adjustable: boolean;
  reference_high?: number;
  reference_low?: number;
  reference_range: string;
  explanation: string;
  unit?: string;
}

export interface IndicatorKbFile {
  _meta: {
    schema_version: '1.0';
    source: 'health-link';
    knowledge_version: string;
    exported_at: string;
    indicator_count: number;
    notes: string[];
  };
  [indicatorName: string]: IndicatorKbEntry | IndicatorKbFile['_meta'];
}

/** Imaging / qualitative findings not covered by L1+L2 — maintained here only. */
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
  if (NON_ADJUSTABLE_CANONICAL.has(canonicalId)) return false;
  return true;
}

function buildFromL1L2(): Record<string, IndicatorKbEntry> {
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

function main() {
  const indicators = buildFromL1L2();
  const payload: IndicatorKbFile = {
    _meta: {
      schema_version: '1.0',
      source: 'health-link',
      knowledge_version: KNOWLEDGE_REGISTRY_VERSION,
      exported_at: new Date().toISOString(),
      indicator_count: Object.keys(indicators).length,
      notes: [
        '由 health-link/scripts/export-indicator-kb.ts 自动生成，请勿手工编辑',
        '编辑源：health-link/src/data/knowledge/ 后运行 npm run export:kb',
      ],
    },
    ...indicators,
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  console.log(`Exported ${payload._meta.indicator_count} indicators → ${OUT_PATH}`);
  console.log(`Knowledge version: ${KNOWLEDGE_REGISTRY_VERSION}`);
}

main();
