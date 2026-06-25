import { upsertUserImport, type UserExamImport } from '@/src/lib/healthArchive';
import type { Observation } from '@/src/types/observation';
import type { AgentSession } from '@/src/agent/types';

export function agentSessionToImport(session: AgentSession): UserExamImport {
  const reportDate =
    session.bootstrap.reportDate ??
    session.observations[0]?.reportDate ??
    new Date().toISOString().slice(0, 10);

  const observations: Observation[] = session.observations.map((o) => ({
    ...o,
    provenance: {
      ...o.provenance,
      source: o.provenance.source === 'manual' ? 'manual' : session.source,
      reportDate: o.reportDate || reportDate,
    },
  }));

  return {
    id: `agent-sync-${session.id}`,
    reportDate,
    fileName: `[Agent] ${session.fileName}`,
    importedAt: new Date().toISOString(),
    source: session.source === 'manual' ? 'manual' : session.source,
    observations,
  };
}

export function mergeAgentSessionIntoImports(
  existing: UserExamImport[],
  session: AgentSession,
): UserExamImport[] {
  return upsertUserImport(existing, agentSessionToImport(session));
}
