import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { usePersistedState } from '@/src/hooks/usePersistedState';
import { DEFAULT_MEDICATIONS } from '@/src/data/defaultMedications';
import { DERIVED_ARCHIVES, EXAM_DATES, getLatestObservation, OBSERVATIONS_BY_DATE } from '@/src/data/examDataset';
import {
  mergeUserImports,
  createImportFromPdf,
  upsertUserImport,
  computeImportDeltas,
  getLatestFromMerged,
  type UserExamImport,
  type MergedHealthArchive,
} from '@/src/lib/healthArchive';
import {
  buildRuleContext,
  evaluateRedFlags,
  topRedFlags,
  type RedFlagHit,
} from '@/src/lib/redFlagRules';
import type { Observation } from '@/src/types/observation';
import type { PdfParseResult } from '@/src/lib/pdfParser';
import { mergeAgentSessionIntoImports } from '@/src/agent/syncToArchive';
import type { AgentSession } from '@/src/agent/types';
import {
  createEmptyMemberArchive,
  createMemberId,
  type FamilyMember,
  type FamilyRelation,
  type MemberArchiveState,
} from '@/src/types/familyMember';
import { ensureFamilySetup, getMemberArchive, migrateLegacyScopedStorage } from '@/src/lib/memberArchiveStore';
import { seedMemberMedications } from '@/src/hooks/useMedications';

export interface ConsentLogEntry {
  action: string;
  timestamp: string;
}

export interface AddMemberInput {
  name: string;
  relation: FamilyRelation;
  gender?: FamilyMember['gender'];
  birthYear?: number;
}

interface AppContextValue {
  hasData: boolean;
  setHasData: (value: boolean) => void;
  activateDemoArchive: () => void;
  userRemarks: string;
  setUserRemarks: (value: string) => void;
  lastPdfUpload: PdfParseResult | null;
  setLastPdfUpload: (value: PdfParseResult | null) => void;
  importPdfFile: (file: File, memberId?: string) => Promise<PdfParseResult>;
  importReportFiles: (files: File[], memberId?: string) => Promise<import('@/src/lib/batchReportImport').BatchImportSummary>;
  dataProcessingConsent: boolean;
  setDataProcessingConsent: (value: boolean) => void;
  aiConsentGranted: boolean;
  setAiConsentGranted: (value: boolean) => void;
  logConsentEvent: (action: string) => void;
  consentLog: ConsentLogEntry[];
  userImports: UserExamImport[];
  mergedArchive: MergedHealthArchive;
  ruleContext: ReturnType<typeof buildRuleContext>;
  mergedRedFlags: RedFlagHit[];
  getMergedLatest: (canonicalId: string) => Observation | undefined;
  lastImportDeltas: ReturnType<typeof computeImportDeltas>;
  importAgentSession: (session: {
    id: string;
    fileName: string;
    memberId?: string;
    source?: AgentSession['source'];
    bootstrap: { reportDate?: string };
    observations: Observation[];
  }) => string;
  members: FamilyMember[];
  activeMember: FamilyMember;
  activeMemberId: string;
  switchMember: (memberId: string) => void;
  addMember: (input: AddMemberInput) => FamilyMember;
  updateMember: (memberId: string, patch: Partial<Pick<FamilyMember, 'name' | 'relation' | 'gender' | 'birthYear'>>) => void;
  removeMember: (memberId: string) => boolean;
  memberHasData: (memberId: string) => boolean;
  activeMemberUseDemoBaseline: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = usePersistedState<FamilyMember[]>('health-link:familyMembers', []);
  const [activeMemberId, setActiveMemberId] = usePersistedState('health-link:activeMemberId', '');
  const [memberArchives, setMemberArchives] = usePersistedState<Record<string, MemberArchiveState>>(
    'health-link:memberArchives',
    {},
  );
  const [dataProcessingConsent, setDataProcessingConsent] = usePersistedState(
    'health-link:dataConsent',
    false,
  );
  const [aiConsentGranted, setAiConsentGranted] = usePersistedState('health-link:aiConsent', false);
  const [consentLog, setConsentLog] = usePersistedState<ConsentLogEntry[]>('health-link:consentLog', []);

