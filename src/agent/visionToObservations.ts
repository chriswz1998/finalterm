import { resolveIndicator } from '@/src/data/indicatorDictionary';
import { inferAbnormalFlag } from '@/src/lib/observationExtract';
import type { Observation } from '@/src/types/observation';

interface VisionItem {
  name?: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: string | null;
}

interface VisionResult {
  reportDate?: string | null;
  items?: VisionItem[];
}

function mapFlag(raw?: string | null): Observation['abnormalFlag'] {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (/↑|高|elevated|high/.test(s)) return 'high';
  if (/↓|低|low/.test(s)) return 'low';
  if (/阳|\+|positive/.test(s)) return 'positive';
  if (/危|critical/.test(s)) return 'critical';
  return null;
}

export function visionResultToObservations(
  result: VisionResult,
  fileName: string,
): { observations: Observation[]; reportDate: string } {
  const reportDate = result.reportDate ?? new Date().toISOString().slice(0, 10);
  const items = result.items ?? [];

  const observations: Observation[] = items
    .map((item, index) => {
      const name = item.name?.trim();
      if (!name) return null;

      const def = resolveIndicator(name);
      const numericRaw = item.value?.replace(/[^\d.+-]/g, '') ?? '';
      const numericValue = numericRaw ? parseFloat(numericRaw) : null;
      const unit = item.unit?.trim() || def?.unit || '';
      const referenceRange = item.referenceRange?.trim() || null;
      const flagFromOcr = mapFlag(item.flag);
      const abnormalFlag =
        flagFromOcr ??
        (numericValue != null
          ? inferAbnormalFlag(numericValue, referenceRange, item.value ?? '', def?.canonicalId ?? null)
          : null);

      const obs: Observation = {
        id: `vision:${reportDate}:${index}:${def?.canonicalId ?? name}`,
        canonicalId: def?.canonicalId ?? null,
        standardName: def?.standardName ?? name,
        originalName: name,
        value: item.value ?? null,
        numericValue: numericValue != null && !Number.isNaN(numericValue) ? numericValue : null,
        unit,
        referenceRange,
        abnormalFlag,
        reportDate,
        provenance: {
          source: 'vision_ocr',
          reportDate,
          confidence: 0.82,
        },
      };
      return obs;
    })
    .filter((o): o is Observation => o != null);

  return { observations, reportDate };
}

export async function parseImageFile(file: File): Promise<{
  observations: Observation[];
  reportDate: string;
  fileName: string;
}> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const imageBase64 = btoa(binary);
  const mimeType = file.type || 'image/jpeg';

  const res = await fetch('/api/document/vision-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof payload.message === 'string' ? payload.message : `图片解析失败 (${res.status})`);
  }

  const parsed = visionResultToObservations((payload.result ?? payload) as VisionResult, file.name);

  if (parsed.observations.length === 0) {
    throw new Error('未能从图片中识别到检验项目，请换更清晰的照片或 PDF 重试。');
  }

  return { ...parsed, fileName: file.name };
}
