import longCsv from '@/src/data/raw/exam-long.csv?raw';
import anomaliesCsv from '@/src/data/raw/exam-anomalies.csv?raw';
import { csvToObjects } from '@/src/lib/csvParse';
import { resolveIndicator, resolveIndicatorByStandardCode } from '@/src/data/indicatorDictionary';
import type { AbnormalFlag, Observation, ExamSnapshot } from '@/src/types/observation';

/** Vitals not fully present in long-table CSV for all years (from structured hospital exports). */
export const EXAM_VITALS_SUPPLEMENT: Record<
  string,
  { bmi?: number; bpSystolic?: number; weight?: string; stableIssues?: string[] }
> = {
  '2021-11-24': {
    bmi: 22.76,
    bpSystolic: 97,
    weight: '50.2',
    stableIssues: ['C13 呼气试验阳性 (+)', '窦性心动过缓 (52 bpm)'],
  },
  '2022-12-23': {
    bmi: 24.24,
    bpSystolic: 95,
    weight: '53.1',
    stableIssues: ['首次探出 0.3cm 胆囊息肉样变'],
  },
  '2024-03-30': {
    bmi: 24.71,
    bpSystolic: 114,
    weight: '55.6',
    stableIssues: ['首次检出双侧乳腺小二级结节', '胆囊息肉稳定 (0.3cm)'],
  },
  '2025-02-28': {
    bmi: 24.88,
    bpSystolic: 118,
    weight: '55.6',
    stableIssues: ['胆囊息肉 (0.3cm, 持续稳定)', '双侧乳腺小囊肿 (BI-RADS 2)'],
  },
};

const HOSPITAL = '厦门弘爱医院';

function parseAbnormal(raw: string): AbnormalFlag {
  if (!raw) return null;
  if (raw === 'high') return 'high';
  if (raw === 'low') return 'low';
  if (raw === 'critical') return 'critical';
  return 'positive';
}

function rowToObservation(row: Record<string, string>, index: number): Observation {
  const reportDate = row['日期'] ?? '';
  const standardCode = row['指标标准名'] ?? '';
  const originalName = row['指标原名'] ?? standardCode;
  const rawValue = row['原始值'] ?? '';
  const numericRaw = row['数值'] ?? '';
  const numericValue = numericRaw !== '' && !Number.isNaN(Number(numericRaw)) ? Number(numericRaw) : null;

  const def =
    resolveIndicatorByStandardCode(standardCode) ??
    resolveIndicator(originalName) ??
    resolveIndicator(standardCode);

  return {
    id: `${reportDate}:${standardCode}:${index}`,
    canonicalId: def?.canonicalId ?? null,
    standardName: def?.standardName ?? standardCode,
    originalName,
    loinc: def?.loinc,
    value: rawValue || null,
    numericValue,
    unit: def?.unit ?? '',
    referenceRange: row['参考值'] || null,
    abnormalFlag: parseAbnormal(row['异常'] ?? ''),
    reportDate,
    provenance: {
      source: 'hospital_csv',
      reportDate,
      confidence: def ? 0.95 : 0.7,
    },
  };
}

function buildSupplementObservations(reportDate: string): Observation[] {
  const sup = EXAM_VITALS_SUPPLEMENT[reportDate];
  if (!sup) return [];

  const extras: Observation[] = [];
  if (sup.bmi != null) {
    extras.push({
      id: `${reportDate}:bmi:sup`,
      canonicalId: 'bmi',
      standardName: 'BMI',
      originalName: '体重指数(kg/㎡)',
      value: String(sup.bmi),
      numericValue: sup.bmi,
      unit: '',
      referenceRange: '18.5～23.9',
      abnormalFlag: sup.bmi >= 24 ? 'high' : null,
      reportDate,
      provenance: { source: 'hospital_csv', reportDate, confidence: 0.9 },
    });
  }
  if (sup.bpSystolic != null) {
    extras.push({
      id: `${reportDate}:bp:sup`,
      canonicalId: 'bp_systolic',
      standardName: '收缩压',
      originalName: '血压(mmHg)',
      value: String(sup.bpSystolic),
      numericValue: sup.bpSystolic,
      unit: 'mmHg',
      referenceRange: '<120',
      abnormalFlag: sup.bpSystolic >= 120 ? 'high' : null,
      reportDate,
      provenance: { source: 'hospital_csv', reportDate, confidence: 0.85 },
    });
  }
  return extras;
}