  useEffect(() => {
    const setup = ensureFamilySetup();
    if (members.length === 0) {
      setMembers(setup.members);
      setActiveMemberId(setup.activeId);
      setMemberArchives(setup.archives);
    } else {
      const selfMember = members.find((m) => m.relation === 'self') ?? members[0];
      if (selfMember) migrateLegacyScopedStorage(selfMember.id);
    }
  }, [members, setMembers, setActiveMemberId, setMemberArchives]);

  const activeMember = useMemo(() => {
    const found = members.find((m) => m.id === activeMemberId);
    return found ?? members[0] ?? { id: 'pending', name: '本人', relation: 'self' as const, createdAt: '' };
  }, [members, activeMemberId]);

  const activeArchive = useMemo(
    () => getMemberArchive(memberArchives, activeMember.id),
    [memberArchives, activeMember.id],
  );

  const hasData = activeArchive.hasData;
  const userImports = activeArchive.userImports;
  const lastPdfUpload = activeArchive.lastPdfUpload;
  const userRemarks = activeArchive.userRemarks;
  const activeMemberUseDemoBaseline = activeArchive.useDemoBaseline === true;

  const patchActiveArchive = useCallback(
    (patch: Partial<MemberArchiveState>) => {
      setMemberArchives((prev) => ({
        ...prev,
        [activeMember.id]: { ...getMemberArchive(prev, activeMember.id), ...patch },
      }));
    },
    [activeMember.id, setMemberArchives],
  );

  const patchMemberArchive = useCallback(
    (memberId: string, patch: Partial<MemberArchiveState>) => {
      setMemberArchives((prev) => ({
        ...prev,
        [memberId]: { ...getMemberArchive(prev, memberId), ...patch },
      }));
    },
    [setMemberArchives],
  );

  const setHasData = useCallback(
    (value: boolean) => patchActiveArchive({ hasData: value }),
    [patchActiveArchive],
  );

  const setUserRemarks = useCallback(
    (value: string) => patchActiveArchive({ userRemarks: value }),
    [patchActiveArchive],
  );

  const setLastPdfUpload = useCallback(
    (value: PdfParseResult | null) => patchActiveArchive({ lastPdfUpload: value }),
    [patchActiveArchive],
  );

  const memberHasData = useCallback(
    (memberId: string) => getMemberArchive(memberArchives, memberId).hasData,
    [memberArchives],
  );

  const mergedArchive = useMemo(() => {
    const useBaseline = activeArchive.useDemoBaseline === true;
    return mergeUserImports(
      userImports,
      useBaseline ? OBSERVATIONS_BY_DATE : {},
      useBaseline ? EXAM_DATES : [],
    );
  }, [userImports, activeArchive.useDemoBaseline]);

  const ruleContext = useMemo(
    () =>
      buildRuleContext(
        mergedArchive.observationsByDate,
        mergedArchive.examDates,
        mergedArchive.trendData,
        mergedArchive.latestImport,
      ),
    [mergedArchive],
  );

  const mergedRedFlags = useMemo(() => evaluateRedFlags(ruleContext), [ruleContext]);

  const lastImportDeltas = useMemo(() => {
    if (!mergedArchive.latestImport) return [];
    return computeImportDeltas(mergedArchive, mergedArchive.latestImport);
  }, [mergedArchive]);

  const getMergedLatest = useCallback(
    (canonicalId: string) => getLatestFromMerged(mergedArchive, canonicalId),
    [mergedArchive],
  );

  const logConsentEvent = useCallback(
    (action: string) => {
      setConsentLog((prev) => [...prev, { action, timestamp: new Date().toISOString() }]);
    },
    [setConsentLog],
  );

  const registerPdfImport = useCallback(
    (result: PdfParseResult, memberId: string) => {
      if (result.observations.length === 0) return null;
      const incoming = createImportFromPdf(result);
      setMemberArchives((prev) => {
        const current = getMemberArchive(prev, memberId);
        return {
          ...prev,
          [memberId]: {
            ...current,
            userImports: upsertUserImport(current.userImports, incoming),
            hasData: true,
          },
        };
      });
      logConsentEvent(`observations_merged:${memberId}:${incoming.reportDate}:${result.observations.length}`);
      return incoming;
    },
    [setMemberArchives, logConsentEvent],
  );

