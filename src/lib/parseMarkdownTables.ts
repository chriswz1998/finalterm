/** 从 Markdown 管道表格提取可图表化的数值序列 */

export interface TableChartSeries {
  metric: string;
  unit: string;
  points: Array<{ label: string; value: number }>;
}

export interface ParsedMarkdownTable {
  id: string;
  headers: string[];
  rows: string[][];
  /** 可图表化时非空 */
  chartSeries: TableChartSeries[];
}

function parseNumericCell(raw: string): { value: number | null; unit: string } {
  const text = raw.trim().replace(/[↑↓↑↓]/g, '').trim();
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*([a-zA-Z%/μ²³·\-]+)?/);
  if (!m) return { value: null, unit: '' };
  const value = parseFloat(m[1]!);
  return { value: Number.isNaN(value) ? null : value, unit: (m[2] ?? '').trim() };
}

function parsePipeRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-+:?$/.test(c.replace(/\s/g, '')));
}

function tableToChartSeries(headers: string[], rows: string[][]): TableChartSeries[] {
  if (headers.length < 2 || rows.length === 0) return [];

  const xLabels = headers.slice(1);
  const series: TableChartSeries[] = [];

  for (const row of rows) {
    const metric = row[0]?.trim();
    if (!metric) continue;

    const points: Array<{ label: string; value: number }> = [];
    let unit = '';

    for (let i = 1; i < headers.length; i++) {
      const cell = row[i] ?? '';
      const { value, unit: u } = parseNumericCell(cell);
      if (value != null) {
        points.push({ label: xLabels[i - 1] ?? `列${i}`, value });
        if (!unit && u) unit = u;
      }
    }

    if (points.length >= 2) {
      series.push({ metric, unit, points });
    }
  }

  return series.slice(0, 6);
}

export function extractMarkdownTables(markdown: string): {
  tables: ParsedMarkdownTable[];
  markdownWithoutTables: string;
} {
  const lines = markdown.split('\n');
  const tables: ParsedMarkdownTable[] = [];
  const out: string[] = [];
  let i = 0;
  let tableIndex = 0;

  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (!line.startsWith('|')) {
      out.push(lines[i]!);
      i++;
      continue;
    }

    const block: string[] = [];
    while (i < lines.length && lines[i]!.trim().startsWith('|')) {
      block.push(lines[i]!);
      i++;
    }

    const parsedRows = block.map(parsePipeRow);
    if (parsedRows.length < 2) {
      out.push(...block);
      continue;
    }

    const headers = parsedRows[0]!;
    const bodyStart = isSeparatorRow(parsedRows[1]!) ? 2 : 1;
    const rows = parsedRows.slice(bodyStart).filter((r) => r.some((c) => c.length > 0));
    const chartSeries = tableToChartSeries(headers, rows);

    tables.push({
      id: `table-${tableIndex++}`,
      headers,
      rows,
      chartSeries,
    });

    if (chartSeries.length === 0) {
      out.push(...block);
    } else {
      out.push('');
      out.push(`> 表 ${tableIndex} 已转为下方图表展示`);
      out.push('');
    }
  }

  return { tables, markdownWithoutTables: out.join('\n').trim() };
}
