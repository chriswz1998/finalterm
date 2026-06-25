import { describe, expect, it } from 'vitest';
import {
  mergeUserImports,
  createImportFromPdf,
  upsertUserImport,
  computeImportDeltas,
  getLatestFromMerged,
} from '@/src/lib/healthArchive';
import { buildRuleContext, evaluateRedFlags } from '@/src/lib/redFlagRules';

describe('mergeUserImports', () => {
  it('overrides baseline LDL when PDF import on same date', () => {
    const imp = createImportFromPdf({
      fileName: '2025-report.pdf',
      parsedAt: new Date().toISOString(),
      reportDate: '2025-02-28',
      observations: [
        {
          id: 'pdf:1',
          canonicalId: 'ldl_c',
          standardName: 'LDL-C',
          originalName: 'LDL-C',
          value: '4.5',
          numericValue: 4.5,
          unit: 'mmol/L',
          referenceRange: '<3.37',
          abnormalFlag: 'high',
          reportDate: '2025-02-28',
          provenance: { source: 'pdf_extract', reportDate: '2025-02-28', confidence: 0.8 },
        },
      ],
    });

    const merged = mergeUserImports([imp]);
    const ldl = getLatestFromMerged(merged, 'ldl_c');
    expect(ldl?.numericValue).toBe(4.5);
    expect(ldl?.provenance.source).toBe('pdf_extract');
  });

  it('adds new exam date from PDF import', () => {
    const imp = createImportFromPdf({
      fileName: '2026-report.pdf',
      parsedAt: new Date().toISOString(),
      reportDate: '2026-06-01',
      observations: [
        {
          id: 'pdf:2',
          canonicalId: 'ldl_c',
          standardName: 'LDL-C',
          originalName: 'LDL-C',
          value: '3.5',
          numericValue: 3.5,
          unit: 'mmol/L',
          referenceRange: null,
          abnormalFlag: 'high',
          reportDate: '2026-06-01',
          provenance: { source: 'pdf_extract', reportDate: '2026-06-01', confidence: 0.7 },
        },
      ],
    });

    const merged = mergeUserImports([imp]);
    expect(merged.examDates).toContain('2026-06-01');
    expect(merged.trendData.at(-1)?.ldl).toBe(3.5);
  });

  it('triggers import_abnormal_detected rule', () => {
    const imp = createImportFromPdf({
      fileName: 'new.pdf',
      parsedAt: new Date().toISOString(),
      reportDate: '2026-06-01',
      observations: [
        {
          id: 'pdf:3',
          canonicalId: 'alt',
          standardName: 'ALT',
          originalName: 'ALT',
          value: '55',
          numericValue: 55,
          unit: 'U/L',
          referenceRange: '7-40',
          abnormalFlag: 'high',
          reportDate: '2026-06-01',
          provenance: { source: 'pdf_extract', reportDate: '2026-06-01', confidence: 0.8 },
        },
      ],
    });

    const merged = mergeUserImports([imp]);
    const ctx = buildRuleContext(
      merged.observationsByDate,
      merged.examDates,
      merged.trendData,
      imp,
    );
    expect(evaluateRedFlags(ctx).some((h) => h.ruleId === 'import_abnormal_detected')).toBe(true);
  });
});

describe('computeImportDeltas', () => {
  it('computes direction vs prior exam', () => {
    const imp = createImportFromPdf({
      fileName: '2026.pdf',
      parsedAt: new Date().toISOString(),
      reportDate: '2026-06-01',
      observations: [
        {
          id: 'pdf:4',
          canonicalId: 'ldl_c',
          standardName: 'LDL-C',
          originalName: 'LDL-C',
          value: '4.0',
          numericValue: 4.0,
          unit: 'mmol/L',
          referenceRange: null,
          abnormalFlag: 'high',
          reportDate: '2026-06-01',
          provenance: { source: 'pdf_extract', reportDate: '2026-06-01', confidence: 0.8 },
        },
      ],
    });
    const merged = mergeUserImports([imp]);
    const deltas = computeImportDeltas(merged, imp);
    const ldlDelta = deltas.find((d) => d.canonicalId === 'ldl_c');
    expect(ldlDelta?.prior).toBe(3.82);
    expect(ldlDelta?.direction).toBe('up');
  });
});

describe('upsertUserImport', () => {
  it('replaces same date and filename', () => {
    const a = createImportFromPdf({
      fileName: 'r.pdf',
      parsedAt: '1',
      reportDate: '2026-01-01',
      observations: [],
    });
    const b = { ...a, id: 'b', importedAt: '2' };
    expect(upsertUserImport([a], b)).toHaveLength(1);
    expect(upsertUserImport([a], b)[0].id).toBe('b');
  });
});
