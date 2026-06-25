import { L1_BY_CANONICAL } from '@/src/data/knowledge/l1ReferenceRanges';
import { L0_BY_ID } from '@/src/data/knowledge/l0Sources';

export type ReferenceRangeSource = 'report' | 'wst_fallback' | 'none';

export interface ReferenceRangeDisplay {
  /** Range shown to user */
  displayRange: string | null;
  source: ReferenceRangeSource;
  /** Short UI hint when not from report */
  hint?: string;
  sourceName?: string;
}

export function buildReferenceRangeDisplay(input: {
  referenceRange?: string | null;
  canonicalId?: string | null;
}): ReferenceRangeDisplay {
  const fromReport = input.referenceRange?.trim();
  if (fromReport) {
    return {
      displayRange: fromReport,
      source: 'report',
    };
  }

  if (!input.canonicalId) {
    return { displayRange: null, source: 'none' };
  }

  const fallback = L1_BY_CANONICAL.get(input.canonicalId);
  if (!fallback) {
    return { displayRange: null, source: 'none' };
  }

  const l0 = L0_BY_ID.get(fallback.sourceId);
  return {
    displayRange: fallback.rangeLabel + (fallback.unit ? ` ${fallback.unit}` : ''),
    source: 'wst_fallback',
    hint: '报告未提供参考范围，以下为 WS/T/指南通用兜底区间，判定异常仍以报告单与实验室方法学为准。',
    sourceName: l0?.name ?? fallback.sourceId,
  };
}
