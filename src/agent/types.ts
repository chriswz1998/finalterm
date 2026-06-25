import type { Observation } from '@/src/types/observation';
import type { RedFlagHit } from '@/src/lib/redFlagRules';

export type AgentRiskLevel = 'low' | 'medium' | 'high';

export interface AgentCitation {
  chunkId: string;
  title: string;
  excerpt?: string;
}

export interface AgentBootstrap {
  totalCount: number;
  abnormalCount: number;
  riskLevel: AgentRiskLevel;
  reportDate?: string;
}

export interface AgentInterpretedItem {
  observationId: string;
  standardName: string;
  value: string;
  unit?: string;
  plainExplanation: string;
  whyAbnormal: string;
  lifestyleTips: string[];
  severity: 'low' | 'medium' | 'high';
  nature: 'transient' | 'persistent';
  citations?: AgentCitation[];
  status: 'pending' | 'loading' | 'done' | 'error';
  error?: string;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

/** Phase 2: sync to main Health Link archive */
export interface AgentSyncMeta {
  eligible: boolean;
  syncedAt?: string;
  mainArchiveImportId?: string;
}

export interface AgentSession {
  id: string;
  /** 关联的家庭成员；缺省为创建时的当前成员 */
  memberId?: string;
  createdAt: string;
  updatedAt: string;
  fileName: string;
  source: 'pdf_extract' | 'vision_ocr' | 'manual';
  observations: Observation[];
  redFlags: RedFlagHit[];
  bootstrap: AgentBootstrap;
  summary?: string;
  headline?: string;
  followUpHint?: string;
  riskLevel?: AgentRiskLevel;
  /** 规则引擎 + 知识库推断的照护等级 S0–S4 */
  careLevel?: string;
  summaryCitations?: AgentCitation[];
  summaryChunkIds?: string[];
  items: AgentInterpretedItem[];
  chatMessages: AgentChatMessage[];
  aiConsentGranted: boolean;
  sync: AgentSyncMeta;
  interpretStatus: 'idle' | 'summary_loading' | 'items_loading' | 'done' | 'error';
  error?: string;
}

export interface AgentSummaryResponse {
  mode: 'summary';
  summary: string;
  riskLevel: AgentRiskLevel;
  headline: string;
  followUpHint: string;
  disclaimer: string;
  careLevel?: string;
  citations?: AgentCitation[];
  chunkIds?: string[];
  provider?: string;
  model?: string;
}

export interface AgentItemsResponse {
  mode: 'items';
  items: Array<Omit<AgentInterpretedItem, 'standardName' | 'value' | 'unit' | 'status'>>;
  disclaimer: string;
}

export interface AgentChatResponse {
  reply: string;
  disclaimer: string;
}
