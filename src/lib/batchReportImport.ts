import type { PdfParseResult } from '@/src/lib/pdfParser';
import { observationsToMetrics } from '@/src/lib/pdfParser';
import { extractInstitution } from '@/src/lib/observationExtract';
import {
  mergeUserImports,
  type MergedHealthArchive,
  type UserExamImport,
} from '@/src/lib/healthArchive';
import { buildRuleContext, evaluateRedFlags, type RedFlagHit } from '@/src/lib/redFlagRules';
import type { Observation } from '@/src/types/observation';

export interface BatchImportFileResult {
  fileName: string;
  ok: boolean;
  reportDate?: string;
  observationCount: number;
  abnormalCount: number;
  topAbnormal: string[];
  error?: string;
  source?: 'pdf_extract' | 'vision_ocr' | 'hospital_csv';
  /** PDF 文本摘要，用于提取检验机构等 Meta */
  textPreview?: string;
  /** 供办公小浣熊跨报告分析 */
  observations?: Observation[];
}

export interface BatchLocalMeta {
  institution: string;
  reportDatesLabel: string;
  subjectName: string;
  normalCount: number;
  totalCount: number;
  abnormalCount: number;
  fileCount: number;
  sourceLabel: string;
}

export interface BatchImportSummary {
  results: BatchImportFileResult[];
  totalFiles: number;
  successCount: number;
  totalObservations: number;
  totalAbnormal: number;
  lastUpload: PdfParseResult | null;
}

export interface BatchAnalysisResult {
  headline?: string;
  overallSummary?: string;
  improving?: string[];
  worsening?: string[];
  stable?: string[];
  crossReportInsights?: string[];
  suggestedQuestions?: string[];
  chartHints?: Array<{
    metric: string;
    unit: string;
    points: Array<{ date: string; value: number }>;
  }>;
  disclaimer?: string;
  provider?: string;
  model?: string;
  label?: string;
  source?: 'raccoon' | 'llm';
  raccoonSessionId?: string;
  analysisText?: string;
  images?: string[];
  artifacts?: Array<{ filename: string; url: string; timestamp?: string }>;
}

function observationToIndicator(o: Observation) {
  return {
    standard_name: o.standardName,
    canonical_id: o.canonicalId ?? undefined,
    value: o.value ?? o.numericValue,
    unit: o.unit,
    reference_range_raw: o.referenceRange ?? undefined,
    is_abnormal: o.abnormalFlag != null,
    abnormal_type: o.abnormalFlag ?? undefined,
  };
}

export function buildRaccoonReportPayload(results: BatchImportFileResult[]) {
  return results
    .filter((r) => r.ok)
    .map((r) => ({
      ok: true,
      fileName: r.fileName,
      source_file: r.fileName,
      reportDate: r.reportDate ?? new Date().toISOString().slice(0, 10),
      indicators: (r.observations ?? []).map(observationToIndicator),
    }));
}

export async function parseReportToPdfResult(file: File): Promise<PdfParseResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    const { parsePdfFile } = await import('@/src/lib/pdfParser');
    const pdfResult = await parsePdfFile(file);
    if (pdfResult.observations.length > 0) return pdfResult;
  }

  const { parseReportFile } = await import('@/src/agent/parseReport');
  const parsed = await parseReportFile(file);
  return {
    fileName: parsed.fileName,
    pageCount: 1,
    textPreview: `${parsed.source} · ${parsed.observations.length} obs`,
    observations: parsed.observations,
    metrics: observationsToMetrics(parsed.observations),
    parsedAt: new Date().toISOString(),
    source: parsed.source,
    reportDate: parsed.reportDate,
  };
}

export function batchResultsToImports(results: BatchImportFileResult[]): UserExamImport[] {
  return results
    .filter((r) => r.ok && r.observations?.length)
    .map((r, i) => ({
      id: `batch-${r.fileName}-${i}`,
      reportDate: r.reportDate ?? new Date().toISOString().slice(0, 10),
      fileName: r.fileName,
      importedAt: new Date().toISOString(),
      source: r.source ?? 'pdf_extract',
      observations: r.observations!,
    }));
}

/** 本批上传专用档案（不含 Demo 基线） */
export function buildBatchArchiveFromResults(results: BatchImportFileResult[]): MergedHealthArchive {
  return mergeUserImports(batchResultsToImports(results), {}, []);
}

export function collectBatchObservations(results: BatchImportFileResult[]): Observation[] {
  return results.filter((r) => r.ok).flatMap((r) => r.observations ?? []);
}

export function buildRedFlagsFromBatchResults(results: BatchImportFileResult[]): RedFlagHit[] {
  const archive = buildBatchArchiveFromResults(results);
  const ctx = buildRuleContext(
    archive.observationsByDate,
    archive.examDates,
    archive.trendData,
    archive.latestImport,
  );
  return evaluateRedFlags(ctx);
}

