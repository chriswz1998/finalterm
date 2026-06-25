import type { KnowledgeSource } from '@/src/data/knowledge/types';

/** L0 — source & evidence metadata registry (audit / traceability). */
export interface L0SourceRecord {
  id: string;
  name: string;
  publisher: string;
  publishedAt?: string;
  version: string;
  evidenceLevel: KnowledgeSource['evidenceLevel'];
  url?: string;
  scope?: string;
  licenseNote?: string;
  updatedAt: string;
}

export const L0_SOURCES: L0SourceRecord[] = [
  {
    id: 'src:china-lipid-guideline:2023',
    name: '中国血脂管理指南',
    publisher: '中华医学会',
    publishedAt: '2023',
    version: '2023',
    evidenceLevel: 'A2',
    url: 'https://www.chinacdc.cn/',
    scope: '成人血脂异常',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:china-diabetes-guideline:2020',
    name: '中国 2 型糖尿病防治指南',
    publisher: '中华医学会糖尿病学分会',
    publishedAt: '2020',
    version: '2020',
    evidenceLevel: 'A2',
    url: 'https://www.cds.org.cn/',
    scope: '成人糖代谢',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:china-dietary-guideline:2022',
    name: '中国居民膳食指南',
    publisher: '中国营养学会',
    publishedAt: '2022',
    version: '2022',
    evidenceLevel: 'A1',
    url: 'https://www.cnsoc.org/',
    scope: '一般成人',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:ckd-screening-consensus:2021',
    name: '慢性肾脏病筛查共识',
    publisher: '中华医学会肾脏病学分会',
    version: '2021',
    evidenceLevel: 'B',
    scope: '成人肾功能',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:liver-lab-consensus:2022',
    name: '肝病检验医学共识',
    publisher: '中华医学会检验医学分会',
    version: '2022',
    evidenceLevel: 'B',
    scope: '肝酶异常',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:hypertension-guideline:2023',
    name: '中国高血压防治指南',
    publisher: '中华医学会心血管病学分会',
    version: '2023',
    evidenceLevel: 'A2',
    url: 'https://www.csc.org.cn/',
    scope: '成人血压',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:gout-hyperuricemia:2020',
    name: '高尿酸血症和痛风诊疗中国专家共识',
    publisher: '中华医学会内分泌学分会',
    version: '2020',
    evidenceLevel: 'B',
    scope: '成人尿酸',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:thyroid-guideline:2017',
    name: '中国甲状腺功能异常诊治指南',
    publisher: '中华医学会内分泌学分会',
    version: '2017',
    evidenceLevel: 'A2',
    scope: '成人甲功',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:wst-404:2012',
    name: 'WS/T 404-2012 临床常用生化检验项目参考区间',
    publisher: '国家卫生健康委员会',
    publishedAt: '2012',
    version: '2012',
    evidenceLevel: 'A1',
    url: 'https://www.nhc.gov.cn/',
    scope: '成人生化检验兜底参考区间',
    licenseNote: '行业标准公开摘要，以报告单与实验室方法学为准',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:wst-405:2012',
    name: 'WS/T 405-2012 血细胞分析参考区间',
    publisher: '国家卫生健康委员会',
    publishedAt: '2012',
    version: '2012',
    evidenceLevel: 'A1',
    url: 'https://www.nhc.gov.cn/',
    scope: '成人血常规兜底参考区间',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:health-link-internal:1',
    name: 'Health Link 企业医疗安全规则',
    publisher: 'Health Link',
    version: '1.0',
    evidenceLevel: 'E',
    scope: '照护分级与安全边界',
    updatedAt: '2025-06-09',
  },
  {
    id: 'src:health-link-l6:1',
    name: 'Health Link L6 策略库',
    publisher: 'Health Link',
    version: '1.0',
    evidenceLevel: 'E',
    scope: '输出合规与拒答策略',
    updatedAt: '2025-06-09',
  },
];

export const L0_BY_ID = new Map(L0_SOURCES.map((s) => [s.id, s]));

export function resolveSourceUrl(source: KnowledgeSource): string | undefined {
  if (source.url) return source.url;
  if (source.sourceId) return L0_BY_ID.get(source.sourceId)?.url;
  return undefined;
}

export function resolveSourceMeta(source: KnowledgeSource): L0SourceRecord | undefined {
  if (source.sourceId) return L0_BY_ID.get(source.sourceId);
  return L0_SOURCES.find((s) => s.name === source.name && s.version === source.version);
}
