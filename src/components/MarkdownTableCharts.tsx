import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ParsedMarkdownTable } from '@/src/lib/parseMarkdownTables';

const COLORS = ['#1A1A1A', '#b45309', '#0369a1', '#78716c', '#059669', '#7c3aed'];

function buildCombinedData(table: ParsedMarkdownTable) {
  const labels = table.chartSeries[0]?.points.map((p) => p.label) ?? [];
  return labels.map((label) => {
    const row: Record<string, string | number> = { label };
    for (const s of table.chartSeries) {
      const hit = s.points.find((p) => p.label === label);
      if (hit) row[s.metric] = hit.value;
    }
    return row;
  });
}

function SingleMetricChart({ series }: { series: ParsedMarkdownTable['chartSeries'][0] }) {
  return (
    <div className="border border-neutral-200 bg-white p-3 h-52">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2 truncate">
        {series.metric}
        {series.unit ? ` (${series.unit})` : ''}
      </p>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={series.points.map((p) => ({ label: p.label, value: p.value }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={48} />
          <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} width={36} />
          <Tooltip
            contentStyle={{ fontSize: 11, fontFamily: 'Georgia, serif' }}
            formatter={(v: number) => [v, series.metric]}
          />
          <Bar dataKey="value" fill="#1A1A1A" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MarkdownTableCharts({ tables }: { tables: ParsedMarkdownTable[] }) {
  const chartable = tables.filter((t) => t.chartSeries.length > 0);
  if (!chartable.length) return null;

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        表格数据可视化
      </p>
      {chartable.map((table) => {
        const multi = table.chartSeries.length > 1;
        const combined = multi ? buildCombinedData(table) : null;

        return (
          <div key={table.id} className="border border-neutral-100 bg-neutral-50/30 p-3 space-y-3">
            {multi && combined && combined.length >= 2 ? (
              <div className="h-56 border border-neutral-200 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
                  多指标对比
                </p>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={combined}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} width={40} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {table.chartSeries.map((s, idx) => (
                      <Line
                        key={s.metric}
                        type="monotone"
                        dataKey={s.metric}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {table.chartSeries.map((s) => (
                <SingleMetricChart key={s.metric} series={s} />
              ))}
            </div>

            {/* 保留原始表格供对照 */}
            <details className="text-xs font-serif">
              <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800 py-1">
                查看原始表格
              </summary>
              <div className="overflow-x-auto border border-neutral-200 mt-2 bg-white">
                <table className="min-w-full text-[11px]">
                  <thead>
                    <tr>
                      {table.headers.map((h) => (
                        <th key={h} className="bg-neutral-100 px-2 py-1.5 text-left font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="border-t border-neutral-100 px-2 py-1.5">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}
