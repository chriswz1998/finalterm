import { describe, expect, it } from 'vitest';
import {
  extractObservationsFromText,
  extractObservationsFromPages,
  extractReportDate,
  extractInstitution,
  inferAbnormalFlag,
} from '@/src/lib/observationExtract';

describe('extractObservationsFromText', () => {
  it('returns Observation with canonicalId and provenance', () => {
    const text = '低密度脂蛋白胆固醇 LDL-C 3.82 mmol/L 参考范围 < 3.12';
    const obs = extractObservationsFromText(text, { reportDate: '2025-02-28', sourcePage: 2 });
    const ldl = obs.find((o) => o.canonicalId === 'ldl_c');
    expect(ldl).toMatchObject({
      standardName: 'LDL-C',
      numericValue: 3.82,
      unit: 'mmol/L',
      reportDate: '2025-02-28',
      abnormalFlag: 'high',
      provenance: { source: 'pdf_extract', sourcePage: 2 },
    });
    expect(ldl?.loinc).toBe('13457-7');
  });

  it('extracts ALT with abnormal flag from arrow marker', () => {
    const text = '丙氨酸氨基转移酶 ALT 51.1(↑) U/L 参考范围 7.0～40.0 U/L';
    const obs = extractObservationsFromText(text);
    const alt = obs.find((o) => o.canonicalId === 'alt');
    expect(alt?.numericValue).toBe(51.1);
    expect(alt?.abnormalFlag).toBe('high');
  });

  it('dedupes same indicator across duplicate mentions', () => {
    const text = 'LDL-C 3.82 mmol/L LDL 3.82 mmol/L';
    expect(extractObservationsFromText(text).filter((o) => o.canonicalId === 'ldl_c')).toHaveLength(1);
  });
});

describe('extractObservationsFromPages', () => {
  it('assigns sourcePage from page index', () => {
    const pages = ['常规检查正常', 'BMI 24.88 体重指数'];
    const obs = extractObservationsFromPages(pages, '2024-03-30');
    const bmi = obs.find((o) => o.canonicalId === 'bmi');
    expect(bmi?.provenance.sourcePage).toBe(2);
    expect(bmi?.reportDate).toBe('2024-03-30');
  });
});

describe('extractReportDate', () => {
  it('parses labeled Chinese date', () => {
    expect(extractReportDate('体检日期：2025年02月28日')).toBe('2025-02-28');
  });

  it('parses ISO date in text', () => {
    expect(extractReportDate('报告 2024-03-30 厦门弘爱')).toBe('2024-03-30');
  });
});

describe('extractInstitution', () => {
  it('extracts labeled institution', () => {
    expect(extractInstitution('检验机构：厦门弘爱医院')).toBe('厦门弘爱医院');
  });

  it('extracts inline laboratory name', () => {
    expect(extractInstitution('厦门远程医学实验室 体检报告')).toBe('厦门远程医学实验室');
  });
});

describe('inferAbnormalFlag', () => {
  it('uses numeric range when present', () => {
    expect(inferAbnormalFlag(51.1, '7.0～40.0 U/L', '51.1', 'alt')).toBe('high');
    expect(inferAbnormalFlag(19.4, '7.0～40.0 U/L', '19.4', 'alt')).toBe(null);
  });
});
