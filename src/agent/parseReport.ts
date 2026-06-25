import * as pdfjsLib from 'pdfjs-dist';
import { parsePdfFile } from '@/src/lib/pdfParser';
import { parseImageFile, visionResultToObservations } from '@/src/agent/visionToObservations';
import type { Observation } from '@/src/types/observation';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function pdfDocumentInitParams(data: ArrayBuffer) {
  const version = pdfjsLib.version;
  return {
    data,
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/standard_fonts/`,
  };
}

async function renderPdfPageToJpeg(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<Blob> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法渲染 PDF 页面');
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PDF 转图片失败'))), 'image/jpeg', 0.9);
  });
}

/** 扫描版 PDF：逐页渲染后走百炼视觉 OCR */
async function parseScannedPdfViaVision(file: File): Promise<{
  observations: Observation[];
  reportDate: string;
  fileName: string;
  source: 'vision_ocr';
}> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(pdfDocumentInitParams(buffer)).promise;
  const maxPages = Math.min(pdf.numPages, 4);
  const merged: Observation[] = [];
  let reportDate = new Date().toISOString().slice(0, 10);

  for (let i = 1; i <= maxPages; i++) {
    const blob = await renderPdfPageToJpeg(pdf, i);
    const pageFile = new File([blob], `${file.name.replace(/\.pdf$/i, '')}-p${i}.jpg`, {
      type: 'image/jpeg',
    });
    try {
      const pageResult = await parseImageFile(pageFile);
      merged.push(...pageResult.observations);
      if (pageResult.reportDate) reportDate = pageResult.reportDate;
    } catch {
      /* 单页失败继续下一页 */
    }
  }

  if (merged.length === 0) {
    throw new Error(
      'PDF 为扫描件且 OCR 未识别到指标。请确认 npm run dev 已启动、DASHSCOPE_API_KEY 已配置，或改用手机拍照 JPG 上传。',
    );
  }

  const deduped = new Map<string, Observation>();
  for (const o of merged) {
    const key = `${o.canonicalId ?? o.standardName}:${o.value ?? ''}`;
    if (!deduped.has(key)) deduped.set(key, o);
  }

  return {
    observations: [...deduped.values()],
    reportDate,
    fileName: file.name,
    source: 'vision_ocr',
  };
}

export async function parseReportFile(file: File): Promise<{
  observations: Observation[];
  reportDate: string;
  fileName: string;
  source: 'pdf_extract' | 'vision_ocr';
}> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const result = await parsePdfFile(file);
    if (result.observations.length > 0) {
      return {
        observations: result.observations,
        reportDate:
          result.reportDate ?? result.observations[0]?.reportDate ?? new Date().toISOString().slice(0, 10),
        fileName: result.fileName,
        source: 'pdf_extract',
      };
    }
    return parseScannedPdfViaVision(file);
  }

  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    const result = await parseImageFile(file);
    return { ...result, source: 'vision_ocr' };
  }

  throw new Error('请上传 PDF 或图片（JPG/PNG）。');
}

export { visionResultToObservations };
