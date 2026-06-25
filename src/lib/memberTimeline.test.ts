import { describe, expect, it } from 'vitest';
import type { TrendPoint } from '@/src/data/examDataset';
import { buildMemberTimelineView, buildTrendTableRows } from '@/src/lib/memberTimeline';

describe('memberTimeline', () => {
  it('builds empty view for member without imports', () => {
    const view = buildMemberTimelineView([], false, '张爸爸');
    expect(view.segments).toEqual([]);
    expect(view.overall.summary).toContain('张爸爸');
    expect(view.overall.summary).toContain('尚无');
  });

  it('uses demo narratives only when flagged', () => {
    const view = buildMemberTimelineView([], true, '陈春芸');
    expect(view.segments.length).toBe(4);
    expect(view.segments[0]?.id).toBe('2021');
  });

  it('builds table rows from trend data', () => {
    const trend: TrendPoint[] = [
      {
        year: '2026',
        reportDate: '2026-01-15',
        ldl: 3.2,
        chol: null,
        hdl: null,
        tg: null,
        bmi: 23.1,
        bp: null,
        glucose: null,
        egfr: null,
        alt: 22,
      },
    ];
    const rows = buildTrendTableRows(trend);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ldl).toBe('3.2');
  });
});
