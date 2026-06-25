import { describe, expect, it } from 'vitest';
import { extractMetricsFromText, extractObservationsFromText } from '@/src/lib/extractMetrics';

describe('extractMetricsFromText', () => {
  it('extracts LDL-C from Chinese lab report text', () => {
    const text = '低密度脂蛋白胆固醇 LDL-C 3.82 mmol/L 参考范围 < 3.12';
    const metrics = extractMetricsFromText(text);
    expect(metrics).toContainEqual(
      expect.objectContaining({ name: 'LDL-C', value: '3.82', unit: 'mmol/L' }),
    );
  });

  it('extracts ALT and BMI', () => {
    const text = '丙氨酸氨基转移酶 ALT 51.1 U/L  体重指数 BMI 24.88';
    const metrics = extractMetricsFromText(text);
    expect(metrics.find((m) => m.name === 'ALT')).toMatchObject({ value: '51.1' });
    expect(metrics.find((m) => m.name === 'BMI')).toMatchObject({ value: '24.88' });
  });

  it('extractObservationsFromText includes structured fields', () => {
    const text = '低密度脂蛋白胆固醇 LDL-C 3.82 mmol/L 参考范围 < 3.12';
    const obs = extractObservationsFromText(text);
    expect(obs[0]).toMatchObject({
      canonicalId: 'ldl_c',
      numericValue: 3.82,
      provenance: { source: 'pdf_extract' },
    });
  });
});
