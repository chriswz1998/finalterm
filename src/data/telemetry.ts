export type TimeWindow = '7d' | '30d' | '90d' | '4y';

export const DATA_7D = [
  { label: '06-02', bpSys: 114, bpDias: 74, hr: 64, sleep: 6.5, steps: 8400 },
  { label: '06-03', bpSys: 118, bpDias: 78, hr: 67, sleep: 5.8, steps: 9100 },
  { label: '06-04', bpSys: 121, bpDias: 79, hr: 69, sleep: 6.2, steps: 7800 },
  { label: '06-05', bpSys: 116, bpDias: 75, hr: 63, sleep: 7.0, steps: 8500 },
  { label: '06-06', bpSys: 115, bpDias: 74, hr: 65, sleep: 6.8, steps: 7900 },
  { label: '06-07', bpSys: 119, bpDias: 77, hr: 66, sleep: 5.5, steps: 8200 },
  { label: '06-08', bpSys: 117, bpDias: 76, hr: 65, sleep: 6.4, steps: 8300 },
] as const;

export const DATA_30D = [
  { label: 'W1均值', bpSys: 115, bpDias: 74, hr: 64, sleep: 6.6, steps: 8120 },
  { label: 'W2均值', bpSys: 117, bpDias: 76, hr: 66, sleep: 6.1, steps: 7850 },
  { label: 'W3均值', bpSys: 119, bpDias: 78, hr: 68, sleep: 5.9, steps: 8050 },
  { label: 'W4均值', bpSys: 116, bpDias: 75, hr: 65, sleep: 6.4, steps: 8300 },
] as const;

export const DATA_90D = [
  { label: '3月前', bpSys: 114, bpDias: 73, hr: 63, sleep: 6.8, steps: 8210 },
  { label: '2月前', bpSys: 116, bpDias: 75, hr: 65, sleep: 6.4, steps: 7950 },
  { label: '1月前', bpSys: 118, bpDias: 77, hr: 67, sleep: 6.0, steps: 8020 },
  { label: '本月均', bpSys: 117, bpDias: 76, hr: 65, sleep: 6.3, steps: 8130 },
] as const;

export interface AggregatedSummary {
  windowLabel: string;
  bp: string;
  bpFluc: string;
  sleep: string;
  steps: string;
  hr: string;
  notes: string;
}

export function getAggregatedSummary(window: TimeWindow): AggregatedSummary {
  switch (window) {
    case '7d':
      return {
        windowLabel: '过去 7 天 (最新状态)',
        bp: '117/76 mmHg',
        bpFluc: '波动量 ±7 mmHg',
        sleep: '6.3 小时/天',
        steps: '8,214 步/天',
        hr: '65 bpm',
        notes: '近期血压曲线轻微抬升，但仍符合平稳标准区间；因熬夜增多导致睡眠时长有所下滑。',
      };
    case '30d':
      return {
        windowLabel: '过去 30 天 (中周期观测)',
        bp: '116/75 mmHg',
        bpFluc: '月度波动 ±9 mmHg',
        sleep: '6.2 小时/天',
        steps: '8,080 步/天',
        hr: '65 bpm',
        notes: '中周期数据稳定。工作日呈现出与休息日明显的步数不一致。静息心率控制优于极度窦缓期。',
      };
    case '90d':
      return {
        windowLabel: '过去 90 天 (长季报追踪)',
        bp: '116/75 mmHg',
        bpFluc: '季度波动 ±12 mmHg',
        sleep: '6.3 小时/天',
        steps: '8,077 步/天',
        hr: '65 bpm',
        notes: '长达一季度的日常连续追踪。整体趋势均衡，舒张压较历史基线（58-60 mmHg）有所上升。',
      };
    case '4y':
      return {
        windowLabel: '2021 - 2025 年鉴纵向轨迹',
        bp: '95/58 → 118/76 mmHg',
        bpFluc: '4年纵向上移',
        sleep: '不合适 (无长期连续监测)',
        steps: '均值 ~8,100 步/天',
        hr: '52 → 66 bpm (已摆脱严重窦缓状态)',
        notes: '4年体检连续对比显示：在26岁BMI极优(22.76)时坏胆固醇即高达5.04。这提示代谢存在深层结构性偏差。',
      };
  }
}
