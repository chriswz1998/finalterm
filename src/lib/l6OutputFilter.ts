/** L6 — post-process LLM health text to block diagnostic / prescription phrasing. */

const REPLACEMENT = '（该表述需由医生当面评估，此处不作诊断性结论）';

const BLOCK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /你(?:已经|可能)?患有[\u4e00-\u9fa5A-Za-z0-9（）()]+/g, label: 'diagnosis' },
  { pattern: /确诊为[\u4e00-\u9fa5A-Za-z0-9（）()]+/g, label: 'diagnosis' },
  { pattern: /可以(?:基本)?排除[\u4e00-\u9fa5A-Za-z0-9（）()]+/g, label: 'diagnosis' },
  { pattern: /必须(?:立即)?(?:服用|使用|注射)[\u4e00-\u9fa5A-Za-z0-9（）()]+/g, label: 'prescription' },
  { pattern: /建议(?:你)?(?:立即)?(?:停用|停止服用)[\u4e00-\u9fa5A-Za-z0-9（）()]+/g, label: 'prescription' },
  { pattern: /(?:每天|每日)(?:服用|口服)[\u4e00-\u9fa5A-Za-z0-9（）()·\d]+(?:mg|毫克|片|粒|单位)/gi, label: 'prescription' },
  { pattern: /保证(?:你)?(?:没有|无)[\u4e00-\u9fa5A-Za-z0-9（）()]+/g, label: 'guarantee' },
];

export interface SanitizeResult {
  text: string;
  filtered: boolean;
  hits: string[];
}

export function sanitizeLlmHealthText(text: string): SanitizeResult {
  if (!text?.trim()) return { text: text ?? '', filtered: false, hits: [] };

  let out = text;
  const hits: string[] = [];

  for (const { pattern, label } of BLOCK_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(out)) {
      hits.push(label);
      pattern.lastIndex = 0;
      out = out.replace(pattern, REPLACEMENT);
    }
  }

  return { text: out, filtered: hits.length > 0, hits };
}

export function sanitizeStringFields<T extends Record<string, unknown>>(
  obj: T,
  keys: string[],
): { value: T; filtered: boolean } {
  let filtered = false;
  const next = { ...obj } as Record<string, unknown>;

  for (const key of keys) {
    const v = next[key];
    if (typeof v === 'string') {
      const r = sanitizeLlmHealthText(v);
      next[key] = r.text;
      filtered = filtered || r.filtered;
    } else if (Array.isArray(v) && key === 'lifestyleTips') {
      next[key] = v.map((item) => {
        if (typeof item !== 'string') return item;
        const r = sanitizeLlmHealthText(item);
        filtered = filtered || r.filtered;
        return r.text;
      });
    } else if (Array.isArray(v) && key === 'actionableSteps') {
      next[key] = v.map((item) => {
        if (typeof item !== 'string') return item;
        const r = sanitizeLlmHealthText(item);
        filtered = filtered || r.filtered;
        return r.text;
      });
    }
  }

  return { value: next as T, filtered };
}
