import type { KnowledgeChunk } from '@/src/data/knowledge/types';

const internal = {
  sourceId: 'src:health-link-internal:1',
  name: '企业医疗安全规则',
  evidenceLevel: 'E' as const,
  version: '1.0',
};

export const L5_CARE_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'l5:S0:v1',
    layer: 'L5',
    careLevel: 'S0',
    title: 'S0 · 日常维护',
    body: '未见明显异常或仅信息性提示。保持健康生活方式，按常规周期体检即可。',
    source: internal,
  },
  {
    id: 'l5:S1:v1',
    layer: 'L5',
    careLevel: 'S1',
    ruleIds: ['alt_spike_resolved'],
    title: 'S1 · 生活方式干预 + 定期复查',
    body: '轻度异常、常见可逆因素明显。建议 1–3 个月内按报告或医嘱复查，同时调整作息与饮食。',
    source: internal,
  },
  {
    id: 'l5:S2:v1',
    layer: 'L5',
    careLevel: 'S2',
    ruleIds: ['ldl_persistent', 'bmi_overweight', 'glucose_trend', 'import_abnormal_detected'],
    title: 'S2 · 普通门诊咨询',
    body: '指标持续异常或多项相关指标异常。建议预约全科/内科或相关专科门诊，携带完整体检历史。',
    source: internal,
  },
  {
    id: 'l5:S3:v1',
    layer: 'L5',
    careLevel: 'S3',
    ruleIds: ['ldl_critical', 'alt_elevated', 'creatinine_high'],
    title: 'S3 · 尽快就医',
    body: '明显异常或疑似器官功能受损。建议近期尽快就医，由医生结合病史与检查综合判断。',
    source: internal,
  },
  {
    id: 'l5:S4:v1',
    layer: 'L5',
    careLevel: 'S4',
    ruleIds: [
      'emergency_bp_crisis',
      'emergency_glucose_severe',
      'emergency_alt_severe',
      'emergency_egfr_severe',
      'emergency_report_critical',
    ],
    title: 'S4 · 急诊 / 立即就医',
    body: '检出危急值或接近急诊阈值。若伴有胸痛、气促、意识改变、严重腹痛等不适，请立即拨打 120 或前往急诊；即使暂无症状，也应在最短时间内由医生当面评估，本应用不能替代急诊处置。',
    forbidden: ['不得延误就医', '不得保证安全', '不得在线处置危急值'],
    source: internal,
  },
];
