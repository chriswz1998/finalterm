import { buildRuleContext, evaluateRedFlags, type RedFlagHit } from '@/src/lib/redFlagRules';
import type { UserExamImport } from '@/src/lib/healthArchive';
import type { Observation } from '@/src/types/observation';
import type { AgentBootstrap, AgentRiskLevel } from '@/src/agent/types';

function severityToRisk(redFlags: RedFlagHit[]): AgentRiskLevel {
  if (redFlags.some((f) => f.severity === 'critical' || f.severity === 'high')) return 'high';
  if (redFlags.some((f) => f.severity === 'moderate')) return 'medium';
  if (redFlags.length > 0) return 'medium';
  return 'low';
}

export function buildAgentRuleContext(
  observations: Observation[],
  reportDate: string,
  fileName: string,
  source: UserExamImport['source'] = 'pdf_extract',
): { redFlags: RedFlagHit[]; bootstrap: AgentBootstrap } {
  const syntheticImport: UserExamImport = {
    id: `agent:${reportDate}`,
    reportDate,
    fileName,
    importedAt: new Date().toISOString(),
    source,
    observations,
  };

  const ctx = buildRuleContext({ [reportDate]: observations }, [reportDate], [], syntheticImport);
  const redFlags = evaluateRedFlags(ctx);
  const abnormalCount = observations.filter((o) => o.abnormalFlag != null).length;

  return {
    redFlags,
    bootstrap: {
      totalCount: observations.length,
      abnormalCount,
      riskLevel: severityToRisk(redFlags),
      reportDate,
    },
  };
}

export function pickInterpretTargets(observations: Observation[], limit = 5): Observation[] {
  const abnormal = observations.filter((o) => o.abnormalFlag != null);
  const order = { critical: 0, high: 1, positive: 2, low: 3 };
  return [...abnormal]
    .sort((a, b) => {
      const sa = a.abnormalFlag ? (order[a.abnormalFlag as keyof typeof order] ?? 4) : 5;
      const sb = b.abnormalFlag ? (order[b.abnormalFlag as keyof typeof order] ?? 4) : 5;
      return sa - sb;
    })
    .slice(0, limit);
}
