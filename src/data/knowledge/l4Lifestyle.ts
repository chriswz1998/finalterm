import type { KnowledgeChunk } from '@/src/data/knowledge/types';

export const L4_LIFESTYLE_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'l4:dyslipidemia:v1',
    layer: 'L4',
    canonicalIds: ['ldl_c', 'total_chol', 'triglycerides'],
    title: '血脂异常 — 生活方式建议',
    body: '减少饱和脂肪与反式脂肪，增加膳食纤维（燕麦、豆类、蔬菜），每周至少 150 分钟中等强度运动。不替代个体化营养或药物处方。',
    suggestedAction: '用全谷物替代部分精白米面；每日快走 25–30 分钟。',
    source: {
      name: '中国居民膳食指南（2022）',
      evidenceLevel: 'A1',
      version: '2022',
    },
  },
  {
    id: 'l4:liver_load:v1',
    layer: 'L4',
    canonicalIds: ['alt', 'ast'],
    title: '肝酶偏高 — 生活方式建议',
    body: '保证充足睡眠，避免饮酒与非必要肝毒性药物，减少连续熬夜。多数一过性 ALT 升高可在作息改善后回落。',
    suggestedAction: '连续 7–14 天规律作息后复查肝功能。',
    source: {
      name: '健康中国行动',
      evidenceLevel: 'A1',
      version: '2019',
    },
  },
  {
    id: 'l4:weight_management:v1',
    layer: 'L4',
    canonicalIds: ['bmi'],
    title: '超重 — 体重管理建议',
    body: '设定可执行的微目标：减少含糖饮料、增加日常步数、固定睡眠时段。避免极端节食导致反弹。',
    suggestedAction: '每日 8000 步或同等活动量；晚餐减少精制碳水。',
    source: {
      name: '中国居民膳食指南（2022）',
      evidenceLevel: 'A1',
      version: '2022',
    },
  },
  {
    id: 'l4:ldl:exercise_context:v1',
    layer: 'L4',
    canonicalIds: ['ldl_c'],
    ruleIds: ['ldl_exercise_inverse', 'resting_hr_fitness'],
    title: 'LDL 与运动/心率 — 行为背景说明',
    body: '规律中等强度运动与静息心率下降，常被视为心血管健康的积极信号。体检 LDL 偏高时，可对照近期运动与睡眠记录，与医生讨论生活方式调整；不得自行停药或替代药物治疗。',
    suggestedAction: '记录近 90 天运动与睡眠，复诊时携带 Apple Health 摘要。',
    source: {
      name: '中国居民膳食指南（2022）',
      evidenceLevel: 'A1',
      version: '2022',
    },
  },
  {
    id: 'l4:alt:sleep_context:v1',
    layer: 'L4',
    canonicalIds: ['alt'],
    ruleIds: ['alt_sleep_stress'],
    title: 'ALT 与睡眠/压力 — 行为背景说明',
    body: '睡眠不足、连续熬夜或短期压力，可能与一过性肝酶升高有关。建议结合近期作息记录，在医生指导下复查；不得自行判断为严重肝病。',
    suggestedAction: '保证 7–8 小时睡眠，减少连续熬夜后 2–4 周复查肝功能。',
    source: {
      name: '健康中国行动',
      evidenceLevel: 'A1',
      version: '2019',
    },
  },
  {
    id: 'l4:behavior_window:v1',
    layer: 'L4',
    ruleIds: ['behavior_window_before_exam', 'sleep_recent_low'],
    title: '行为偏移窗口 — 如何理解',
    body: '可穿戴设备检测到的睡眠、运动等多维度短期偏移，可作为复诊时的背景信息，帮助医生了解「体检前后你过得怎样」。这不等于疾病原因，仅作沟通素材。',
    suggestedAction: '导出近 90 天睡眠与运动摘要，就诊时出示。',
    source: {
      name: 'Health Linker 产品规范',
      evidenceLevel: 'C',
      version: '1.0',
    },
  },
];
