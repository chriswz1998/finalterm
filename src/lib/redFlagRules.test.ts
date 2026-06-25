import { describe, expect, it } from 'vitest';
import { evaluateRedFlags, topBaselineRedFlags, BASELINE_RULE_CONTEXT } from '@/src/lib/redFlagRules';

describe('evaluateRedFlags', () => {
  it('flags persistent LDL elevation across four exams', () => {
    const hits = evaluateRedFlags(BASELINE_RULE_CONTEXT);
    expect(hits.some((h) => h.ruleId === 'ldl_persistent')).toBe(true);
  });

  it('flags FH pattern hint at 2021 baseline', () => {
    const hits = evaluateRedFlags(BASELINE_RULE_CONTEXT);
    expect(hits.some((h) => h.ruleId === 'fh_pattern_hint')).toBe(true);
  });

  it('reports ALT spike resolved when latest is normal', () => {
    const hits = evaluateRedFlags(BASELINE_RULE_CONTEXT);
    expect(hits.some((h) => h.ruleId === 'alt_spike_resolved')).toBe(true);
    expect(hits.some((h) => h.ruleId === 'alt_elevated')).toBe(false);
  });

  it('flags glucose trend when 2025 value rises', () => {
    const hits = evaluateRedFlags(BASELINE_RULE_CONTEXT);
    expect(hits.some((h) => h.ruleId === 'glucose_trend')).toBe(true);
  });
});

describe('topBaselineRedFlags', () => {
  it('returns sorted limited hits', () => {
    expect(topBaselineRedFlags(3).length).toBeLessThanOrEqual(3);
  });
});
