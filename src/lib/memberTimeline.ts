import type { TrendPoint } from '@/src/data/examDataset';
import { OVERALL_NARRATIVE, TIMELINE_NARRATIVES } from '@/src/data/healthTrends';

export type TimelineSegmentId = 'overall' | string;

export interface MemberTimelineSegment {
  id: string;
  year: string;
  status: string;
  bmi: string;
  ldl: string;
  alt: string;
  summary: string;
  insight: string;
}

export interface MemberOverallNarrative {
  id: 'overall';
  title: string;
  subtitle: string;
  summary: string;
  insight: string;
}

export interface MemberTimelineView {
  segments: MemberTimelineSegment[];
  overall: MemberOverallNarrative;
  segmentIds: TimelineSegmentId[];
}

function fmtMetric(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(value);
}

export function buildTrendTableRows(trendData: TrendPoint[]) {
  return trendData.map((t) => ({
    year: t.year,
    weight: '—',
    bmi: fmtMetric(t.bmi),
    ldl: fmtMetric(t.ldl),
    alt: fmtMetric(t.alt),
    imaging: t.reportDate,
  }));
}

export function buildMemberTimelineView(
  trendData: TrendPoint[],
  useDemoNarratives: boolean,
  memberName: string,
): MemberTimelineView {
  if (useDemoNarratives) {
    return {
      segments: TIMELINE_NARRATIVES.map((node) => ({
        id: node.id,
        year: node.year,
        status: node.status,
        bmi: node.bmi,
        ldl: node.ldl,
        alt: node.alt,
        summary: node.summary,
        insight: node.insight,
      })),
      overall: {
        id: 'overall',
        title: OVERALL_NARRATIVE.title,
        subtitle: OVERALL_NARRATIVE.subtitle,
        summary: OVERALL_NARRATIVE.summary,
        insight: OVERALL_NARRATIVE.insight,
      },
      segmentIds: ['overall', ...TIMELINE_NARRATIVES.map((n) => n.id)],
    };
  }

  const segments: MemberTimelineSegment[] = trendData.map((t) => ({
    id: t.year,
    year: `${t.year}年`,
    status: '体检记录',
    bmi: fmtMetric(t.bmi),
    ldl: fmtMetric(t.ldl),
    alt: fmtMetric(t.alt),
    summary: `${t.reportDate}：LDL ${fmtMetric(t.ldl)} mmol/L · BMI ${fmtMetric(t.bmi)} · ALT ${fmtMetric(t.alt)} U/L`,
    insight: `该时点数据来自 ${memberName} 已导入的档案。可在「解读新报告」或「健康解读 Agent」中进一步 AI 解读。`,
  }));

  const latest = trendData[trendData.length - 1];
  const overall: MemberOverallNarrative = {
    id: 'overall',
    title: `${memberName} 档案概览`,
    subtitle: '基于已导入报告的纵向轨迹',
    summary:
      segments.length > 0
        ? `共 ${segments.length} 个体检时点；最近记录 ${latest?.reportDate ?? '—'}。`
        : `${memberName} 尚无体检档案，请先上传 PDF 或加载 Demo。`,
    insight:
      segments.length > 0
        ? '以下指标仅来自该成员自己的导入记录，与其他家庭成员数据隔离。'
        : '每位家庭成员拥有独立档案；切换成员后仪表盘与就诊卡会同步更新。',
  };

  return {
    segments,
    overall,
    segmentIds: ['overall', ...segments.map((s) => s.id)],
  };
}
