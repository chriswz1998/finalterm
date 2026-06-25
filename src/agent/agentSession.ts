import type { AgentSession } from '@/src/agent/types';

const STORAGE_KEY = 'health-link:agent-sessions';
const MAX_SESSIONS = 10;

function readAll(): AgentSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgentSession[]) : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: AgentSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

export function listAgentSessions(memberId?: string): AgentSession[] {
  const all = readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!memberId) return all;
  return all.filter((s) => s.memberId === memberId);
}

export function getAgentSession(id: string): AgentSession | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function saveAgentSession(session: AgentSession): void {
  const all = readAll().filter((s) => s.id !== session.id);
  writeAll([{ ...session, updatedAt: new Date().toISOString() }, ...all]);
}

export function deleteAgentSession(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function createSessionId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Phase 2 hook: mark session ready to sync into main archive */
export function markSessionSyncEligible(sessionId: string): AgentSession | null {
  const session = getAgentSession(sessionId);
  if (!session) return null;
  const next: AgentSession = {
    ...session,
    sync: { ...session.sync, eligible: true },
    updatedAt: new Date().toISOString(),
  };
  saveAgentSession(next);
  return next;
}
