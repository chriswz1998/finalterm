import type { KnowledgeChunk } from '@/src/data/knowledge/types';

export const L3_RISK_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'l3:lipid_persistent:v1',
    layer: 'L3',
    ruleIds: ['ldl_persistent', 'ldl_critical'],
    title: '血脂长期异常模式',
    body: '多次体检 LDL-C 持续高于理想范围，提示存在长期血脂管理需求。若伴随正常或偏低 TG、年轻时期即升高，需与医生讨论是否存在结构性/家族性因素，而非仅归因于短期饮食。',
    relatedIndicators: ['ldl_c', 'total_chol', 'hdl_c', 'triglycerides'],
    suggestedAction: '复诊讨论项：完整四代血脂记录、是否需要进一步血脂分型评估。',
    source: {
      name: '中国心血管病一级预防指南（公开摘要）',
      evidenceLevel: 'A2',
      version: '2020',
    },
  },
  {
    id: 'l3:metabolic_trend:v1',
    layer: 'L3',
    ruleIds: ['bmi_overweight', 'glucose_trend'],
    title: '代谢负荷抬升信号',
    body: 'BMI 超重叠加空腹血糖抬升，可能提示代谢综合征风险增加。这属于「风险提示」，不是疾病诊断。',
    relatedIndicators: ['bmi', 'fasting_glucose', 'triglycerides', 'ldl_c'],
    suggestedAction: '关注体重管理、规律运动、限盐控糖，并按医嘱复查。',
    source: {
      name: '健康中国行动（2019—2030）',
      evidenceLevel: 'A1',
      version: '2019',
    },
  },
  {
    id: 'l3:fh_pattern_hint:v1',
    layer: 'L3',
    ruleIds: ['fh_pattern_hint'],
    title: '低 BMI + 高 LDL 组合模式',
    body: '在体重理想甚至偏低时仍出现显著 LDL-C 升高，且 TG 正常，是需与医生讨论是否存在家族性高胆固醇血症（FH）等结构性因素的线索之一。',
    relatedIndicators: ['ldl_c', 'bmi', 'triglycerides'],
    suggestedAction: '携带 2021 基线及后续全部血脂记录复诊，讨论是否需要专科评估。',
    forbidden: ['不得确诊 FH'],
    source: {
      name: '家族性高胆固醇血症筛查共识（公开摘要）',
      evidenceLevel: 'B',
      version: '2021',
    },
  },
];
