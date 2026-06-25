import { sanitizeLlmHealthText, sanitizeStringFields } from '../src/lib/l6OutputFilter.ts';

export type AgentCitation = { chunkId: string; title: string; excerpt?: string };

export function filterCitations(raw: unknown, allowedIds: string[]): AgentCitation[] {
  if (!Array.isArray(raw) || allowedIds.length === 0) return [];
  const allowed = new Set(allowedIds);
  return raw
    .filter(
      (c): c is AgentCitation =>
        typeof c === 'object' &&
        c != null &&
        typeof (c as AgentCitation).chunkId === 'string' &&
        typeof (c as AgentCitation).title === 'string' &&
        allowed.has((c as AgentCitation).chunkId),
    )
    .map((c) => {
      const excerpt =
        typeof c.excerpt === 'string' ? sanitizeLlmHealthText(c.excerpt).text : undefined;
      return {
        chunkId: c.chunkId,
        title: sanitizeLlmHealthText(c.title).text,
        excerpt,
      };
    });
}

export function sanitizeSummaryPayload(data: Record<string, unknown>): Record<string, unknown> {
  const { value, filtered } = sanitizeStringFields(data, [
    'summary',
    'headline',
    'followUpHint',
    'familyExplanation',
    'title',
    'natureExplanation',
    'abnormalReason',
  ]);
  if (filtered) {
    value.l6Filtered = true;
  }
  return value;
}

export function sanitizeItemPayload(data: Record<string, unknown>): Record<string, unknown> {
  const { value, filtered } = sanitizeStringFields(data, [
    'plainExplanation',
    'whyAbnormal',
    'lifestyleTips',
  ]);
  if (filtered) {
    value.l6Filtered = true;
  }
  return value;
}

export function sanitizeChatReply(reply: string): { reply: string; l6Filtered: boolean } {
  const r = sanitizeLlmHealthText(reply);
  return { reply: r.text, l6Filtered: r.filtered };
}
