import { describe, expect, it } from 'vitest';
import { agentSessionToImport, mergeAgentSessionIntoImports } from '@/src/agent/syncToArchive';
import type { AgentSession } from '@/src/agent/types';

function makeSession(source: AgentSession['source'] = 'pdf_extract'): AgentSession {
  return {
    id: 's1',
    memberId: 'member-a',
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
    fileName: 'report.jpg',
    source,
    observations: [
      {
        id: 'vision:1',
        canonicalId: 'ldl_c',
        standardName: 'LDL-C',
        originalName: '低密度脂蛋白胆固醇',
        value: '4.2',
        numericValue: 4.2,
        unit: 'mmol/L',
        referenceRange: '<3.37',
        abnormalFlag: 'high',
        reportDate: '2026-06-01',
        provenance: { source, reportDate: '2026-06-01', confidence: 0.82 },
      },
    ],
    redFlags: [],
    bootstrap: {
      totalCount: 1,
      abnormalCount: 1,
      riskLevel: 'medium',
      reportDate: '2026-06-01',
    },
    items: [],
    chatMessages: [],
    aiConsentGranted: true,
    sync: { eligible: true },
    interpretStatus: 'done',
  };
}

describe('agentSessionToImport', () => {
  it('preserves vision OCR source when syncing into archive', () => {
    const imported = agentSessionToImport(makeSession('vision_ocr'));

    expect(imported.id).toBe('agent-sync-s1');
    expect(imported.source).toBe('vision_ocr');
    expect(imported.reportDate).toBe('2026-06-01');
    expect(imported.observations[0]?.provenance.source).toBe('vision_ocr');
  });

  it('upserts repeat syncs by date and filename', () => {
    const first = agentSessionToImport(makeSession('pdf_extract'));
    const next = { ...makeSession('pdf_extract'), id: 's2', fileName: 'report.jpg' };
    const merged = mergeAgentSessionIntoImports([first], next);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe('agent-sync-s2');
  });
});
