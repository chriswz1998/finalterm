/** 多份标准化报告 → CSV，供办公小浣熊 OpenClaw Office API 分析。 */

export interface RaccoonReportIndicator {
  standard_name: string;
  canonical_id?: string;
  value?: string | number | null;
  unit?: string;
  reference_min?: number | null;
  reference_max?: number | null;
  reference_range_raw?: string;
  is_abnormal?: boolean;
  abnormal_type?: string;
}

export interface RaccoonReportPayload {
  ok?: boolean;
  fileName?: string;
  source_file?: string;
  report_date?: string;
  reportDate?: string;
  hospital?: string;
  indicators?: RaccoonReportIndicator[];
}

const CSV_HEADERS = [
  'report_date',
  'hospital',
  'source_file',
  'standard_name',
  'canonical_id',
  'value',
  'unit',
  'reference_min',
  'reference_max',
  'reference_range_raw',
  'is_abnormal',
  'abnormal_type',
] as const;

function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildReportsCsv(reports: RaccoonReportPayload[]): string {
  const okReports = reports.filter((r) => r.ok !== false);
  if (!okReports.length) throw new Error('没有可导出的有效报告');

  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const report of okReports) {
    const reportDate = report.report_date ?? report.reportDate ?? '';
    const hospital = report.hospital ?? '';
    const sourceFile = report.source_file ?? report.fileName ?? '';
    const indicators = report.indicators ?? [];

    for (const ind of indicators) {
      rows.push(
        [
          reportDate,
          hospital,
          sourceFile,
          ind.standard_name ?? '',
          ind.canonical_id ?? '',
          ind.value ?? '',
          ind.unit ?? '',
          ind.reference_min ?? '',
          ind.reference_max ?? '',
          ind.reference_range_raw ?? '',
          ind.is_abnormal ? 'true' : 'false',
          ind.abnormal_type ?? '',
        ]
          .map(csvEscape)
          .join(','),
      );
    }
  }

  return `\uFEFF${rows.join('\n')}`;
}
