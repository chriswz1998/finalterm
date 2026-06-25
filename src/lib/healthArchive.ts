import {
  EXAM_DATES,
  EXAM_VITALS_SUPPLEMENT,
  OBSERVATIONS_BY_DATE,
  type TrendPoint,
} from '@/src/data/examDataset';
import type { Observation } from '@/src/types/observation';

export interface UserExamImport {
  id: string;
  reportDate: string;
  fileName: string;
  importedAt: string;
  source: 'hospital_csv' | 'pdf_extract' | 'vision_ocr' | 'manual';
  observations: Observation[];
}

export interface MergedHealthArchive {
  observationsByDate: Record<string, Observation[]>;
  examDates: string[];
  trendData: TrendPoint[];
  data4Y: Array<{ label: string; ldl: number; bmi: number; alt: number; tg: number }>;
  latestImport: UserExamImport | null;
}

const TREND_CANONICAL: Array<{ key: keyof TrendPoint; id: string }> = [
  { key: 'ldl', id: 'ldl_c' },
  { key: 'chol', id: 'total_chol' },
  { key: 'hdl', id: 'hdl_c' },
  { key: 'tg', id: 'triglycerides' },
  { key: 'bmi', id: 'bmi' },
  { key: 'bp', id: 'bp_systolic' },
  { key: 'glucose', id: 'fasting_glucose' },
  { key: 'egfr', id: 'egfr' },
  { key: 'alt', id: 'alt' },
];

function mergeObservationsForDate(
  baseline: Observation[],
  imports: Observation[],
): Observation[] {
  const byCanonical = new Map<string, Observation>();
  const nonCanonical: Observation[] = [];

  for (const o of baseline) {
    if (o.canonicalId) byCanonical.set(o.canonicalId, o);
    else nonCanonical.push(o);
  }
  for (const o of imports) {
    if (o.canonicalId) byCanonical.set(o.canonicalId, o);
    else nonCanonical.push(o);
  }

  return [...byCanonical.values(), ...nonCanonical];
}

export function mergeUserImports(
  userImports: UserExamImport[],
  baselineByDate: Record<string, Observation[]> = OBSERVATIONS_BY_DATE,
  baselineDates: string[] = EXAM_DATES,
): MergedHealthArchive {
  const observationsByDate: Record<string, Observation[]> = {};
  for (const d of baselineDates) {
    observationsByDate[d] = [...(baselineByDate[d] ?? [])];
  }

  const importsByDate = new Map<string, Observation[]>();
  for (const imp of userImports) {
    const list = importsByDate.get(imp.reportDate) ?? [];
    list.push(...imp.observations);
    importsByDate.set(imp.reportDate, list);
  }

  for (const [date, imported] of importsByDate) {
    observationsByDate[date] = mergeObservationsForDate(observationsByDate[date] ?? [], imported);
  }

  const examDates = Object.keys(observationsByDate).sort();
  const trendData = buildTrendFromObservations(observationsByDate, examDates);
  const data4Y = trendData.map((t) => ({
    label: t.year,
    ldl: t.ldl ?? 0,
    bmi: t.bmi ?? 0,
    alt: t.alt ?? 0,
    tg: t.tg ?? 0,
  }));

  return {
    observationsByDate,
    examDates,
    trendData,
    data4Y,
    latestImport: userImports.length > 0 ? userImports[userImports.length - 1] : null,
  };
}

export function buildTrendFromObservations(
  observationsByDate: Record<string, Observation[]>,
  examDates: string[],
): TrendPoint[] {
  return examDates.map((reportDate) => {
    const get = (canonicalId: string): number | null => {
      const candidates = (observationsByDate[reportDate] ?? []).filter(
        (o) => o.canonicalId === canonicalId,
      );
      const withValue = candidates.find((o) => o.numericValue != null);
      return withValue?.numericValue ?? null;
    };

    const sup = EXAM_VITALS_SUPPLEMENT[reportDate];
    const point: TrendPoint = {
      year: reportDate.slice(0, 4),
      reportDate,
      ldl: null,
      chol: null,
      hdl: null,
      tg: null,
      bmi: null,
      bp: null,
      glucose: null,
      egfr: null,
      alt: null,
    };

    for (const { key, id } of TREND_CANONICAL) {
      (point[key] as number | null) = get(id);
    }

    point.bmi = point.bmi ?? sup?.bmi ?? null;
    point.bp = point.bp ?? sup?.bpSystolic ?? null;

    return point;
  });
}

export function getLatestFromMerged(
  archive: MergedHealthArchive,
  canonicalId: string,
): Observation | undefined {
  for (let i = archive.examDates.length - 1; i >= 0; i--) {
    const date = archive.examDates[i];
    const candidates = (archive.observationsByDate[date] ?? []).filter(
      (o) => o.canonicalId === canonicalId && o.numericValue != null,
    );
    if (candidates.length > 0) return candidates[0];
  }
  return undefined;
}

export function getPriorObservation(
  archive: MergedHealthArchive,
  canonicalId: string,
  beforeDate: string,
): Observation | undefined {
  const idx = archive.examDates.indexOf(beforeDate);
  const searchDates = idx > 0 ? archive.examDates.slice(0, idx) : archive.examDates.filter((d) => d < beforeDate);
  for (let i = searchDates.length - 1; i >= 0; i--) {
    const obs = (archive.observationsByDate[searchDates[i]] ?? []).find(
      (o) => o.canonicalId === canonicalId && o.numericValue != null,
    );
    if (obs) return obs;
  }
  return undefined;
}

export interface ObservationDelta {
  canonicalId: string;
  standardName: string;
  current: number;
  prior: number | null;
  unit: string;
  direction: 'up' | 'down' | 'same' | 'new';
}

export function computeImportDeltas(
  archive: MergedHealthArchive,
  importRecord: UserExamImport,
): ObservationDelta[] {
  const deltas: ObservationDelta[] = [];

  for (const obs of importRecord.observations) {
    if (!obs.canonicalId || obs.numericValue == null) continue;
    const prior = getPriorObservation(archive, obs.canonicalId, importRecord.reportDate);
    const priorVal = prior?.numericValue ?? null;
    let direction: ObservationDelta['direction'] = 'new';
    if (priorVal != null) {
      if (obs.numericValue > priorVal) direction = 'up';
      else if (obs.numericValue < priorVal) direction = 'down';
      else direction = 'same';
    }
    deltas.push({
      canonicalId: obs.canonicalId,
      standardName: obs.standardName,
      current: obs.numericValue,
      prior: priorVal,
      unit: obs.unit,
      direction,
    });
  }

  return deltas;
}

export function createImportFromPdf(result: {
  fileName: string;
  parsedAt: string;
  reportDate?: string;
  observations: Observation[];
  source?: UserExamImport['source'];
}): UserExamImport {
  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reportDate:
      result.reportDate ??
      result.observations[0]?.reportDate ??
      new Date().toISOString().slice(0, 10),
    fileName: result.fileName,
    importedAt: result.parsedAt,
    source: result.source ?? 'pdf_extract',
    observations: result.observations,
  };
}

export function upsertUserImport(
  imports: UserExamImport[],
  incoming: UserExamImport,
): UserExamImport[] {
  const withoutSame = imports.filter(
    (i) => !(i.reportDate === incoming.reportDate && i.fileName === incoming.fileName),
  );
  return [...withoutSame, incoming];
}

export function buildDefaultArchive(): MergedHealthArchive {
  return mergeUserImports([]);
}
