export enum MetricType {
  ACTIONABLE = 'actionable',
  STATIC = 'static',
  SYSTEM = 'system',
}

export interface MetricDefinition {
  id: string;
  name: string;
  category: string;
  type: MetricType;
  description: string;
  interventions?: string[];
  unit?: string;
}

export const HEALTH_METRICS: MetricDefinition[] = [
  // Actionable
  {
    id: 'ldl_c',
    name: '低密度脂蛋白胆固醇 (LDL-C)',
    category: '脂质代谢',
    type: MetricType.ACTIONABLE,
    description: '血管里的“垃圾运输车”。您的数据在 3.7-5.0 之间波动，受饮食习惯和运动量高度影响。',
    interventions: ['低饱和脂肪饮食', '增加膳食纤维', '减少高胆固醇食物'],
    unit: 'mmol/L',
  },
  {
    id: 'bmi',
    name: '体重指数 (BMI)',
    category: '体成分',
    type: MetricType.ACTIONABLE,
    description: '反映能量摄入与消耗的平衡。24.0 以上为超重。自 2021 年起呈现上升趋势。',
    interventions: ['减重管理', '力量训练', '低盐饮食'],
  },
  {
    id: 'alt',
    name: '谷丙转氨酶 (ALT)',
    category: '肝功能',
    type: MetricType.ACTIONABLE,
    description: '肝脏细胞健康指标。您的 ALT 曾有轻度升高 (51.1)，目前已恢复正常区间。',
    interventions: ['睡眠保障', '减少酒精摄入', '均衡膳食'],
    unit: 'U/L',
  },
  
  // Static
  {
    id: 'gallbladder_polyps',
    name: '胆囊息肉样病变',
    category: '超声',
    type: MetricType.STATIC,
    description: '形态性改变，属于静态监测资产，重点在于年度复查观察其大小，而非日常行为干预。',
  },
  {
    id: 'bradycardia',
    name: '窦性心动过缓',
    category: '心电图',
    type: MetricType.STATIC,
    description: '若无胸闷气促，通常为健康的生理表现（如运动员心律）。系统将其标记为稳定基准资产。',
  },
];
