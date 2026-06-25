export type KnowledgeLayer = 'L0' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

export interface KnowledgeSource {
  /** Links to L0 source registry id */
  sourceId?: string;
  name: string;
  evidenceLevel: 'A1' | 'A2' | 'B' | 'C' | 'D' | 'E';
  version: string;
  url?: string;
}

export interface KnowledgeChunk {
  id: string;
  layer: KnowledgeLayer;
  /** Match Observation.canonicalId */
  canonicalIds?: string[];
  direction?: 'high' | 'low' | 'positive' | 'critical';
  ruleIds?: string[];
  title: string;
  body: string;
  commonFactors?: string[];
  relatedIndicators?: string[];
  suggestedAction?: string;
  forbidden?: string[];
  careLevel?: 'S0' | 'S1' | 'S2' | 'S3' | 'S4';
  source: KnowledgeSource;
}

export interface RetrievedContext {
  chunks: KnowledgeChunk[];
  chunkIds: string[];
}
