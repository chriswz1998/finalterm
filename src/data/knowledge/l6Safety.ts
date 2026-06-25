import type { KnowledgeChunk } from '@/src/data/knowledge/types';

export const L6_DISCLAIMER =
  '本解读仅供健康管理参考，不能替代医生面诊、诊断或治疗。异常结果需结合症状、既往病史、用药与复查综合判断。如有不适请及时就医。';

export const L6_SAFETY_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'l6:disclaimer:v1',
    layer: 'L6',
    title: '标准免责声明',
    body: L6_DISCLAIMER,
    forbidden: ['诊断', '处方', '停药', '保证无疾病'],
    source: { sourceId: 'src:health-link-l6:1', name: 'Health Link L6 策略库', evidenceLevel: 'E', version: '1.0' },
  },
  {
    id: 'l6:refusal:diagnosis:v1',
    layer: 'L6',
    title: '拒答：诊断性表述',
    body: '不得输出「你患有某病」「确诊为」「必须服用某药」等诊断或处方性结论。应使用「可能与…有关」「建议进一步评估」「请由医生判断」等表述。',
    forbidden: ['你患有', '确诊为', '必须服用', '建议停药', '可以排除'],
    source: { sourceId: 'src:health-link-l6:1', name: 'Health Link L6 策略库', evidenceLevel: 'E', version: '1.0' },
  },
];
