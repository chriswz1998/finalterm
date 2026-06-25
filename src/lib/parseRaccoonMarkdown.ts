/** 从小浣熊 Markdown 文本中提取可卡片化展示的要点 */

import { extractMarkdownTables, type ParsedMarkdownTable } from '@/src/lib/parseMarkdownTables';

export type InsightKind = 'general' | 'trend' | 'abnormal' | 'question';

export interface ParsedInsight {
  kind: InsightKind;
  text: string;
}

export interface ParsedRaccoonAnalysis {
  /** 用于 ReactMarkdown 的完整正文（表格已抽离为图表） */
  bodyMarkdown: string;
  /** 顶部要点卡片 */
  insights: ParsedInsight[];
  /** 可图表化的 Markdown 表格 */
  tables: ParsedMarkdownTable[];
}

const BULLET_RE = /^[-*•]\s+|^\d+[.)]\s+/;

function stripBullet(line: string): string {
  return line
    .replace(BULLET_RE, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .trim();
}

function classifyBullet(text: string): InsightKind {
  if (/趋势|变化|升高|降低|改善|恶化|对比|同比|环比|走向|波动/.test(text)) return 'trend';
  if (/异常|偏高|偏低|超标|↑|↓|危急|阳性|阴性|不正常/.test(text)) return 'abnormal';
  if (/建议|问医生|复诊|提问|关注|复查/.test(text)) return 'question';
  return 'general';
}

/** 去掉已被卡片化的纯 bullet 段落，保留标题与段落供 Markdown 渲染 */
function bodyWithoutDuplicateBullets(markdown: string, insightTexts: Set<string>): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let skipBulletRun = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (BULLET_RE.test(line)) {
      const text = stripBullet(line);
      if (insightTexts.has(text)) {
        skipBulletRun = true;
        continue;
      }
    } else if (line === '') {
      if (skipBulletRun) {
        skipBulletRun = false;
        continue;
      }
    } else {
      skipBulletRun = false;
    }
    out.push(raw);
  }

  return out.join('\n').trim();
}

export function parseRaccoonMarkdown(
  markdown: string,
  extraBullets: string[] = [],
): ParsedRaccoonAnalysis {
  const seen = new Set<string>();
  const insights: ParsedInsight[] = [];

  const allLines = markdown.split('\n');
  for (const raw of allLines) {
    const line = raw.trim();
    if (!BULLET_RE.test(line)) continue;
    const text = stripBullet(line);
    if (!text || text.length < 4 || seen.has(text)) continue;
    seen.add(text);
    insights.push({ kind: classifyBullet(text), text });
  }

  for (const b of extraBullets) {
    const text = b.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    insights.push({ kind: classifyBullet(text), text });
  }

  const bodyMarkdown = bodyWithoutDuplicateBullets(markdown, seen);
  const { tables, markdownWithoutTables } = extractMarkdownTables(bodyMarkdown || markdown);

  return {
    bodyMarkdown: markdownWithoutTables || bodyMarkdown || markdown,
    insights: insights.slice(0, 8),
    tables,
  };
}

export const INSIGHT_KIND_LABEL: Record<InsightKind, string> = {
  general: '要点',
  trend: '趋势',
  abnormal: '异常',
  question: '建议',
};

export const INSIGHT_KIND_STYLE: Record<
  InsightKind,
  { border: string; bg: string; text: string; dot: string }
> = {
  general: {
    border: 'border-neutral-200',
    bg: 'bg-neutral-50',
    text: 'text-neutral-800',
    dot: 'bg-neutral-600',
  },
  trend: {
    border: 'border-sky-200',
    bg: 'bg-sky-50',
    text: 'text-sky-950',
    dot: 'bg-sky-600',
  },
  abnormal: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-950',
    dot: 'bg-amber-700',
  },
  question: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-950',
    dot: 'bg-emerald-700',
  },
};
