import { describe, expect, it } from 'vitest';
import { EXAM_DATES, OBSERVATIONS_BY_DATE } from '@/src/data/examDataset';
import { mergeUserImports, createImportFromPdf, getLatestFromMerged } from '@/src/lib/healthArchive';

describe('member-scoped archive merge', () => {
  it('shows empty archive when member has no imports and no demo baseline', () => {
    const merged = mergeUserImports([], {}, []);
    expect(merged.examDates).toEqual([]);
    expect(merged.trendData).toEqual([]);
    expect(merged.latestImport).toBeNull();
  });

  it('shows only member imports without global baseline', () => {
    const imp = createImportFromPdf({
      fileName: 'dad-2026.pdf',
      parsedAt: new Date().toISOString(),
      reportDate: '2026-03-01',
      observations: [
        {
          id: 'pdf:1',
          canonicalId: 'ldl_c',
          standardName: 'LDL-C',
          originalName: 'LDL-C',
          value: '2.8',
          numericValue: 2.8,
          unit: 'mmol/L',
          referenceRange: '<3.37',
          abnormalFlag: null,
          reportDate: '2026-03-01',
          provenance: { source: 'pdf_extract', reportDate: '2026-03-01', confidence: 0.8 },
        },
      ],
    });

    const merged = mergeUserImports([imp], {}, []);
    expect(merged.examDates).toEqual(['2026-03-01']);
    expect(merged.trendData[0]?.ldl).toBe(2.8);
    expect(getLatestFromMerged(merged, 'bmi')).toBeUndefined();
  });

  it('uses demo baseline only when explicitly enabled for a member', () => {
    const merged = mergeUserImports([], OBSERVATIONS_BY_DATE, EXAM_DATES);
    expect(merged.examDates.length).toBeGreaterThan(0);
    expect(merged.trendData.some((t) => t.ldl != null)).toBe(true);
  });
});
