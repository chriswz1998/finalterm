import { describe, expect, it } from 'vitest';
import { sanitizeLlmHealthText } from '@/src/lib/l6OutputFilter';
import { buildReferenceRangeDisplay } from '@/src/lib/referenceRangeHint';
import { inferCareLevel } from '@/src/lib/knowledgeRetrieve';
import type { RedFlagHit } from '@/src/lib/redFlagRules';

describe('sanitizeLlmHealthText', () => {
  it('replaces diagnostic phrasing', () => {
    const r = sanitizeLlmHealthText('你患有2型糖尿病，必须服用二甲双胍。');
    expect(r.filtered).toBe(true);
    expect(r.text).not.toContain('你患有');
    expect(r.text).not.toContain('必须服用');
  });

  it('passes through safe text', () => {
    const r = sanitizeLlmHealthText('可能与近期作息有关，建议进一步评估。');
    expect(r.filtered).toBe(false);
    expect(r.text).toContain('可能与');
  });
});

describe('buildReferenceRangeDisplay', () => {
  it('prefers report reference range', () => {
    const r = buildReferenceRangeDisplay({ referenceRange: '<3.37', canonicalId: 'ldl_c' });
    expect(r.source).toBe('report');
    expect(r.displayRange).toBe('<3.37');
    expect(r.hint).toBeUndefined();
  });

  it('falls back to WS/T when report missing', () => {
    const r = buildReferenceRangeDisplay({ referenceRange: null, canonicalId: 'alt' });
    expect(r.source).toBe('wst_fallback');
    expect(r.displayRange).toContain('40');
    expect(r.hint).toContain('WS/T');
  });
});

describe('inferCareLevel S4', () => {
  it('maps emergency rules to S4', () => {
    const flags: RedFlagHit[] = [
      {
        ruleId: 'emergency_bp_crisis',
        severity: 'critical',
        title: 'test',
        message: 'test',
        relatedIndicators: ['bp_systolic'],
      },
    ];
    expect(inferCareLevel(flags)).toBe('S4');
  });

  it('maps non-emergency critical to S3', () => {
    const flags: RedFlagHit[] = [
      {
        ruleId: 'ldl_critical',
        severity: 'critical',
        title: 'test',
        message: 'test',
        relatedIndicators: ['ldl_c'],
      },
    ];
    expect(inferCareLevel(flags)).toBe('S3');
  });
});