function loadObservations(): Observation[] {
  const rows = csvToObjects(longCsv);
  const fromCsv = rows.map((row, i) => rowToObservation(row, i));
  const dates = [...new Set(fromCsv.map((o) => o.reportDate))];
  const supplements = dates.flatMap((d) => buildSupplementObservations(d));
  return [...fromCsv, ...supplements];
}

export const ALL_OBSERVATIONS = loadObservations();

export const OBSERVATIONS_BY_DATE = ALL_OBSERVATIONS.reduce<Record<string, Observation[]>>((acc, obs) => {
  (acc[obs.reportDate] ??= []).push(obs);
  return acc;
}, {});

export const EXAM_DATES = Object.keys(OBSERVATIONS_BY_DATE).sort();

export function getObservation(reportDate: string, canonicalId: string): Observation | undefined {
  const candidates = OBSERVATIONS_BY_DATE[reportDate]?.filter((o) => o.canonicalId === canonicalId) ?? [];
  return candidates.find((o) => o.numericValue != null) ?? candidates[0];
}

export function getLatestObservation(canonicalId: string): Observation | undefined {
  for (let i = EXAM_DATES.length - 1; i >= 0; i--) {
    const obs = getObservation(EXAM_DATES[i], canonicalId);
    if (obs?.numericValue != null) return obs;
  }
  return undefined;
}

export interface AnomalyRecord {
  reportDate: string;
  originalName: string;
  rawValue: string;
  numericValue: number | null;
  abnormalFlag: AbnormalFlag;
  referenceRange: string | null;
}

export const ANOMALY_RECORDS: AnomalyRecord[] = csvToObjects(anomaliesCsv).map((row) => ({
  reportDate: row['日期'] ?? '',
  originalName: row['指标原名'] ?? '',
  rawValue: row['原始值'] ?? '',
  numericValue: row['数值'] !== '' && !Number.isNaN(Number(row['数值'])) ? Number(row['数值']) : null,
  abnormalFlag: parseAbnormal(row['异常'] ?? ''),
  referenceRange: row['参考值'] || null,
}));

export function buildExamSnapshots(): ExamSnapshot[] {
  return EXAM_DATES.map((reportDate) => {
    const observations = OBSERVATIONS_BY_DATE[reportDate] ?? [];
    const anomalyCount = observations.filter((o) => o.abnormalFlag != null).length;
    return {
      reportDate,
      year: reportDate.slice(0, 4),
      hospital: HOSPITAL,
      observations,
      anomalyCount,
    };
  });
}

export const EXAM_SNAPSHOTS = buildExamSnapshots();

export interface ArchiveAnomalyItem {
  name: string;
  value: string;
  unit: string;
  type: 'danger' | 'high' | 'warning';
  label: string;
}

export interface DerivedArchive {
  year: string;
  date: string;
  hospital: string;
  status: 'verified';
  items: number;
  anomaliesCount: number;
  anomaliesList: ArchiveAnomalyItem[];
  stableIssues?: string[];
}

function severityFromFlag(flag: AbnormalFlag, canonicalId: string | null): 'danger' | 'high' | 'warning' {
  if (canonicalId === 'alt') return 'danger';
  if (canonicalId === 'ldl_c') return 'high';
  return 'high';
}

