import { describe, expect, it } from 'vitest';
import { BASELINE_RULE_CONTEXT, evaluateRedFlags } from '@/src/lib/redFlagRules';
import {
  retrieveKnowledge,
  formatChunksForPrompt,
  inferCareLevel,
  buildRagDisclaimer,
} from '@/src/lib/knowledgeRetrieve';
import { getLatestObservation, OBSERVATIONS_BY_DATE } from '@/src/data/examDataset';
import type { Observation } from '@/src/types/observation';

describe('retrieveKnowledge', () => {
  it('retrieves L2 chunks for abnormal LDL from baseline', () => {
    const ldl = getLatestObservation('ldl_c');
    expect(ldl?.abnormalFlag).toBeTruthy();

    const ctx = retrieveKnowledge({
      observations: ldl ? [ldl] : [],
      redFlags: evaluateRedFlags(BASELINE_RULE_CONTEXT),
    });

    expect(ctx.chunkIds).toContain('l2:ldl_c:high:adult:v1');
    expect(ctx.chunkIds).toContain('l6:disclaimer:v1');
  });

  it('includes L3/L5 chunks when red flags fire', () => {
    const redFlags = evaluateRedFlags(BASELINE_RULE_CONTEXT);
    const obs = Object.values(OBSERVATIONS_BY_DATE).flat();

    const ctx = retrieveKnowledge({ observations: obs, redFlags, maxChunks: 12 });
    const layers = new Set(ctx.chunks.map((c) => c.layer));

    expect(layers.has('L3') || layers.has('L5')).toBe(true);
  });

  it('always includes L6 disclaimer even at low maxChunks', () => {
    const obs: Observation[] = [
      {
        id: 't1',
        canonicalId: 'alt',
        standardName: 'ALT',
        originalName: 'ALT',
        value: '55',
        numericValue: 55,
        unit: 'U/L',
        referenceRange: '0-40',
        abnormalFlag: 'high',
        reportDate: '2025-01-01',
        provenance: { source: 'manual', reportDate: '2025-01-01', confidence: 1 },
      },
    ];

    const ctx = retrieveKnowledge({ observations: obs, maxChunks: 1 });
    expect(ctx.chunkIds).toContain('l6:disclaimer:v1');
  });
});

describe('formatChunksForPrompt', () => {
  it('formats chunk metadata for LLM prompt', () => {
    const ctx = retrieveKnowledge({
      observations: [getLatestObservation('ldl_c')!].filter(Boolean),
    });
    const text = formatChunksForPrompt(ctx.chunks);
    expect(text).toContain('[l2:ldl_c:high:adult:v1]');
    expect(text).toContain('来源：');
  });
});

describe('inferCareLevel', () => {
  it('maps high severity flags to S2+', () => {
    const level = inferCareLevel(
      evaluateRedFlags(BASELINE_RULE_CONTEXT).filter((f) => f.severity === 'high'),
    );
    expect(['S2', 'S3']).toContain(level);
  });
});

describe('buildRagDisclaimer', () => {
  it('returns non-empty disclaimer', () => {
    expect(buildRagDisclaimer()).toContain('不能替代医生');
  });
});
