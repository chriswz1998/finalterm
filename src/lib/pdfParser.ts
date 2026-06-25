import * as pdfjsLib from 'pdfjs-dist';
import {
  extractObservationsFromPages,
  extractReportDate,
  observationsToMetrics,
} from '@/src/lib/observationExtract';
import type { Observation } from '@/src/types/observation';

export type { ExtractedMetric } from '@/src/lib/extractMetrics';
export {
  extractMetricsFromText,
  extractObservationsFromText,
  observationsToMetrics,
} from '@/src/lib/extractMetrics';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/** Required for Chinese / embedded fonts in many hospital PDFs (pdf.js cMaps). */
function pdfDocumentInitParams(data: ArrayBuffer) {
  const version = pdfjsLib.version;
  return {
    data,
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/standard_fonts/`,
  };
}

export interface PdfParseResult {
  fileName: string;
  pageCount: number;
  textPreview: string;
  observations: Observation[];
  /** Derived from observations for legacy UI paths */
  metrics: ReturnType<typeof observationsToMetrics>;
  parsedAt: string;
  source?: 'pdf_extract' | 'hospital_csv' | 'vision_ocr';
  reportDate?: string;
}

export async function parsePdfFile(file: File): Promise<PdfParseResult> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('请选择 PDF 格式的体检报告文件。');
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(pdfDocumentInitParams(buffer)).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(pageText);
  }

  const fullText = pages.join('\n');
  const reportDate = extractReportDate(fullText) ?? undefined;
  const observations = extractObservationsFromPages(pages, reportDate);
  const metrics = observationsToMetrics(observations);

  return {
    fileName: file.name,
    pageCount: pdf.numPages,
    textPreview: fullText.slice(0, 500).replace(/\s+/g, ' ').trim(),
    observations,
    metrics,
    parsedAt: new Date().toISOString(),
    source: 'pdf_extract',
    reportDate: observations[0]?.reportDate ?? reportDate,
  };
}
