import { describe, expect, it } from 'vitest';
import { csvToObjects } from '@/src/lib/csvParse';
import { ALL_OBSERVATIONS, TREND_DATA, DERIVED_ARCHIVES } from '@/src/data/examDataset';

describe('examDataset', () => {
  it('parses hospital long-table CSV', () => {
    expect(ALL_OBSERVATIONS.length).toBeGreaterThan(200);
    const ldl2025 = ALL_OBSERVATIONS.find(
      (o) => o.reportDate === '2025-02-28' && o.canonicalId === 'ldl_c',
    );
    expect(ldl2025?.numericValue).toBe(3.82);
  });

  it('builds four-year trend from real dates', () => {
    expect(TREND_DATA).toHaveLength(4);
    expect(TREND_DATA[0].ldl).toBe(5.04);
    expect(TREND_DATA[3].alt).toBe(19.4);
  });

  it('derives archive list with anomalies', () => {
    expect(DERIVED_ARCHIVES).toHaveLength(4);
    const y2024 = DERIVED_ARCHIVES.find((a) => a.year === '2024');
    expect(y2024?.anomaliesList.some((a) => a.name === 'ALT')).toBe(true);
  });
});

describe('csvToObjects', () => {
  it('handles quoted fields', () => {
    const rows = csvToObjects('a,b\n"hello, world",2');
    expect(rows[0].a).toBe('hello, world');
    expect(rows[0].b).toBe('2');
  });
});