  const activateDemoArchive = useCallback(() => {
    logConsentEvent(`demo_archive_activated:${activeMember.id}`);
    const latest = DERIVED_ARCHIVES[0];
    const buildObs = (id: string): Observation | undefined => {
      const o = getLatestObservation(id);
      return o ? { ...o, provenance: { ...o.provenance, source: 'hospital_csv' as const } } : undefined;
    };
    const demoObservations = ['ldl_c', 'bmi', 'alt', 'fasting_glucose']
      .map(buildObs)
      .filter((o): o is Observation => o != null);

    patchActiveArchive({
      hasData: true,
      useDemoBaseline: true,
      lastPdfUpload: {
        fileName: 'CY-Chen-Hospital-Archive-2021-2025.csv',
        pageCount: DERIVED_ARCHIVES.length,
        textPreview: `真实档案：${DERIVED_ARCHIVES.length} 次体检，来源 hosptial_data 结构化导出`,
        observations: demoObservations,
        metrics: demoObservations.map((o) => ({
          name: o.standardName,
          value: o.value ?? '',
          unit: o.unit,
          canonicalId: o.canonicalId ?? undefined,
        })),
        parsedAt: new Date().toISOString(),
        source: 'hospital_csv',
        reportDate: latest?.date.replace(/\./g, '-') ?? '2025-02-28',
      },
    });
    seedMemberMedications(activeMember.id, DEFAULT_MEDICATIONS);
  }, [activeMember.id, patchActiveArchive, logConsentEvent]);

  const importAgentSession = useCallback(
    (
      session: Pick<AgentSession, 'id' | 'fileName' | 'bootstrap' | 'observations'> &
        Partial<Pick<AgentSession, 'memberId' | 'source'>>,
    ) => {
      const stub: AgentSession = {
        id: session.id,
        fileName: session.fileName,
        bootstrap: {
          totalCount: session.observations.length,
          abnormalCount: session.observations.filter((o) => o.abnormalFlag != null).length,
          riskLevel: 'low',
          reportDate: session.bootstrap.reportDate,
        },
        observations: session.observations,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: session.source ?? 'pdf_extract',
        redFlags: [],
        items: [],
        chatMessages: [],
        aiConsentGranted: true,
        sync: { eligible: true },
        interpretStatus: 'done',
        memberId: session.memberId ?? activeMember.id,
      };
      const targetMemberId = session.memberId ?? activeMember.id;
      setMemberArchives((prev) => {
        const current = getMemberArchive(prev, targetMemberId);
        return {
          ...prev,
          [targetMemberId]: {
            ...current,
            userImports: mergeAgentSessionIntoImports(current.userImports, stub),
            hasData: true,
          },
        };
      });
      logConsentEvent(`agent_sync:${targetMemberId}:${session.id}`);
      return `agent-sync-${session.id}`;
    },
    [activeMember.id, setMemberArchives, logConsentEvent],
  );

  const importPdfFile = useCallback(
    async (file: File, memberId?: string) => {
      const targetId = memberId ?? activeMember.id;
      const { parsePdfFile } = await import('@/src/lib/pdfParser');
      const result = await parsePdfFile(file);
      logConsentEvent(`pdf_import:${targetId}:${file.name}`);
      registerPdfImport(result, targetId);
      patchMemberArchive(targetId, { lastPdfUpload: result, hasData: true });
      return result;
    },
    [activeMember.id, logConsentEvent, registerPdfImport, patchMemberArchive],
  );

