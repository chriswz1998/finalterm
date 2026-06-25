import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Loader2, MessageCircle, Upload } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getAgentSession, saveAgentSession } from '@/src/agent/agentSession';
import { useAppContext } from '@/src/context/AppContext';
import {
  agentInterpretItems,
  agentInterpretSummary,
  AgentApiError,
} from '@/src/agent/agentClient';
import { pickInterpretTargets } from '@/src/agent/agentRules';
import type { AgentSession } from '@/src/agent/types';
import { AgentBehaviorContextSection } from '@/src/agent/components/AgentBehaviorContextSection';
import { AgentChat } from '@/src/agent/components/AgentChat';
import { AgentCitationList, CareLevelBadge } from '@/src/agent/components/AgentCitationList';
import { AgentRawReportSection } from '@/src/agent/components/AgentRawReportSection';
import { EmergencyCareBanner } from '@/src/components/EmergencyCareBanner';
import { inferCareLevel } from '@/src/lib/knowledgeRetrieve';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';

const RISK_STYLE = {
  low: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  medium: 'bg-amber-50 border-amber-200 text-amber-900',
  high: 'bg-rose-50 border-rose-200 text-rose-900',
};

export function AgentResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { importAgentSession } = useAppContext();
  const [session, setSession] = useState<AgentSession | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const s = getAgentSession(sessionId);
    if (!s) {
      navigate('/agent', { replace: true });
      return;
    }
    setSession(s);
    setSyncDone(Boolean(s.sync.syncedAt));
  }, [sessionId, navigate]);

  const runInterpretPipeline = useCallback(async (s: AgentSession) => {
    let current: AgentSession = { ...s, interpretStatus: 'summary_loading' };
    setSession(current);
    saveAgentSession(current);

    try {
      if (!current.summary) {
        const summaryRes = await agentInterpretSummary(current.observations, current.redFlags);
        current = {
          ...current,
          summary: summaryRes.summary,
          headline: summaryRes.headline,
          followUpHint: summaryRes.followUpHint,
          riskLevel: summaryRes.riskLevel,
          careLevel: summaryRes.careLevel,
          summaryCitations: summaryRes.citations,
          summaryChunkIds: summaryRes.chunkIds,
          interpretStatus: 'items_loading',
        };
        setSession(current);
        saveAgentSession(current);
      }

      const pending = current.items.filter((i) => i.status !== 'done');
      if (pending.length > 0) {
        const targets = pickInterpretTargets(current.observations, 5).map((o) => ({
          observationId: o.id,
          medicalTerm: o.standardName,
          value: `${o.value ?? ''}${o.unit ? ` ${o.unit}` : ''}`.trim(),
        }));

        current = {
          ...current,
          items: current.items.map((i) => ({ ...i, status: 'loading' as const })),
        };
        setSession(current);

        const itemsRes = await agentInterpretItems(current.observations, current.redFlags, targets);
        const byId = new Map(itemsRes.items.map((i) => [i.observationId, i]));

        current = {
          ...current,
          items: current.items.map((item) => {
            const got = byId.get(item.observationId);
            if (!got) return { ...item, status: 'error' as const, error: '未返回解读' };
            return {
              ...item,
              plainExplanation: got.plainExplanation,
              whyAbnormal: got.whyAbnormal,
              lifestyleTips: got.lifestyleTips ?? [],
              severity: got.severity,
              nature: got.nature,
              citations: got.citations,
              status: 'done' as const,
            };
          }),
          interpretStatus: 'done',
          sync: { ...current.sync, eligible: true },
        };
      } else {
        current = { ...current, interpretStatus: 'done', sync: { ...current.sync, eligible: true } };
      }

      setSession(current);
      saveAgentSession(current);
    } catch (err) {
      const msg = err instanceof AgentApiError ? err.message : '解读失败';
      const failed = {
        ...current,
        interpretStatus: 'error' as const,
        error: msg,
      };
      setSession(failed);
      saveAgentSession(failed);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    if (session.interpretStatus !== 'idle') return;
    void runInterpretPipeline(session);
  }, [session, runInterpretPipeline]);

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const risk = session.riskLevel ?? session.bootstrap.riskLevel;
  const careLevel = session.careLevel ?? inferCareLevel(session.redFlags);
  const isSynced = syncDone || Boolean(session.sync.syncedAt);
  const canonicalCount = session.observations.filter((o) => o.canonicalId != null).length;
  const avgConfidence =
    session.observations.length > 0
      ? session.observations.reduce((sum, o) => sum + (o.provenance.confidence ?? 0), 0) /
        session.observations.length
      : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-24">
        <EmergencyCareBanner careLevel={careLevel} redFlags={session.redFlags} />

        <div className="space-y-1">
          <p className="text-[10px] font-mono text-neutral-400 truncate">{session.fileName}</p>
          <h2 className="text-xl font-serif font-semibold">
            {session.headline ?? `共 ${session.bootstrap.totalCount} 项检验`}
          </h2>
          <p className="text-xs text-neutral-500">
            {session.bootstrap.reportDate ?? '—'} · {session.bootstrap.abnormalCount} 项异常
          </p>
        </div>

        <AgentRawReportSection
          observations={session.observations}
          reportDate={session.bootstrap.reportDate}
          source={session.source}
        />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="border border-neutral-200 bg-white p-2">
            <span className="block text-[9px] text-neutral-400 font-bold">标准化</span>
            <strong className="text-sm">{canonicalCount}/{session.observations.length}</strong>
          </div>
          <div className="border border-neutral-200 bg-white p-2">
            <span className="block text-[9px] text-neutral-400 font-bold">异常项</span>
            <strong className="text-sm">{session.bootstrap.abnormalCount}</strong>
          </div>
          <div className="border border-neutral-200 bg-white p-2">
            <span className="block text-[9px] text-neutral-400 font-bold">可信度</span>
            <strong className="text-sm">{Math.round(avgConfidence * 100)}%</strong>
          </div>
        </div>

        <div className={cn('p-3 border text-sm font-serif', RISK_STYLE[risk])}>
          <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">
            规则引擎提示 · {risk === 'high' ? '需关注' : risk === 'medium' ? '建议复查' : '整体平稳'}
          </span>
          {session.redFlags.length > 0 ? (
            <ul className="space-y-1.5 text-[12px]">
              {session.redFlags.slice(0, 4).map((f) => (
                <li key={f.ruleId}>
                  <strong>{f.title}</strong> — {f.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>未触发规则引擎红旗，仍建议结合症状与医生面诊。</p>
          )}
        </div>

        <AgentBehaviorContextSection />

        {session.interpretStatus === 'summary_loading' && (
          <div className="flex items-center gap-2 text-sm text-neutral-500 py-4 border-t border-dashed border-neutral-200">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在结合知识库生成说人话摘要…
          </div>
        )}

        {session.summary && (
          <div className="p-4 bg-white border border-neutral-200 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">说人话摘要</span>
              <CareLevelBadge level={careLevel} />
            </div>
            <p className="text-[10px] text-neutral-400 font-serif">
              对照上方原始指标，结合 L2–L6 知识库生成
              {session.summaryChunkIds?.length
                ? ` · 引用 ${session.summaryChunkIds.length} 条片段`
                : ''}
            </p>
            <p className="text-sm font-serif leading-relaxed">{session.summary}</p>
            {session.followUpHint && (
              <p className="text-[11px] text-neutral-500 border-t border-dashed pt-2">{session.followUpHint}</p>
            )}
            <AgentCitationList citations={session.summaryCitations} compact />
          </div>
        )}

        {session.items.length > 0 && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              异常项解读
              {session.interpretStatus === 'items_loading' && '（加载中…）'}
            </span>
            {session.items.map((item) => {
              const raw = session.observations.find((o) => o.id === item.observationId);
              return (
              <article key={item.observationId} className="p-4 bg-white border border-neutral-200 space-y-2">
                <div className="flex justify-between items-baseline gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold">{item.standardName}</h3>
                    {raw && raw.originalName !== item.standardName && (
                      <p className="text-[10px] text-neutral-400 truncate">报告原文：{raw.originalName}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono shrink-0">
                    {item.value}
                    {item.unit ? ` ${item.unit}` : ''}
                  </span>
                </div>
                {item.status === 'loading' && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    解读中…
                  </div>
                )}
                {item.status === 'done' && (
                  <>
                    {item.whyAbnormal && (
                      <p className="text-[11px] text-neutral-500 border-l-2 border-neutral-200 pl-2">
                        <span className="font-bold text-neutral-600">为何异常：</span>
                        {item.whyAbnormal}
                      </p>
                    )}
                    <p className="text-sm font-serif leading-relaxed">{item.plainExplanation}</p>
                    {item.lifestyleTips.length > 0 && (
                      <ul className="text-[11px] text-neutral-600 space-y-1 list-disc pl-4">
                        {item.lifestyleTips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    )}
                    <AgentCitationList citations={item.citations} compact />
                  </>
                )}
              </article>
            );
            })}
          </div>
        )}

        {session.error && (
          <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 p-3">{session.error}</p>
        )}

        <button
          type="button"
          disabled={!session.sync.eligible || isSynced}
          onClick={() => {
            const importId = importAgentSession(session);
            const updated: AgentSession = {
              ...session,
              sync: {
                eligible: true,
                syncedAt: new Date().toISOString(),
                mainArchiveImportId: importId,
              },
            };
            saveAgentSession(updated);
            setSession(updated);
            setSyncDone(true);
          }}
          className="w-full py-3 border border-[#1A1A1A] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Upload className="w-4 h-4" />
          {isSynced ? '已同步到 Health Link 档案' : '同步到 Health Link 档案'}
        </button>
        {isSynced && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate('/status')}
              className="py-2.5 text-[11px] font-bold text-emerald-800 underline"
            >
              打开主档案查看
            </button>
            <button
              type="button"
              onClick={() => navigate('/prepare')}
              className="py-2.5 text-[11px] font-bold text-[#1A1A1A] underline flex items-center justify-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              生成就诊卡
            </button>
          </div>
        )}

        <MedicalDisclaimer />
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-[#FDFCFB]/95 border-t border-neutral-200 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          disabled={!session.summary}
          className="w-full py-3.5 bg-[#1A1A1A] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <MessageCircle className="w-5 h-5" />
          继续问 Agent
        </button>
      </div>

      {chatOpen && session && (
        <AgentChat session={session} onClose={() => setChatOpen(false)} onUpdate={setSession} />
      )}
    </div>
  );
}
