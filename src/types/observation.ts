/** Provenance for a single lab / vital observation. */
export type ObservationSource = 'hospital_csv' | 'pdf_extract' | 'vision_ocr' | 'manual';

export type AbnormalFlag = 'high' | 'low' | 'positive' | 'critical' | null;

export interface ObservationProvenance {
  source: ObservationSource;
  reportDate: string;
  sourcePage?: number;
  /** 0–1 confidence in extraction / normalization */
  confidence: number;
}

export interface Observation {
  id: string;
  /** Canonical indicator id, e.g. `ldl_c` */
  canonicalId: string | null;
  standardName: string;
  originalName: string;
  loinc?: string;
  value: string | null;
  numericValue: number | null;
  unit: string;
  referenceRange: string | null;
  abnormalFlag: AbnormalFlag;
  reportDate: string;
  provenance: ObservationProvenance;
}

export interface ExamSnapshot {
  reportDate: string;
  year: string;
  hospital: string;
  observations: Observation[];
  anomalyCount: number;
}
