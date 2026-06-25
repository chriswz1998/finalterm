import type { Observation } from '@/src/types/observation';
import type { TrendPoint } from '@/src/data/examDataset';
import type { UserExamImport } from '@/src/lib/healthArchive';

export type RedFlagSeverity = 'critical' | 'high' | 'moderate' | 'info';

export interface RedFlagHit {
  ruleId: string;
  severity: RedFlagSeverity;
  title: string;
  message: string;
  relatedIndicators: string[];
  discussionPrompt?: string;
}

export interface RuleContext {
  latest: Partial<Record<string, Observation>>;
  trends: TrendPoint[];
  allDates: string[];
  latestImport?: UserExamImport | null;
}

function ctxLatestNumeric(ctx: RuleContext, id: string): number | null {
  return ctx.latest[id]?.numericValue ?? null;
}

function ctxTrendValues(ctx: RuleContext, id: keyof TrendPoint): number[] {
  return ctx.trends.map((t) => t[id] as number | null).filter((v): v is number => v != null);
}

export function buildRuleContext(
  observationsByDate: Record<string, Observation[]>,
  examDates: string[],
  trendData: TrendPoint[],
  latestImport?: UserExamImport | null,
): RuleContext {
  const latest: Partial<Record<string, Observation>> = {};
  const seen = new Set<string>();

  for (let i = examDates.length - 1; i >= 0; i--) {
    const date = examDates[i];
    for (const obs of observationsByDate[date] ?? []) {
      if (obs.canonicalId && obs.numericValue != null && !seen.has(obs.canonicalId)) {
        latest[obs.canonicalId] = obs;
        seen.add(obs.canonicalId);
      }
    }
  }

  return {
    latest,
    trends: trendData,
    allDates: examDates,
    latestImport: latestImport ?? null,
  };
}

