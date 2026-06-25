/** L1 — WS/T & common lab fallback reference ranges (report sheet takes priority). */
export interface L1ReferenceRange {
  canonicalId: string;
  standardName: string;
  /** Human-readable range label */
  rangeLabel: string;
  unit: string;
  sourceId: string;
  note?: string;
}

export const L1_REFERENCE_RANGES: L1ReferenceRange[] = [
  { canonicalId: 'ldl_c', standardName: 'LDL-C', rangeLabel: '<3.37', unit: 'mmol/L', sourceId: 'src:china-lipid-guideline:2023' },
  { canonicalId: 'hdl_c', standardName: 'HDL-C', rangeLabel: '≥1.0', unit: 'mmol/L', sourceId: 'src:china-lipid-guideline:2023' },
  { canonicalId: 'total_chol', standardName: '总胆固醇', rangeLabel: '<5.2', unit: 'mmol/L', sourceId: 'src:china-lipid-guideline:2023' },
  { canonicalId: 'triglycerides', standardName: '甘油三酯', rangeLabel: '<1.7', unit: 'mmol/L', sourceId: 'src:china-lipid-guideline:2023' },
  { canonicalId: 'fasting_glucose', standardName: '空腹血糖', rangeLabel: '3.9～6.1', unit: 'mmol/L', sourceId: 'src:wst-404:2012' },
  { canonicalId: 'hba1c', standardName: 'HbA1c', rangeLabel: '4.0～6.0', unit: '%', sourceId: 'src:china-diabetes-guideline:2020' },
  { canonicalId: 'alt', standardName: 'ALT', rangeLabel: '7～40', unit: 'U/L', sourceId: 'src:wst-404:2012' },
  { canonicalId: 'ast', standardName: 'AST', rangeLabel: '13～35', unit: 'U/L', sourceId: 'src:wst-404:2012' },
  { canonicalId: 'creatinine', standardName: '肌酐', rangeLabel: '57～111', unit: 'μmol/L', sourceId: 'src:wst-404:2012', note: '受性别/肌肉量影响，以报告单为准' },
  { canonicalId: 'egfr', standardName: 'eGFR', rangeLabel: '≥90', unit: 'mL/(min·1.73m²)', sourceId: 'src:ckd-screening-consensus:2021' },
  { canonicalId: 'uric_acid', standardName: '尿酸', rangeLabel: '208～428', unit: 'μmol/L', sourceId: 'src:wst-404:2012', note: '性别差异大，以报告单为准' },
  { canonicalId: 'bp_systolic', standardName: '收缩压', rangeLabel: '<120', unit: 'mmHg', sourceId: 'src:hypertension-guideline:2023' },
  { canonicalId: 'bmi', standardName: 'BMI', rangeLabel: '18.5～23.9', unit: '', sourceId: 'src:china-dietary-guideline:2022' },
  { canonicalId: 'hemoglobin', standardName: '血红蛋白', rangeLabel: '115～150', unit: 'g/L', sourceId: 'src:wst-405:2012', note: '性别差异大，以报告单为准' },
  { canonicalId: 'wbc', standardName: '白细胞', rangeLabel: '3.5～9.5', unit: '×10⁹/L', sourceId: 'src:wst-405:2012' },
  { canonicalId: 'tsh', standardName: 'TSH', rangeLabel: '0.27～4.2', unit: 'mIU/L', sourceId: 'src:thyroid-guideline:2017' },
  { canonicalId: 'urine_protein', standardName: '尿蛋白', rangeLabel: '阴性', unit: '', sourceId: 'src:wst-404:2012' },
  { canonicalId: 'urine_blood', standardName: '尿潜血', rangeLabel: '阴性', unit: '', sourceId: 'src:wst-404:2012' },
];

export const L1_BY_CANONICAL = new Map(L1_REFERENCE_RANGES.map((r) => [r.canonicalId, r]));
