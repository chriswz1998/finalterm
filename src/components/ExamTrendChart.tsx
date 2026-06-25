import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { BatchAnalysisResult } from '@/src/lib/batchReportImport';

const COLORS = ['#1A1A1A', '#78716c', '#b45309', '#0369a1'];

export function ExamTrendChart({
  chartHints,
}: {
  chartHints: NonNullable<BatchAnalysisResult['chartHints']>;
}) {
  if (!chartHints.length) {
    return (
      <p className="text-xs text-neutral-500 font-serif py-4">
        需至少 2 份不同日期的报告，且含相同可量化指标（如 LDL、ALT），趋势才会显示。
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {chartHints.map((series, idx) => (
        <div key={series.metric} className="border border-neutral-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">
            {series.metric} ({series.unit})
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={series.metric}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