function anomalyLabel(obs: Pick<Observation, 'canonicalId' | 'standardName'>): string {
  if (obs.canonicalId === 'ldl_c') return '血脂超标异常';
  if (obs.canonicalId === 'alt') return '转氨酶超标';
  if (obs.canonicalId === 'hdl_c') return 'HDL 升高（需结合临床）';
  if (obs.canonicalId === 'total_chol') return '总胆固醇升高';
  if (obs.canonicalId === 'creatinine') return '肌酐偏高';
  if (obs.canonicalId === 'bmi') return '轻度超重';
  return `${obs.standardName} 异常`;
}

export function buildDerivedArchives(): DerivedArchive[] {
  return EXAM_SNAPSHOTS.map((snap) => {
    const formattedDate = snap.reportDate.replace(/-/g, '.');
    const csvAnomalies = ANOMALY_RECORDS.filter((a) => a.reportDate === snap.reportDate);

    const anomaliesList: ArchiveAnomalyItem[] = csvAnomalies.map((a) => {
      const def = resolveIndicator(a.originalName);
      return {
        name: def?.standardName ?? a.originalName,
        value: a.numericValue != null ? String(a.numericValue) : a.rawValue,
        unit: def?.unit ?? '',
        type: severityFromFlag(a.abnormalFlag, def?.canonicalId ?? null),
        label: anomalyLabel({
          canonicalId: def?.canonicalId ?? null,
          standardName: def?.standardName ?? a.originalName,
        }),
      };
    });

    const supplement = EXAM_VITALS_SUPPLEMENT[snap.reportDate];
    const hasBmiAnomaly = supplement?.bmi != null && supplement.bmi >= 24;
    if (hasBmiAnomaly && !anomaliesList.some((a) => a.name === 'BMI')) {
      anomaliesList.push({
        name: 'BMI',
        value: String(supplement!.bmi),
        unit: '超重',
        type: supplement!.bmi! >= 24.5 ? 'high' : 'warning',
        label: '轻度超重警戒带',
      });
    }

    return {
      year: snap.year,
      date: formattedDate,
      hospital: snap.hospital,
      status: 'verified' as const,
      items: snap.observations.length,
      anomaliesCount: anomaliesList.length,
      anomaliesList,
      stableIssues: supplement?.stableIssues,
    };
  }).reverse();
}

export const DERIVED_ARCHIVES = buildDerivedArchives();

export interface TrendPoint {
  year: string;
  reportDate: string;
  ldl: number | null;
  chol: number | null;
  hdl: number | null;
  tg: number | null;
  bmi: number | null;
  bp: number | null;
  glucose: number | null;
  egfr: number | null;
  alt: number | null;
}

function numAt(date: string, id: string): number | null {
  return getObservation(date, id)?.numericValue ?? null;
}

export function buildTrendData(): TrendPoint[] {
  return EXAM_DATES.map((reportDate) => {
    const year = reportDate.slice(0, 4);
    const sup = EXAM_VITALS_SUPPLEMENT[reportDate];
    return {
      year,
      reportDate,
      ldl: numAt(reportDate, 'ldl_c'),
      chol: numAt(reportDate, 'total_chol'),
      hdl: numAt(reportDate, 'hdl_c'),
      tg: numAt(reportDate, 'triglycerides'),
      bmi: numAt(reportDate, 'bmi') ?? sup?.bmi ?? null,
      bp: numAt(reportDate, 'bp_systolic') ?? sup?.bpSystolic ?? null,
      glucose: numAt(reportDate, 'fasting_glucose'),
      egfr: numAt(reportDate, 'egfr'),
      alt: numAt(reportDate, 'alt'),
    };
  });
}

export const TREND_DATA = buildTrendData();

export const DATA_4Y = TREND_DATA.map((t) => ({
  label: t.year,
  ldl: t.ldl ?? 0,
  bmi: t.bmi ?? 0,
  alt: t.alt ?? 0,
  tg: t.tg ?? 0,
}));