  const importReportFiles = useCallback(
    async (files: File[], memberId?: string) => {
      const targetId = memberId ?? activeMember.id;
      const { parseReportToPdfResult } = await import('@/src/lib/batchReportImport');
      const results: import('@/src/lib/batchReportImport').BatchImportFileResult[] = [];
      let lastUpload: PdfParseResult | null = null;

      for (const file of files) {
        try {
          const result = await parseReportToPdfResult(file);
          registerPdfImport(result, targetId);
          logConsentEvent(`report_import:${targetId}:${file.name}`);
          const abnormal = result.observations.filter((o) => o.abnormalFlag != null);
          results.push({
            fileName: file.name,
            ok: true,
            reportDate: result.reportDate,
            observationCount: result.observations.length,
            abnormalCount: abnormal.length,
            topAbnormal: abnormal.slice(0, 5).map((o) => o.standardName),
            source: result.source,
            textPreview: result.textPreview,
            observations: result.observations,
          });
          lastUpload = result;
        } catch (err) {
          results.push({
            fileName: file.name,
            ok: false,
            observationCount: 0,
            abnormalCount: 0,
            topAbnormal: [],
            error: err instanceof Error ? err.message : '导入失败',
          });
        }
      }

      if (lastUpload) {
        patchMemberArchive(targetId, { lastPdfUpload: lastUpload, hasData: true });
      }

      return {
        results,
        totalFiles: files.length,
        successCount: results.filter((r) => r.ok).length,
        totalObservations: results.reduce((s, r) => s + r.observationCount, 0),
        totalAbnormal: results.reduce((s, r) => s + r.abnormalCount, 0),
        lastUpload,
      };
    },
    [activeMember.id, logConsentEvent, registerPdfImport, patchMemberArchive],
  );

  const switchMember = useCallback(
    (memberId: string) => {
      if (!members.some((m) => m.id === memberId)) return;
      setActiveMemberId(memberId);
      logConsentEvent(`member_switch:${memberId}`);
    },
    [members, setActiveMemberId, logConsentEvent],
  );

  const addMember = useCallback(
    (input: AddMemberInput): FamilyMember => {
      const member: FamilyMember = {
        id: createMemberId(),
        name: input.name.trim(),
        relation: input.relation,
        gender: input.gender,
        birthYear: input.birthYear,
        createdAt: new Date().toISOString(),
      };
      setMembers((prev) => [...prev, member]);
      setMemberArchives((prev) => ({
        ...prev,
        [member.id]: createEmptyMemberArchive(),
      }));
      logConsentEvent(`member_added:${member.id}:${member.name}`);
      return member;
    },
    [setMembers, setMemberArchives, logConsentEvent],
  );

  const updateMember = useCallback(
    (memberId: string, patch: Partial<Pick<FamilyMember, 'name' | 'relation' | 'gender' | 'birthYear'>>) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...patch, name: patch.name?.trim() ?? m.name } : m)),
      );
    },
    [setMembers],
  );

  const removeMember = useCallback(
    (memberId: string): boolean => {
      if (members.length <= 1) return false;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMemberArchives((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      if (activeMemberId === memberId) {
        const remaining = members.filter((m) => m.id !== memberId);
        setActiveMemberId(remaining[0]?.id ?? '');
      }
      logConsentEvent(`member_removed:${memberId}`);
      return true;
    },
    [members, activeMemberId, setMembers, setMemberArchives, setActiveMemberId, logConsentEvent],
  );

  return (
    <AppContext.Provider
      value={{
        hasData,
        setHasData,
        activateDemoArchive,
        userRemarks,
        setUserRemarks,
        lastPdfUpload,
        setLastPdfUpload,
        importPdfFile,
        importReportFiles,
        dataProcessingConsent,
        setDataProcessingConsent,
        aiConsentGranted,
        setAiConsentGranted,
        logConsentEvent,
        consentLog,
        userImports,
        mergedArchive,
        ruleContext,
        mergedRedFlags,
        getMergedLatest,
        lastImportDeltas,
        importAgentSession,
        members,
        activeMember,
        activeMemberId,
        switchMember,
        addMember,
        updateMember,
        removeMember,
        memberHasData,
        activeMemberUseDemoBaseline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function useHealthArchive() {
  const {
    mergedArchive,
    ruleContext,
    mergedRedFlags,
    getMergedLatest,
    lastImportDeltas,
    userImports,
    activeMember,
    activeMemberUseDemoBaseline,
    hasData,
  } = useAppContext();
  return {
    archive: mergedArchive,
    trendData: mergedArchive.trendData,
    data4Y: mergedArchive.data4Y,
    ruleContext,
    redFlags: mergedRedFlags,
    topRedFlags: (limit = 5) => topRedFlags(ruleContext, limit),
    getLatest: getMergedLatest,
    importDeltas: lastImportDeltas,
    userImports,
    activeMember,
    activeMemberUseDemoBaseline,
    hasData,
  };
}

export function useActiveMemberName(): string {
  return useAppContext().activeMember.name;
}
