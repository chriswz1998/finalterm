import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, FileUp, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { parseReportFile } from '@/src/agent/parseReport';
import { buildAgentRuleContext, pickInterpretTargets } from '@/src/agent/agentRules';
import {
  createSessionId,
  listAgentSessions,
  saveAgentSession,
} from '@/src/agent/agentSession';
import type { AgentInterpretedItem, AgentSession } from '@/src/agent/types';
import { fetchAgentHealth } from '@/src/agent/agentClient';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';
import { useAppContext } from '@/src/context/AppContext';

const STEPS = ['大模型识别报告', '提取异常指标', '知识库对照', '生成说人话解读…'];

export function AgentHome() {
  const navigate = useNavigate();
  const { activeMember } = useAppContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<AgentSession[]>([]);
  const [llmOk, setLlmOk] = useState<boolean | null>(null);

  useEffect(() => {
    setRecent(listAgentSessions(activeMember.id).slice(0, 3));
    fetchAgentHealth()
      .then((h) => setLlmOk(h.llmConfigured))
      .catch(() => setLlmOk(false));
  }, [activeMember.id]);

  const processFile = useCallback(
    async (file: File) => {
      if (!consent) {
        setError('请先勾选 AI 使用同意。');
        return;
      }
      setLoading(true);
      setError(null);
      setStepIdx(0);

      const tick = window.setInterval(() => {
        setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
      }, 1200);

      try {
        const parsed = await parseReportFile(file);
        const { redFlags, bootstrap } = buildAgentRuleContext(
          parsed.observations,
          parsed.reportDate,
          parsed.fileName,
          parsed.source,
        );
        const targets = pickInterpretTargets(parsed.observations, 5);

        const items: AgentInterpretedItem[] = targets.map((o) => ({
          observationId: o.id,
          standardName: o.standardName,
          value: o.value ?? '—',
          unit: o.unit,
          plainExplanation: '',
          whyAbnormal: '',
          lifestyleTips: [],
          severity: 'low',
          nature: 'transient',
          status: 'pending',
        }));

        const session: AgentSession = {
          id: createSessionId(),
          memberId: activeMember.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileName: parsed.fileName,
          source: parsed.source,
          observations: parsed.observations,
          redFlags,
          bootstrap,
          items,
          chatMessages: [],
          aiConsentGranted: true,
          sync: { eligible: false },
          interpretStatus: 'idle',
        };

        saveAgentSession(session);
        navigate(`/agent/result/${session.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : '解析失败');
      } finally {
        clearInterval(tick);
        setLoading(false);
      }
    },
    [consent, navigate, activeMember.id],
  );

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void processFile(file);
  };

  return (
    <div className="flex flex-col flex-1 px-4 py-6 space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-sm">
          {llmOk === false
            ? 'LLM 未就绪 — 请在 health-link/.env.local 配置 DASHSCOPE_API_KEY，运行 npm run dev，再执行 npm run check:setup'
            : llmOk
              ? '百炼已就绪 · 上传 PDF / 拍照即可解读'
              : '检查服务中…'}
        </p>
        <h2 className="text-2xl font-serif tracking-tight">上传体检报告</h2>
        <p className="text-sm text-neutral-500 font-serif leading-relaxed">
          当前成员：<strong className="text-neutral-800">{activeMember.name}</strong>
          。支持 PDF、相册图片、现场拍照。图片由<strong className="text-neutral-700">视觉大模型</strong>提取异常值，再结合知识库生成说人话解读。
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf,image/*"
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-4 border border-dashed border-neutral-300">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-sm font-serif text-neutral-600">{STEPS[stepIdx]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            disabled={!consent}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'w-full py-4 bg-[#1A1A1A] text-white text-sm font-bold flex items-center justify-center gap-2',
              !consent && 'opacity-40',
            )}
          >
            <FileUp className="w-5 h-5" />
            选择 PDF / 图片
          </button>
          <button
            type="button"
            disabled={!consent}
            onClick={() => cameraRef.current?.click()}
            className={cn(
              'w-full py-4 border border-[#1A1A1A] text-sm font-bold flex items-center justify-center gap-2',
              !consent && 'opacity-40',
            )}
          >
            <Camera className="w-5 h-5" />
            拍照上传
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 px-3 py-2">{error}</p>
      )}

      <label className="flex gap-2 items-start text-[11px] font-serif text-neutral-600 leading-relaxed">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        同意将报告指标摘要经服务端发送至 LLM（百炼/混元）进行解读与追问。
      </label>

      {recent.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-neutral-200">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">最近解读</span>
          {recent.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/agent/result/${s.id}`)}
              className="w-full text-left p-3 border border-neutral-200 bg-white hover:border-neutral-400 transition-colors"
            >
              <p className="text-xs font-bold truncate">{s.fileName}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {s.bootstrap.abnormalCount} 项异常 · {s.bootstrap.reportDate ?? '—'}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 flex items-center gap-2 text-[10px] text-neutral-400">
        <Sparkles className="w-3.5 h-3.5" />
        MVP 会话仅存本机 · 解读后可同步到主档案
      </div>

      <MedicalDisclaimer />
    </div>
  );
}
