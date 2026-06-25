import { describe, expect, it } from 'vitest';
import { OBSERVATIONS_BY_DATE } from '@/src/data/examDataset';
import { evaluateRedFlags, BASELINE_RULE_CONTEXT } from '@/src/lib/redFlagRules';
import {
  retrieveKnowledge,
  formatChunksForPrompt,
  inferCareLevel,
} from '@/src/lib/knowledgeRetrieve';

describe('RAG flow payload', () => {
  it('builds non-empty knowledgeContext from full archive', () => {
    const obs = Object.values(OBSERVATIONS_BY_DATE).flat();
    const redFlags = evaluateRedFlags(BASELINE_RULE_CONTEXT);
    const retrieved = retrieveKnowledge({ observations: obs, redFlags });
    const knowledgeContext = formatChunksForPrompt(retrieved.chunks);

    expect(knowledgeContext.trim().length).toBeGreaterThan(50);
    expect(retrieved.chunkIds).toContain('l6:disclaimer:v1');

    const body = {
      observations: obs.slice(0, 40).map((o) => ({
        canonicalId: o.canonicalId,
        standardName: o.standardName,
        value: o.value,
        unit: o.unit,
        abnormalFlag: o.abnormalFlag,
        reportDate: o.reportDate,
      })),
      redFlags: redFlags.map((f) => ({
        ruleId: f.ruleId,
        severity: f.severity,
        title: f.title,
        message: f.message,
      })),
      medicalTerm: 'ALT',
      value: '51.1 U/L',
      knowledgeContext,
      chunkIds: retrieved.chunkIds,
      careLevel: inferCareLevel(redFlags),
    };

    const json = JSON.stringify(body);
    expect(json.length).toBeLessThan(500_000);
  });
});