export const RED_FLAG_RULES: Array<{
  id: string;
  severity: RedFlagSeverity;
  evaluate: (ctx: RuleContext) => RedFlagHit | null;
}> = [
  {
    id: 'import_abnormal_detected',
    severity: 'high',
    evaluate: (ctx) => {
      const imp = ctx.latestImport;
      if (!imp) return null;
      const abnormal = imp.observations.filter((o) => o.abnormalFlag != null);
      if (abnormal.length === 0) return null;
      return {
        ruleId: 'import_abnormal_detected',
        severity: 'high',
        title: `新导入报告检出 ${abnormal.length} 项异常`,
        message: abnormal
          .map((o) => `${o.standardName} ${o.value}${o.unit ? ` ${o.unit}` : ''}`)
          .join('；'),
        relatedIndicators: abnormal.map((o) => o.canonicalId).filter(Boolean) as string[],
        discussionPrompt: '携带本次 PDF 提取结果与历史档案一并复诊。',
      };
    },
  },
  {
    id: 'ldl_critical',
    severity: 'critical',
    evaluate: (ctx) => {
      const ldl = ctxLatestNumeric(ctx, 'ldl_c');
      if (ldl == null || ldl < 4.14) return null;
      return {
        ruleId: 'ldl_critical',
        severity: 'critical',
        title: 'LDL-C 显著升高',
        message: `最新 LDL-C ${ldl} mmol/L，高于常见理想上限（≥4.14 mmol/L）。`,
        relatedIndicators: ['ldl_c'],
        discussionPrompt: '与医生讨论是否需要进一步血脂评估或干预方案。',
      };
    },
  },
  {
    id: 'ldl_persistent',
    severity: 'high',
    evaluate: (ctx) => {
      const ldlSeries = ctxTrendValues(ctx, 'ldl');
      if (ldlSeries.length < 2) return null;
      const allAboveIdeal = ldlSeries.every((v) => v >= 3.37);
      const latest = ldlSeries[ldlSeries.length - 1];
      if (!allAboveIdeal || latest == null) return null;
      return {
        ruleId: 'ldl_persistent',
        severity: 'high',
        title: 'LDL-C 长期高于理想范围',
        message: `${ldlSeries.length} 次体检 LDL-C 均 ≥3.37 mmol/L（最新 ${latest}）。`,
        relatedIndicators: ['ldl_c', 'total_chol'],
        discussionPrompt: '讨论是否存在家族性高胆固醇血症（FH）等结构性因素。',
      };
    },
  },
  {
    id: 'fh_pattern_hint',
    severity: 'moderate',
    evaluate: (ctx) => {
      const first = ctx.trends[0];
      if (!first?.ldl || !first.bmi || !first.tg) return null;
      if (first.ldl >= 4.5 && first.bmi < 23 && first.tg < 1.7) {
        return {
          ruleId: 'fh_pattern_hint',
          severity: 'moderate',
          title: '低 BMI + 高 LDL 模式',
          message: `基线：BMI ${first.bmi}（理想）但 LDL ${first.ldl} mmol/L，TG 正常。`,
          relatedIndicators: ['ldl_c', 'bmi', 'triglycerides'],
          discussionPrompt: 'FH 疑似模式——建议复诊时携带完整血脂记录。',
        };
      }
      return null;
    },
  },
  {
    id: 'alt_elevated',
    severity: 'high',
    evaluate: (ctx) => {
      const alt = ctxLatestNumeric(ctx, 'alt');
      if (alt == null || alt <= 40) return null;
      return {
        ruleId: 'alt_elevated',
        severity: 'high',
        title: 'ALT 超出参考上限',
        message: `ALT ${alt} U/L（参考通常 ≤40 U/L）。`,
        relatedIndicators: ['alt'],
        discussionPrompt: '排查近期作息、药物或肝脏负荷因素。',
      };
    },
  },
  {
    id: 'alt_spike_resolved',
    severity: 'info',
    evaluate: (ctx) => {
      const alts = ctxTrendValues(ctx, 'alt');
      if (alts.length === 0) return null;
      const peak = Math.max(...alts);
      const latest = ctxLatestNumeric(ctx, 'alt');
      if (peak <= 40 || latest == null || latest > 40) return null;
      if (peak >= 50) {
        return {
          ruleId: 'alt_spike_resolved',
          severity: 'info',
          title: 'ALT 一过性升高已回落',
          message: `历史峰值 ${peak} U/L，最新 ${latest} U/L 已回归正常。`,
          relatedIndicators: ['alt'],
        };
      }
      return null;
    },
  },
  {
    id: 'bmi_overweight',
    severity: 'moderate',
    evaluate: (ctx) => {
      const bmi = ctxLatestNumeric(ctx, 'bmi');
      if (bmi == null || bmi < 24) return null;
      const series = ctxTrendValues(ctx, 'bmi');
      const rising = series.length >= 2 && series[series.length - 1] > series[0];
      return {
        ruleId: 'bmi_overweight',
        severity: 'moderate',
        title: 'BMI 进入超重区间',
        message: `最新 BMI ${bmi}${rising ? '，呈上升趋势。' : '。'}`,
        relatedIndicators: ['bmi'],
      };
    },
  },
  {
    id: 'glucose_trend',
    severity: 'moderate',
    evaluate: (ctx) => {
      const glucoseSeries = ctxTrendValues(ctx, 'glucose');
      if (glucoseSeries.length < 2) return null;
      const latest = glucoseSeries[glucoseSeries.length - 1];
      const prev = glucoseSeries[glucoseSeries.length - 2];
      if (latest == null || latest < 5.0) return null;
      if (latest - prev >= 0.5 || latest >= 5.6) {
        return {
          ruleId: 'glucose_trend',
          severity: 'moderate',
          title: '空腹血糖抬升',
          message: `空腹血糖 ${latest} mmol/L（前次 ${prev}）。`,
          relatedIndicators: ['fasting_glucose'],
          discussionPrompt: '关注代谢综合征风险，必要时复查空腹血糖/HbA1c。',
        };
      }
      return null;
    },
  },
  {
    id: 'creatinine_high',
    severity: 'moderate',
    evaluate: (ctx) => {
      const crea = ctxLatestNumeric(ctx, 'creatinine');
      if (crea == null || crea <= 73) return null;
      return {
        ruleId: 'creatinine_high',
        severity: 'high',
        title: '肌酐偏高',
        message: `肌酐 ${crea} μmol/L，高于报告参考上限。`,
        relatedIndicators: ['creatinine', 'egfr'],
        discussionPrompt: '结合 eGFR 与用药史评估肾功能。',
      };
    },
  },
  {
    id: 'egfr_decline',
    severity: 'moderate',
    evaluate: (ctx) => {
      const egfrSeries = ctxTrendValues(ctx, 'egfr');
      if (egfrSeries.length < 2) return null;
      const latest = egfrSeries[egfrSeries.length - 1];
      const peak = Math.max(...egfrSeries);
      if (latest == null || peak - latest < 10) return null;
      return {
        ruleId: 'egfr_decline',
        severity: 'moderate',
        title: 'eGFR 较峰值下降',
        message: `eGFR 从 ${peak} 降至 ${latest} mL/(min·1.73m²)。`,
        relatedIndicators: ['egfr', 'creatinine'],
      };
    },
  },
  {
    id: 'emergency_bp_crisis',
    severity: 'critical',
    evaluate: (ctx) => {
      const sbp = ctxLatestNumeric(ctx, 'bp_systolic');
      if (sbp == null || sbp < 180) return null;
      return {
        ruleId: 'emergency_bp_crisis',
        severity: 'critical',
        title: '收缩压达到高血压危象阈值',
        message: `收缩压 ${sbp} mmHg（≥180）。若伴头痛、胸痛、气促或视物模糊，请立即急诊。`,
        relatedIndicators: ['bp_systolic'],
        discussionPrompt: '即使暂无症状，也应在最短时间内由医生当面评估。',
      };
    },
  },
  {
    id: 'emergency_glucose_severe',
    severity: 'critical',
    evaluate: (ctx) => {
      const glu = ctxLatestNumeric(ctx, 'fasting_glucose');
      if (glu == null || glu < 16.7) return null;
      return {
        ruleId: 'emergency_glucose_severe',
        severity: 'critical',
        title: '空腹血糖显著升高',
        message: `空腹血糖 ${glu} mmol/L（≥16.7）。若伴多尿、口渴、意识改变，请立即急诊。`,
        relatedIndicators: ['fasting_glucose'],
      };
    },
  },
  {
    id: 'emergency_alt_severe',
    severity: 'critical',
    evaluate: (ctx) => {
      const alt = ctxLatestNumeric(ctx, 'alt');
      if (alt == null || alt < 200) return null;
      return {
        ruleId: 'emergency_alt_severe',
        severity: 'critical',
        title: 'ALT 重度升高',
        message: `ALT ${alt} U/L（≥200）。若伴黄疸、腹痛或乏力明显，请尽快急诊/专科评估。`,
        relatedIndicators: ['alt', 'ast'],
      };
    },
  },
  {
    id: 'emergency_egfr_severe',
    severity: 'critical',
    evaluate: (ctx) => {
      const egfr = ctxLatestNumeric(ctx, 'egfr');
      if (egfr == null || egfr >= 15) return null;
      return {
        ruleId: 'emergency_egfr_severe',
        severity: 'critical',
        title: 'eGFR 重度降低',
        message: `eGFR ${egfr} mL/(min·1.73m²)（<15）。需尽快肾内科/急诊评估。`,
        relatedIndicators: ['egfr', 'creatinine'],
      };
    },
  },
  {
    id: 'emergency_report_critical',
    severity: 'critical',
    evaluate: (ctx) => {
      const imp = ctx.latestImport;
      if (!imp) return null;
      const critical = imp.observations.filter((o) => o.abnormalFlag === 'critical');
      if (critical.length === 0) return null;
      return {
        ruleId: 'emergency_report_critical',
        severity: 'critical',
        title: `报告标记 ${critical.length} 项危急值`,
        message: critical
          .map((o) => `${o.standardName} ${o.value ?? ''}${o.unit ? ` ${o.unit}` : ''}`)
          .join('；'),
        relatedIndicators: critical.map((o) => o.canonicalId).filter(Boolean) as string[],
        discussionPrompt: '请立即就医或由医生当面解读危急值，勿仅依赖本应用。',
      };
    },
  },
];

export function evaluateRedFlags(ctx: RuleContext): RedFlagHit[] {
  return RED_FLAG_RULES.map((rule) => rule.evaluate(ctx)).filter((h): h is RedFlagHit => h != null);
}

export function topRedFlags(ctx: RuleContext, limit = 5): RedFlagHit[] {
  const order: RedFlagSeverity[] = ['critical', 'high', 'moderate', 'info'];
  return evaluateRedFlags(ctx)
    .sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
    .slice(0, limit);
}

// Baseline-only helpers for tests and static fallbacks
import { TREND_DATA, EXAM_DATES, OBSERVATIONS_BY_DATE } from '@/src/data/examDataset';

export const BASELINE_RULE_CONTEXT = buildRuleContext(
  OBSERVATIONS_BY_DATE,
  EXAM_DATES,
  TREND_DATA,
  null,
);

export function topBaselineRedFlags(limit = 5): RedFlagHit[] {
  return topRedFlags(BASELINE_RULE_CONTEXT, limit);
}