export function buildBatchLocalMeta(
  results: BatchImportFileResult[],
  subjectName: string,
): BatchLocalMeta {
  const ok = results.filter((r) => r.ok);
  const obs = collectBatchObservations(results);
  const abnormal = obs.filter((o) => o.abnormalFlag != null);
  const dates = [...new Set(ok.map((r) => r.reportDate).filter(Boolean) as string[])].sort();
  let institution = '未识别';
  for (const r of ok) {
    if (r.textPreview) {
      const found = extractInstitution(r.textPreview);
      if (found) {
        institution = found;
        break;
      }
    }
  }
  const sources = [...new Set(ok.map((r) => r.source).filter(Boolean))];
  return {
    institution,
    reportDatesLabel:
      dates.length === 0
        ? '未识别'
        : dates.length === 1
          ? dates[0]!
          : `${dates[0]} ～ ${dates[dates.length - 1]}（${dates.length} 个日期）`,
    subjectName,
    normalCount: Math.max(0, obs.length - abnormal.length),
    totalCount: obs.length,
    abnormalCount: abnormal.length,
    fileCount: ok.length,
    sourceLabel: sources.length ? sources.join(' / ') : '未识别',
  };
}

export function summarizeBatchResults(results: BatchImportFileResult[]): {
  reports: Array<{
    fileName: string;
    reportDate: string;
    observationCount: number;
    abnormalCount: number;
    topAbnormal: string[];
  }>;
} {
  return {
    reports: results
      .filter((r) => r.ok)
      .map((r) => ({
        fileName: r.fileName,
        reportDate: r.reportDate ?? new Date().toISOString().slice(0, 10),
        observationCount: r.observationCount,
        abnormalCount: r.abnormalCount,
        topAbnormal: r.topAbnormal,
      })),
  };
}

export async function fetchBatchAnalysis(
  results: BatchImportFileResult[],
  opts?: { memberName?: string },
): Promise<BatchAnalysisResult> {
  const reports = buildRaccoonReportPayload(results);
  const res = await fetch('/api/import/batch-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reports, memberName: opts?.memberName ?? '' }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof payload.message === 'string' ? payload.message : `分析失败 (${res.status})`);
  }
  return payload as BatchAnalysisResult;
}

/** 从本次批量上传结果构建趋势（不含历史 demo 档案） */
export function buildChartSeriesFromBatchResults(
  results: BatchImportFileResult[],
): BatchAnalysisResult['chartHints'] {
  const byDate: Record<string, Observation[]> = {};

  for (const r of results) {
    if (!r.ok || !r.observations?.length) continue;
    const date = r.reportDate ?? new Date().toISOString().slice(0, 10);
    const existing = byDate[date] ?? [];
    byDate[date] = mergeObservationsForChart(existing, r.observations);
  }

  const canonicalIds = discoverChartableCanonicalIds(byDate);
  return buildChartSeriesFromArchive(byDate, canonicalIds);
}

function mergeObservationsForChart(existing: Observation[], incoming: Observation[]): Observation[] {
  const byCanonical = new Map<string, Observation>();
  const rest: Observation[] = [];
  for (const o of [...existing, ...incoming]) {
    if (o.canonicalId) byCanonical.set(o.canonicalId, o);
    else rest.push(o);
  }
  return [...byCanonical.values(), ...rest];
}

/** 自动挑选在 ≥2 个日期都有数值的指标 */
function discoverChartableCanonicalIds(
  observationsByDate: Record<string, Observation[]>,
  maxSeries = 4,
): string[] {
  const counts = new Map<string, number>();

  for (const obs of Object.values(observationsByDate)) {
    const seenOnDate = new Set<string>();
    for (const o of obs) {
      if (o.canonicalId && o.numericValue != null) seenOnDate.add(o.canonicalId);
    }
    for (const id of seenOnDate) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  if (ranked.length > 0) return ranked.slice(0, maxSeries);

  return ['ldl_c', 'alt', 'bmi', 'fasting_glucose'];
}

export function buildChartSeriesFromArchive(
  observationsByDate: Record<string, Observation[]>,
  canonicalIds: string[] = ['ldl_c', 'alt', 'bmi', 'fasting_glucose'],
): BatchAnalysisResult['chartHints'] {
  const series: NonNullable<BatchAnalysisResult['chartHints']> = [];

  for (const cid of canonicalIds) {
    const points: Array<{ date: string; value: number }> = [];
    let unit = '';
    let metric = cid;

    for (const [date, obs] of Object.entries(observationsByDate)) {
      const hit = obs.find((o) => o.canonicalId === cid && o.numericValue != null);
      if (hit?.numericValue != null) {
        points.push({ date, value: hit.numericValue });
        unit = hit.unit;
        metric = hit.standardName;
      }
    }

    if (points.length >= 2) {
      points.sort((a, b) => a.date.localeCompare(b.date));
      series.push({ metric, unit, points });
    }
  }

  return series;
}
