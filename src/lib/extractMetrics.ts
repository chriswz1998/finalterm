import { extractObservationsFromText, observationsToMetrics } from '@/src/lib/observationExtract';

export interface ExtractedMetric {
  name: string;
  value: string;
  unit: string;
  canonicalId?: string;
}

/** @deprecated Prefer extractObservationsFromText — kept for backward compatibility */
export function extractMetricsFromText(text: string): ExtractedMetric[] {
  return observationsToMetrics(extractObservationsFromText(text));
}

export { extractObservationsFromText, observationsToMetrics } from '@/src/lib/observationExtract';
