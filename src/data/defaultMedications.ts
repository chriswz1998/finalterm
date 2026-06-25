export interface MedicationItem {
  id: string;
  name: string;
  dose: string;
  purpose: string;
  checked: boolean;
}

export const DEFAULT_MEDICATIONS: MedicationItem[] = [
  { id: '1', name: '大蒜素油补剂 (Allicin)', dose: '200mg QD', purpose: '代谢与血循环辅助', checked: true },
  { id: '2', name: '可溶性膳食纤维', dose: '10g 随晚餐', purpose: '辅助调节肠结合脂质排空', checked: true },
  { id: '3', name: '规律早饭干预 (燕麦/全麦)', dose: '每日餐标一次', purpose: '促进胆汁排出，稳定胆囊息肉变', checked: true },
  { id: '4', name: '阿托伐他汀钙片 (根据医嘱备选)', dose: '10mg QD', purpose: '血脂代谢调理 (待与医生确认)', checked: false },
];

export const DEFAULT_USER_REMARKS =
  '最近两周因网络技术项目交付，工作节奏偏快、较为忙碌。睡眠质量略有下滑，常感疲惫。本次面诊计划主要向医生呈送4年跨度下的LDL-C血脂变动形态，以讨论是否存在家族性高胆固醇血症（FH）倾向。';
