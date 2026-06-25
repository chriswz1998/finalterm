import { INDICATOR_DICTIONARY, type IndicatorDefinition } from '@/src/data/indicatorDictionary';
import type { AbnormalFlag, Observation } from '@/src/types/observation';

export interface ExtractOptions {
  reportDate?: string;
  sourcePage?: number;
  /** Override default confidence for regex matches */
  confidence?: number;
}

interface RawMatch {
  def: IndicatorDefinition;
  alias: string;
  numericValue: number;
  rawValue: string;
  referenceRange: string | null;
  sourcePage?: number;
  matchIndex: number;
}

const REF_RANGE_PATTERN =
  /(\d+\.?\d*)\s*[～~\-–—]\s*(\d+\.?\d*)|[<≤]\s*(\d+\.?\d*)|[>≥]\s*(\d+\.?\d*)/;

/** Fallback clinical thresholds when PDF text lacks reference range. */
const FALLBACK_THRESHOLDS: Partial<
  Record<string, { high?: number; low?: number; refLabel: string }>
> = {
  ldl_c: { high: 3.37, refLabel: '理想 <3.37 mmol/L' },
  alt: { high: 40, refLabel: '7.0～40.0 U/L' },
  ast: { high: 40, refLabel: '13.0～40.0 U/L' },
  bmi: { high: 24, refLabel: '18.5～23.9' },
  fasting_glucose: { high: 6.1, refLabel: '3.90～6.10 mmol/L' },
  total_chol: { high: 5.2, refLabel: '合适 <5.2 mmol/L' },
  triglycerides: { high: 1.7, refLabel: '合适 <1.7 mmol/L' },
  creatinine: { high: 73, refLabel: '41～73 μmol/L' },
  bp_systolic: { high: 120, refLabel: '<120 mmHg' },
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildValuePatterns(def: IndicatorDefinition, alias: string): RegExp[] {
  const a = escapeRegExp(alias);
  const u = def.unit ? escapeRegExp(def.unit) : '';
  const unitPart = u ? `(?:\\s*${u})?` : '';
  return [
    new RegExp(`${a}[^\\d]{0,32}(\\d+\\.?\\d*)\\s*(?:\\([^)]*[↑↓][^)]*\\)|↑|↓)?${unitPart}`, 'i'),
    new RegExp(`${escapeRegExp(def.standardName)}[^\\d]{0,32}(\\d+\\.?\\d*)${unitPart}`, 'i'),
  ];
}

function sliceReferenceRange(text: string, fromIndex: number): string | null {
  const window = text.slice(fromIndex, fromIndex + 120);
  const refLabel = window.match(/(?:参考(?:范围|值)?|参照范围)[：:\s]*([^\n]{4,60})/i);
  if (refLabel?.[1]) return refLabel[1].trim();

  const inline = window.match(REF_RANGE_PATTERN);
  if (inline?.[0]) return inline[0].trim();

  return null;
}

export function inferAbnormalFlag(
  numericValue: number,
  referenceRange: string | null,
  rawValue: string,
  canonicalId: string | null,
): AbnormalFlag {
  if (/↑|偏高|升高|\(\s*↑\s*\)/i.test(rawValue)) return 'high';
  if (/↓|偏低|降低|\(\s*↓\s*\)/i.test(rawValue)) return 'low';

  if (referenceRange) {
    const range = referenceRange.match(/(\d+\.?\d*)\s*[～~\-–—]\s*(\d+\.?\d*)/);
    if (range) {
      const min = parseFloat(range[1]);
      const max = parseFloat(range[2]);
      if (numericValue > max) return 'high';
      if (numericValue < min) return 'low';
      return null;
    }
    const lt = referenceRange.match(/[<≤]\s*(\d+\.?\d*)/);
    if (lt && numericValue >= parseFloat(lt[1])) return 'high';
    const gt = referenceRange.match(/[>≥]\s*(\d+\.?\d*)/);
    if (gt && numericValue <= parseFloat(gt[1])) return 'low';
  }

  if (canonicalId) {
    const fb = FALLBACK_THRESHOLDS[canonicalId];
    if (fb?.high != null && numericValue > fb.high) return 'high';
    if (fb?.low != null && numericValue < fb.low) return 'low';
  }

  return null;
}

function findRawMatches(text: string, sourcePage?: number): RawMatch[] {
  const matches: RawMatch[] = [];

  for (const def of INDICATOR_DICTIONARY) {
    for (const alias of def.aliases) {
      for (const pattern of buildValuePatterns(def, alias)) {
        const m = pattern.exec(text);
        if (!m?.[1]) continue;
        const numericValue = parseFloat(m[1]);
        if (Number.isNaN(numericValue)) continue;

        const matchIndex = m.index ?? 0;
        const rawSpan = m[0];
        const refFromDict = FALLBACK_THRESHOLDS[def.canonicalId]?.refLabel ?? null;
        const referenceRange = sliceReferenceRange(text, matchIndex + rawSpan.length) ?? refFromDict;

        matches.push({
          def,
          alias,
          numericValue,
          rawValue: rawSpan,
          referenceRange,
          sourcePage,
          matchIndex,
        });
        break;
      }
    }
  }

  return matches;
}

function dedupeMatches(matches: RawMatch[]): RawMatch[] {
  const best = new Map<string, RawMatch>();

  for (const m of matches) {
    const key = m.def.canonicalId;
    const existing = best.get(key);
    if (!existing) {
      best.set(key, m);
      continue;
    }
    const score = (x: RawMatch) =>
      (x.referenceRange && !FALLBACK_THRESHOLDS[x.def.canonicalId]?.refLabel?.includes(x.referenceRange) ? 2 : 0) +
      (x.sourcePage != null ? 1 : 0);
    if (score(m) > score(existing)) best.set(key, m);
  }

  return [...best.values()];
}

export function extractInstitution(text: string): string | null {
  const labeled =
    text.match(/(?:检验机构|送检单位|体检机构|报告单位|单位名称|医疗机构)[：:\s]*([^\n\r]{2,48})/i) ??
    text.match(/(?:医院名称)[：:\s]*([^\n\r]{2,48})/i);
  if (labeled?.[1]) {
    const cleaned = labeled[1].trim().replace(/\s+/g, ' ');
    if (cleaned.length >= 2) return cleaned;
  }

  const inline = text.match(/([\u4e00-\u9fa5A-Za-z0-9·（）()]{2,24}(?:医院|医学检验(?:所|中心)?|检验中心|体检中心|医学实验室|健康管理中心|远程医学))/);
  if (inline?.[1]) return inline[1].trim();

  return null;
}

export function extractReportDate(text: string): string | null {
  const labeled =
    text.match(/(?:体检日期|检查日期|报告日期|总检日期)[：:\s]*(\d{4})[-./年]?(\d{1,2})[-./月]?(\d{1,2})/i) ??
    text.match(/(?:日期)[：:\s]*(\d{4})[-./](\d{2})[-./](\d{2})/i);
  if (labeled) {
    const [, y, mo, d] = labeled;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const iso = text.match(/\b(20\d{2})[-./](\d{2})[-./](\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const compact = text.match(/\b(20\d{2})(\d{2})(\d{2})\b/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  return null;
}

function rawMatchToObservation(
  m: RawMatch,
  reportDate: string,
  seq: number,
): Observation {
  const abnormalFlag = inferAbnormalFlag(m.numericValue, m.referenceRange, m.rawValue, m.def.canonicalId);
  const confidence = m.referenceRange ? 0.82 : 0.68;

  return {
    id: `pdf:${reportDate}:${m.def.canonicalId}:${seq}`,
    canonicalId: m.def.canonicalId,
    standardName: m.def.standardName,
    originalName: m.alias,
    loinc: m.def.loinc,
    value: String(m.numericValue),
    numericValue: m.numericValue,
    unit: m.def.unit,
    referenceRange: m.referenceRange,
    abnormalFlag,
    reportDate,
    provenance: {
      source: 'pdf_extract',
      reportDate,
      sourcePage: m.sourcePage,
      confidence,
    },
  };
}

export function extractObservationsFromText(text: string, options: ExtractOptions = {}): Observation[] {
  const reportDate = options.reportDate ?? extractReportDate(text) ?? new Date().toISOString().slice(0, 10);
  const raw = findRawMatches(text, options.sourcePage);
  return dedupeMatches(raw).map((m, i) => rawMatchToObservation(m, reportDate, i));
}

export function extractObservationsFromPages(pages: string[], reportDate?: string): Observation[] {
  const fullText = pages.join('\n');
  const resolvedDate = reportDate ?? extractReportDate(fullText) ?? new Date().toISOString().slice(0, 10);

  const allMatches: RawMatch[] = [];
  pages.forEach((pageText, idx) => {
    allMatches.push(...findRawMatches(pageText, idx + 1));
  });

  return dedupeMatches(allMatches).map((m, i) => rawMatchToObservation(m, resolvedDate, i));
}

export function observationsToMetrics(observations: Observation[]) {
  return observations.map((o) => ({
    name: o.standardName,
    value: o.value ?? '',
    unit: o.unit,
    canonicalId: o.canonicalId ?? undefined,
  }));
}

export function getIndicatorByCanonicalId(id: string): IndicatorDefinition | null {
  return INDICATOR_DICTIONARY.find((d) => d.canonicalId === id) ?? null;
}
