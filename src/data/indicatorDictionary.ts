export interface IndicatorDefinition {
  canonicalId: string;
  standardName: string;
  aliases: string[];
  loinc?: string;
  unit: string;
  category: 'lipid' | 'liver' | 'body' | 'glucose' | 'renal' | 'cbc' | 'other';
}

/** L1 indicator alias map — maps hospital report names to canonical ids. */
export const INDICATOR_DICTIONARY: IndicatorDefinition[] = [
  {
    canonicalId: 'ldl_c',
    standardName: 'LDL-C',
    aliases: ['LDL', 'LDL-C', '低密度脂蛋白', '低密度脂蛋白胆固醇', '低密度脂蛋白(LDL)'],
    loinc: '13457-7',
    unit: 'mmol/L',
    category: 'lipid',
  },
  {
    canonicalId: 'hdl_c',
    standardName: 'HDL-C',
    aliases: ['HDL', 'HDL-C', '高密度脂蛋白', '高密度脂蛋白胆固醇', '高密度脂蛋白(HDL)'],
    loinc: '2085-9',
    unit: 'mmol/L',
    category: 'lipid',
  },
  {
    canonicalId: 'total_chol',
    standardName: '总胆固醇',
    aliases: ['CHOL', 'TC', '总胆固醇(CHOL)'],
    loinc: '2093-3',
    unit: 'mmol/L',
    category: 'lipid',
  },
  {
    canonicalId: 'triglycerides',
    standardName: '甘油三酯',
    aliases: ['TG', '甘油三酯(TG)'],
    loinc: '2571-8',
    unit: 'mmol/L',
    category: 'lipid',
  },
  {
    canonicalId: 'alt',
    standardName: 'ALT',
    aliases: ['ALT', '丙氨酸氨基转移酶', '谷丙转氨酶', '丙氨酸氨基转移酶(ALT)'],
    loinc: '1742-6',
    unit: 'U/L',
    category: 'liver',
  },
  {
    canonicalId: 'ast',
    standardName: 'AST',
    aliases: ['AST', '天门冬氨酸氨基转移酶', '天门冬氨酸氨基转移酶(AST)'],
    loinc: '1920-8',
    unit: 'U/L',
    category: 'liver',
  },
  {
    canonicalId: 'bmi',
    standardName: 'BMI',
    aliases: ['BMI', '体重指数', '体重指数(kg/㎡)'],
    unit: '',
    category: 'body',
  },
  {
    canonicalId: 'fasting_glucose',
    standardName: '空腹血糖',
    aliases: ['Glu', 'GLU', '糖(Glu)', '葡萄糖', '空腹血糖', 'FPG'],
    loinc: '1558-6',
    unit: 'mmol/L',
    category: 'glucose',
  },
  {
    canonicalId: 'creatinine',
    standardName: '肌酐',
    aliases: ['Crea', '肌酐', '肌酐(Crea)'],
    loinc: '2160-0',
    unit: 'μmol/L',
    category: 'renal',
  },
  {
    canonicalId: 'egfr',
    standardName: 'eGFR',
    aliases: ['eGFR', '估计肾小球滤过率'],
    loinc: '33914-3',
    unit: 'mL/(min·1.73m²)',
    category: 'renal',
  },
  {
    canonicalId: 'uric_acid',
    standardName: '尿酸',
    aliases: ['UA', '尿酸', '尿酸(UA)'],
    loinc: '3084-1',
    unit: 'μmol/L',
    category: 'renal',
  },
  {
    canonicalId: 'bp_systolic',
    standardName: '收缩压',
    aliases: ['mmHg', '血压', '血压(mmHg)', '收缩压'],
    unit: 'mmHg',
    category: 'body',
  },
  {
    canonicalId: 'hemoglobin',
    standardName: '血红蛋白',
    aliases: ['Hb', 'HGB', '血红蛋白', '血红蛋白(Hb)'],
    loinc: '718-7',
    unit: 'g/L',
    category: 'cbc',
  },
  {
    canonicalId: 'wbc',
    standardName: '白细胞',
    aliases: ['WBC', '白细胞计数', '白细胞(WBC)'],
    loinc: '6690-2',
    unit: '×10⁹/L',
    category: 'cbc',
  },
  {
    canonicalId: 'urine_protein',
    standardName: '尿蛋白',
    aliases: ['尿蛋白', 'PRO', '尿蛋白(PRO)'],
    unit: '',
    category: 'other',
  },
  {
    canonicalId: 'urine_blood',
    standardName: '尿潜血',
    aliases: ['尿潜血', '尿红细胞', 'BLD', '尿潜血(BLD)'],
    unit: '',
    category: 'other',
  },
  {
    canonicalId: 'tsh',
    standardName: 'TSH',
    aliases: ['TSH', '促甲状腺激素', '促甲状腺激素(TSH)'],
    loinc: '3016-3',
    unit: 'mIU/L',
    category: 'other',
  },
  {
    canonicalId: 'hba1c',
    standardName: 'HbA1c',
    aliases: ['HbA1c', '糖化血红蛋白', '糖化血红蛋白(HbA1c)'],
    loinc: '4548-4',
    unit: '%',
    category: 'glucose',
  },
];

const aliasIndex = new Map<string, IndicatorDefinition>();

for (const def of INDICATOR_DICTIONARY) {
  aliasIndex.set(def.canonicalId, def);
  aliasIndex.set(def.standardName.toLowerCase(), def);
  for (const alias of def.aliases) {
    aliasIndex.set(alias.toLowerCase(), def);
  }
}

export function resolveIndicator(name: string): IndicatorDefinition | null {
  const key = name.trim().toLowerCase();
  return aliasIndex.get(key) ?? null;
}

export function resolveIndicatorByStandardCode(code: string): IndicatorDefinition | null {
  return aliasIndex.get(code.toLowerCase()) ?? aliasIndex.get(code) ?? null;
}
