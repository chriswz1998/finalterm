import React, { useState, useEffect } from 'react';
import { 
  Languages, 
  Sparkles, 
  ShieldCheck, 
  Microscope,
  Clock,
  Activity,
  Info,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { translateMedicalToFamily, fetchLlmStatus, isGeminiApiError, TranslationResult, RagInterpretResult, type LlmStatus } from '@/src/services/geminiService';
import { SAMPLE_TRANSLATIONS, TRANSLATION_PRESETS } from '@/src/data/sampleTranslations';
import { useAppContext, useHealthArchive } from '@/src/context/AppContext';
import { runRagInterpretation } from '@/src/lib/ragInterpretClient';
import { KNOWLEDGE_BY_ID } from '@/src/data/knowledge/index';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';
import { ErrorBanner } from '@/src/components/ErrorBanner';
import ReactMarkdown from 'react-markdown';

export const TranslationBoard = () => {
  const { aiConsentGranted, setAiConsentGranted, logConsentEvent } = useAppContext();
  const { archive, redFlags } = useHealthArchive();
  const [medicalTerm, setMedicalTerm] = useState('');
  const [value, setValue] = useState('');
  const [ragMode, setRagMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [ragResult, setRagResult] = useState<RagInterpretResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedPreset, setUsedPreset] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const [consentHighlight, setConsentHighlight] = useState(false);

  const allObservations = Object.values(archive.observationsByDate).flat();

  useEffect(() => {
    fetchLlmStatus()
      .then(setLlmStatus)
      .catch(() => setLlmStatus(null));
  }, []);

  const handleTranslate = async () => {
    if (!medicalTerm || !value) {
      setError('请先填写或点击快捷案例选择指标名称与数值。');
      return;
    }
    if (!aiConsentGranted) {
      setConsentHighlight(true);
      setError('请勾选下方「同意将指标与档案摘要发送至 LLM」后再执行解读。');
      return;
    }
    if (ragMode && llmStatus && !llmStatus.configured) {
      setError(
        'LLM 未配置。请在 .env.local 设置 DASHSCOPE_API_KEY（百炼），保存后重启 npm run dev。',
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    setUsedPreset(false);
    setRagResult(null);
    logConsentEvent(`ai_translate:${medicalTerm}${ragMode ? ':rag' : ''}`);
    try {
      if (ragMode) {
        const res = await runRagInterpretation({
          observations: allObservations,
          redFlags,
          medicalTerm,
          value,
        });
        setRagResult(res);
        setResult(res);
      } else {
        const res = await translateMedicalToFamily(medicalTerm, value);
        setResult(res);
      }
    } catch (err) {
      const message = isGeminiApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : '解读请求失败，请确认已运行 npm run dev 并访问 http://localhost:3000';
      setError(message);
      setResult(null);
      setRagResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Title & Introduction */}
      <div className="border-b-2 border-[#1A1A1A] pb-6">
        <h1 className="text-5xl font-serif tracking-tight text-[#1A1A1A]">说人话·异常指标解析层</h1>
        <p className="text-sm opacity-60 mt-3 font-serif leading-relaxed max-w-4xl">
          解决你“体检指标看不明白”、又“焦虑不想折腾跑医院”的痛点。
          预设案例为离线样例；「档案 RAG 模式」会结合 L2–L6 知识库片段与您的合并档案后再调用百炼/混元。
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {llmStatus && (
        <p
          className={cn(
            'text-[11px] font-serif px-4 py-2 border',
            llmStatus.configured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900',
          )}
        >
          {llmStatus.configured
            ? `LLM 已就绪：${llmStatus.label}（${llmStatus.model}）`
            : 'LLM 未配置或未连上 API — 请运行 npm run dev 并检查 .env.local'}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Input Panel - lg:col-span-4 */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white border-t-4 border-[#1A1A1A] p-8 shadow-[10px_10px_0px_0px_rgba(26,26,26,0.03)] border-x border-b border-[#1A1A1A]/10">
            <div className="flex items-center gap-2 mb-6 text-[#1A1A1A]">
              <Microscope className="w-5 h-5 text-neutral-800" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">指标分析与智能解析</h3>
            </div>
            
            {/* Quick Presets */}
            <div className="mb-8">
              <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-[#1A1A1A]/40 mb-3 block">快捷测试经典案例：</span>
              <div className="flex flex-wrap gap-2">
                {TRANSLATION_PRESETS.map(item => (
                  <button 
                    key={item.key}
                    type="button"
                    onClick={() => { 
                      setMedicalTerm(item.term); 
                      setValue(item.val);
                      setResult(SAMPLE_TRANSLATIONS[item.key]);
                      setUsedPreset(true);
                      setError(null);
                    }}
                    className={cn(
                      "px-3 py-1.5 border text-[10px] font-bold tracking-tight transition-all rounded-sm flex items-center gap-1",
                      medicalTerm === item.term 
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                        : "border-[#1A1A1A]/10 hover:border-[#1A1A1A] text-[#1A1A1A]"
                    )}
                  >
                    {item.label}
                    <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1A1A1A]/40 mb-2 block">
                  体检异常指标名称
                </label>
                <input 
                  type="text" 
                  value={medicalTerm}
                  onChange={(e) => setMedicalTerm(e.target.value)}
                  placeholder="例如：皮质醇 / 尿蛋白 / 糖化血红蛋白"
                  className="w-full px-0 py-3 bg-transparent border-b border-[#1A1A1A]/10 focus:outline-none focus:border-[#1A1A1A] transition-all text-sm font-serif"
                />
              </div>
              
              <div>
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1A1A1A]/40 mb-2 block">
                  检测指标实测数值
                </label>
                <input 
                  type="text" 
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="例如：6.8 mmol/L 或 2+"
                  className="w-full px-0 py-3 bg-transparent border-b border-[#1A1A1A]/10 focus:outline-none focus:border-[#1A1A1A] transition-all text-sm font-serif"
                />
              </div>

              <label className="flex gap-2 items-start cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={ragMode}
                  onChange={(e) => setRagMode(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[10px] font-serif text-neutral-500 leading-relaxed">
                  档案 RAG 模式：检索 L2–L6 知识片段 + 合并档案红旗后再解读（推荐）。
                </span>
              </label>

              <label
                className={cn(
                  'flex gap-2 items-start cursor-pointer pt-2 rounded-sm p-2 -m-2 transition-colors',
                  consentHighlight && !aiConsentGranted && 'bg-amber-50 border border-amber-300',
                )}
              >
                <input
                  type="checkbox"
                  checked={aiConsentGranted}
                  onChange={(e) => {
                    setAiConsentGranted(e.target.checked);
                    setConsentHighlight(false);
                    if (e.target.checked) logConsentEvent('ai_consent_granted_translation');
                  }}
                  className="mt-0.5"
                />
                <span className="text-[10px] font-serif text-neutral-500 leading-relaxed">
                  同意将指标与档案摘要经服务端代理发送至 LLM（百炼 / 混元）进行解读。
                  {!aiConsentGranted && (
                    <span className="block text-amber-800 mt-1">必选 — 勾选后才能发起在线解读</span>
                  )}
                </span>
              </label>

              <div className="pt-4">
                <button 
                  onClick={() => void handleTranslate()}
                  disabled={isLoading || !medicalTerm || !value}
                  className="w-full py-4 bg-[#1A1A1A] text-white rounded-none font-bold text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black disabled:opacity-30 transition-all shadow-md active:translate-y-px"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  执行“说人话”智能解读
                </button>
              </div>
            </div>
          </div>

          <div className="p-8 bg-[#F2F1EF]/60 border-l-4 border-neutral-400 space-y-4">
            <div className="flex items-center gap-2 text-[#1A1A1A]">
              <ShieldCheck className="w-5 h-5 text-emerald-800" />
              <h4 className="text-[11px] font-bold uppercase tracking-widest">隐私安全与临床准则</h4>
            </div>
            <p className="text-[11px] font-serif text-[#1A1A1A]/70 leading-relaxed">
              预设案例可在离线环境浏览。在线 AI 解读经服务端代理调用，API 密钥不会暴露在前端。
            </p>
          </div>
        </div>

        {/* Result Area - lg:col-span-8 */}
        <div className="lg:col-span-8">
          {usedPreset && result && (
            <p className="mb-3 text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 inline-block">
              当前为离线预设样例 — 点击「执行智能解读」可获取 AI 个性化解读
            </p>
          )}
          {isLoading ? (
            <div className="h-full min-h-[500px] border border-[#1A1A1A]/10 border-dashed flex flex-col items-center justify-center text-[#1A1A1A]/20 bg-white p-12">
              <div className="w-12 h-12 border-2 border-[#1A1A1A]/10 border-t-[#1A1A1A] rounded-full animate-spin mb-6" />
              <p className="font-serif text-sm tracking-wide text-[#1A1A1A]/60">
                {ragMode
                  ? `正在 RAG 解读（知识库检索 + ${llmStatus?.label ?? 'LLM'}），通常需 10–20 秒…`
                  : '正在调用医学翻译模型，核对临床指南与个人习惯偏置数据...'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-2 font-mono">Comparing transient metrics vs clinical base state...</p>
            </div>
          ) : result ? (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 bg-white border border-[#1A1A1A] shadow-[15px_15px_0px_0px_rgba(26,26,26,0.015)]">
              
              {/* Header Panel with Dual Nature Flagging */}
              <div className={cn(
                "p-10 border-b border-[#1A1A1A]/10 relative overflow-hidden",
                result.nature === 'transient' ? 'bg-[#FFFCF3]' : 'bg-[#F9FAF9]'
              )}>
                {/* Nature Badge */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    {result.nature === 'transient' ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-sm">
                        <Clock className="w-3.5 h-3.5" />
                        一过性暂时性波动 (Transient Aberration)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-neutral-100 border border-neutral-300 text-neutral-800 text-[10px] font-black uppercase tracking-wider rounded-sm">
                        <Activity className="w-3.5 h-3.5" />
                        长期盯防硬资产 (Persistent Clinical Metric)
                      </span>
                    )}

                    <span className={cn(
                      "px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-sm",
                      result.severity === 'low' ? "bg-emerald-50 border border-emerald-200 text-emerald-800" :
                      result.severity === 'medium' ? "bg-amber-50 border border-amber-200 text-amber-700" :
                      "bg-rose-50 border border-rose-200 text-rose-800"
                    )}>
                      程度: {result.severity === 'low' ? '趋势平稳' : result.severity === 'medium' ? '需要关注' : '中高危警觉'}
                    </span>
                  </div>

                  <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">
                    Health Translation layer v2.5
                  </span>
                </div>

                <h2 className="text-3xl font-serif text-[#1A1A1A] tracking-tight mb-4">{result.title}</h2>
                
                {/* Visual Description Panel */}
                <div className="p-4 bg-white/60 border border-black/5 rounded-none flex items-start gap-3 mt-4">
                  <Info className={cn("w-4 h-4 mt-0.5 shrink-0", result.nature === 'transient' ? 'text-amber-700' : 'text-neutral-700')} />
                  <div>
                    <h5 className="text-[11px] font-black text-[#1A1A1A] uppercase tracking-wider mb-1">
                      {result.nature === 'transient' ? '💡 别被数据吓着了！可能只是昨夜一顿饭/熬了夜' : '🩺 医生建议核心资产：这需要你拉长维度盯防'}
                    </h5>
                    <p className="text-[11px] text-[#1A1A1A]/70 leading-relaxed font-serif">
                      {result.natureExplanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main "Family Language" Decodation Block */}
              <div className="p-10 border-b border-[#1A1A1A]/5 space-y-6">
                <div className="flex items-center gap-2 text-[#1A1A1A]/40">
                  <CheckCircle2 className="w-4 h-4 text-[#1A1A1A]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">临床报告解构 · 说人话说明单</span>
                </div>
                
                <div className="prose prose-slate max-w-none text-[#1A1A1A] leading-relaxed font-serif text-[15px] space-y-4">
                  <ReactMarkdown>{result.familyExplanation}</ReactMarkdown>
                </div>
              </div>

              {/* Mechanical / Scientific Reason Explained Warmly */}
              <div className="p-10 bg-[#F2F1EF]/30 border-b border-[#1A1A1A]/5 space-y-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/40">生化原理解析 (Why it spiked)</span>
                </div>
                <div className="bg-white p-6 border border-neutral-200">
                  <p className="text-xs text-neutral-600 font-serif leading-relaxed">
                    {result.abnormalReason}
                  </p>
                </div>
              </div>

              {/* Actionable Steps / Recovery Milestones */}
              <div className="p-10 bg-[#F2F1EF]/50">
                {ragResult?.citations?.length ? (
                  <div className="mb-10 pb-8 border-b border-[#1A1A1A]/10">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/40 mb-4">
                      知识库引用 (RAG Citations)
                    </h3>
                    <div className="space-y-3">
                      {ragResult.citations.map((c) => {
                        const chunk = KNOWLEDGE_BY_ID.get(c.chunkId);
                        return (
                          <div key={c.chunkId} className="p-4 bg-white border border-[#1A1A1A]/10 text-xs font-serif">
                            <span className="font-mono text-[10px] text-neutral-400 block mb-1">{c.chunkId}</span>
                            <strong className="text-[#1A1A1A]">{c.title}</strong>
                            {c.excerpt && <p className="mt-1 text-neutral-600">{c.excerpt}</p>}
                            {chunk?.source && (
                              <p className="mt-2 text-[10px] text-neutral-400">
                                来源：{chunk.source.name} · 证据等级 {chunk.source.evidenceLevel}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {ragResult.careLevel && (
                      <p className="mt-4 text-[10px] font-mono text-neutral-500">
                        照护等级 {ragResult.careLevel} · 检索片段 {ragResult.chunkIds?.length ?? 0} 条
                      </p>
                    )}
                  </div>
                ) : null}

                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]/40 mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#1A1A1A] rounded-full" /> 
                  针对该指标：您立刻可以施展的生活妙招与复测计划
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(Array.isArray(result.actionableSteps) ? result.actionableSteps : []).map((step, i) => (
                    <div 
                      key={i} 
                      className="flex flex-col justify-between p-6 bg-white border border-[#1A1A1A]/5 hover:border-[#1A1A1A]/20 transition-all rounded-sm shadow-sm"
                    >
                      <span className="text-xs font-mono font-bold text-[#1A1A1A]/30 mb-4 block">ACTION 0{i + 1}</span>
                      <p className="text-[12px] text-[#1A1A1A]/85 leading-relaxed font-serif flex-1">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full min-h-[500px] border border-[#1A1A1A]/10 flex flex-col items-center justify-center text-[#1A1A1A]/40 bg-[#F2F1EF]/10 p-12 text-center">
              <Languages className="w-16 h-16 mb-4 stroke-1 opacity-20" />
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] mb-1">异常指标一站式翻译</h4>
              <p className="text-xs text-neutral-400 font-serif max-w-md">
                在左侧录入让您困扰的体检项与具体实测数值，或者点击快捷卡片。我们陪您排雷：看看是虚惊一场的“昨夜聚餐波动”，还是需要温柔死守的“健康盯防底线”。
              </p>
            </div>
          )}
        </div>
      </div>
      <MedicalDisclaimer className="mt-8" />
    </div>
  );
};
