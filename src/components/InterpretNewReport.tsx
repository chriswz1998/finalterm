import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  Sparkles, 
  Clock, 
  Activity, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft,
  Smartphone,
  ShieldAlert,
  Inbox
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppContext } from '@/src/context/AppContext';
import { getPriorObservation } from '@/src/lib/healthArchive';
import { RedFlagPanel } from '@/src/components/RedFlagPanel';
import { EmergencyCareBanner } from '@/src/components/EmergencyCareBanner';
import { inferCareLevel } from '@/src/lib/knowledgeRetrieve';
import { buildReferenceRangeDisplay } from '@/src/lib/referenceRangeHint';
import type { Observation } from '@/src/types/observation';
import { ErrorBanner } from '@/src/components/ErrorBanner';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';
import { runRagInterpretation, runMultiModelRagInterpretation } from '@/src/lib/ragInterpretClient';
import {
  fetchBatchAnalysis,
  buildChartSeriesFromBatchResults,
  buildBatchArchiveFromResults,
  buildRedFlagsFromBatchResults,
  buildBatchLocalMeta,
  collectBatchObservations,
  type BatchImportFileResult,
  type BatchAnalysisResult,
} from '@/src/lib/batchReportImport';
import { ExamTrendChart } from '@/src/components/ExamTrendChart';
import { RaccoonAnalysisPanel } from '@/src/components/RaccoonAnalysisPanel';
import { KNOWLEDGE_BY_ID } from '@/src/data/knowledge/index';
import {
  fetchLlmStatus,
  isGeminiApiError,
  type LlmStatus,
  type RagInterpretResult,
  type MultiModelRagResult,
} from '@/src/services/geminiService';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

interface AnomalyItem {
  id: string;
  name: string;
  value: string;
  unit: string;
  type: 'danger' | 'high' | 'warning';
  label: string;
  summary: string;
  nature: 'transient' | 'persistent';
  natureExplanation: string;
  familyExplanation: string;
  abnormalReason: string;
  actionableSteps: string[];
}

export const InterpretNewReport = () => {
  const navigate = useNavigate();
  const { importReportFiles, lastPdfUpload, aiConsentGranted, setAiConsentGranted, logConsentEvent, activeMember } =
    useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'analysis'>('upload');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [activeAnomaly, setActiveAnomaly] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseHint, setParseHint] = useState<string | null>(null);
  const [ragResults, setRagResults] = useState<Record<string, RagInterpretResult>>({});
  const [ragLoadingId, setRagLoadingId] = useState<string | null>(null);
  const [ragBatchLoading, setRagBatchLoading] = useState(false);
  const [ragMultiResults, setRagMultiResults] = useState<Record<string, MultiModelRagResult>>({});
  const [ragErrors, setRagErrors] = useState<Record<string, string>>({});
  const [batchResults, setBatchResults] = useState<BatchImportFileResult[]>([]);
  const [batchAnalysis, setBatchAnalysis] = useState<BatchAnalysisResult | null>(null);
  const [batchAnalysisLoading, setBatchAnalysisLoading] = useState(false);
  const [chartHints, setChartHints] = useState<BatchAnalysisResult['chartHints']>([]);
  const [autoRagTriggered, setAutoRagTriggered] = useState(false);
  const [pendingAutoRag, setPendingAutoRag] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const [consentHighlight, setConsentHighlight] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  /** 本页本次会话是否已有上传批次或 Demo（不读历史 lastPdfUpload） */
  const hasSessionBatch = batchResults.length > 0 || isDemoMode;

  const batchArchive = useMemo(() => buildBatchArchiveFromResults(batchResults), [batchResults]);
  const batchObservations = useMemo(() => collectBatchObservations(batchResults), [batchResults]);
  const batchRedFlags = useMemo(() => buildRedFlagsFromBatchResults(batchResults), [batchResults]);
  const batchLocalMeta = useMemo(
    () => buildBatchLocalMeta(batchResults, activeMember.name),
    [batchResults, activeMember.name],
  );

  const hasBatchParse = batchObservations.length > 0;
  const batchAbnormalObs = batchObservations.filter((o) => o.abnormalFlag != null);

  useEffect(() => {
    if (step === 'analysis' && !hasSessionBatch) setStep('upload');
  }, [step, hasSessionBatch]);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  useEffect(() => {
    fetchLlmStatus()
      .then(setLlmStatus)
      .catch(() =>
        setLlmStatus({
          configured: false,
          provider: null,
          model: null,
          label: null,
          preferred: 'auto',
          dashscopeConfigured: false,
          hunyuanConfigured: false,
          geminiConfigured: false,
          apiReachable: false,
        }),
      );
  }, []);

  useEffect(() => {
    if (step !== 'analysis') return;
    fetchLlmStatus().then(setLlmStatus).catch(() => undefined);
  }, [step]);

  useEffect(() => {
    if (aiConsentGranted) setConsentHighlight(false);
  }, [aiConsentGranted]);

  const demoReportAnomalies: AnomalyItem[] = [
    {
      id: 'ldl',
      name: 'LDL-C 低密度脂蛋白胆固醇',
      value: '3.62',
      unit: 'mmol/L',
      type: 'high',
      label: 'Demo · 主要稳态高负荷异常',
      summary: 'Demo 样例数据，仅供体验 RAG 与复盘流程。',
      nature: 'persistent',
      natureExplanation: '【Demo 模式】点击「Demo：模拟 2026 体检复盘」进入，非真实导入数据。',
      familyExplanation: '此为产品演示文案，不代表您的真实体检结果。',
      abnormalReason: 'Demo 占位说明。',
      actionableSteps: ['上传真实 PDF/图片以查看本批解析结果。'],
    },
    {
      id: 'alt',
      name: 'ALT 丙氨酸氨基转移酶',
      value: '51.1',
      unit: 'U/L',
      type: 'danger',
      label: 'Demo · 转氨酶轻度偏高',
      summary: 'Demo 样例数据。',
      nature: 'transient',
      natureExplanation: '【Demo 模式】',
      familyExplanation: 'Demo 占位。',
      abnormalReason: 'Demo 占位。',
      actionableSteps: ['上传真实报告替换 Demo。'],
    },
    {
      id: 'bmi',
      name: 'BMI 体成份',
      value: '24.90',
      unit: '',
      type: 'high',
      label: 'Demo · 生活姿态重负区',
      summary: 'Demo 样例数据。',
      nature: 'persistent',
      natureExplanation: '【Demo 模式】',
      familyExplanation: 'Demo 占位。',
      abnormalReason: 'Demo 占位。',
      actionableSteps: ['上传真实报告替换 Demo。'],
    },
  ];

  const observationToAnomaly = (o: Observation): AnomalyItem => {
    const prior =
      o.canonicalId && o.reportDate
        ? getPriorObservation(batchArchive, o.canonicalId, o.reportDate)
        : undefined;
    const deltaText =
      prior?.numericValue != null && o.numericValue != null
        ? `较本批上一份 (${prior.numericValue}${o.unit ? ` ${o.unit}` : ''}) ${
            o.numericValue > prior.numericValue ? '↑' : o.numericValue < prior.numericValue ? '↓' : '→'
          }`
        : '本批首次出现或无同指标历史';
    const ref = buildReferenceRangeDisplay({
      referenceRange: o.referenceRange,
      canonicalId: o.canonicalId,
    });
    const refText =
      ref.displayRange != null
        ? ref.source === 'wst_fallback'
          ? `${ref.displayRange}（WS/T 兜底，以报告单为准）`
          : ref.displayRange
        : '—';
    return {
      id: o.id,
      name: o.standardName,
      value: o.value ?? '—',
      unit: o.unit,
      type: o.abnormalFlag === 'high' || o.abnormalFlag === 'critical' ? 'high' : o.abnormalFlag ? 'danger' : 'warning',
      label: o.abnormalFlag ? `${o.abnormalFlag} · p${o.provenance.sourcePage ?? '?'}` : `正常 · p${o.provenance.sourcePage ?? '?'}`,
      summary: `${deltaText}。参考：${refText}。`,
      nature: o.canonicalId === 'alt' ? 'transient' : 'persistent',
      natureExplanation: '【本批 PDF 结构化提取】点击下方「RAG 档案解读」结合 L2–L6 知识库与本批上传数据生成说明。',
      familyExplanation: `原始字段：${o.originalName}。置信度 ${Math.round(o.provenance.confidence * 100)}%。`,
      abnormalReason: o.abnormalFlag
        ? `规则引擎标记为 ${o.abnormalFlag}，请结合本批趋势判断是否为结构性或一过性波动。`
        : '当前值在提取逻辑下未标记异常。',
      actionableSteps: [
        '本页为结构化提取 + 规则提示，不构成诊断。',
        '携带 PDF 原件与本批摘要一并复诊。',
      ],
    };
  };

  const displayAnomalies: AnomalyItem[] = isDemoMode
    ? demoReportAnomalies
    : hasBatchParse
      ? batchAbnormalObs.map(observationToAnomaly)
      : [];

  useEffect(() => {
    if (step !== 'analysis' || displayAnomalies.length === 0) return;
    setActiveAnomaly((prev) => prev ?? displayAnomalies[0].id);
  }, [step, displayAnomalies]);

  const handleRagInterpret = async (item: AnomalyItem, useMulti = false) => {
    if (!aiConsentGranted) {
      setConsentHighlight(true);
      setError('请勾选 AI 第三方模型使用同意后再执行 RAG 解读。');
      return;
    }
    if (llmStatus && !llmStatus.configured) {
      const msg =
        'LLM 未配置。请在 .env.local 设置 DASHSCOPE_API_KEY（百炼 Qwen）或 HUNYUAN_API_KEY（腾讯混元），并重启 npm run dev:api。';
      setRagErrors((prev) => ({ ...prev, [item.id]: msg }));
      setError(msg);
      return;
    }
    setRagLoadingId(item.id);
    setError(null);
    setRagErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    logConsentEvent(`ai_rag_report:${item.name}`);
    try {
      if (useMulti) {
        const multi = await runMultiModelRagInterpretation({
          observations: batchObservations,
          redFlags: batchRedFlags,
          medicalTerm: item.name,
          value: `${item.value}${item.unit ? ` ${item.unit}` : ''}`,
        });
        setRagMultiResults((prev) => ({ ...prev, [item.id]: multi }));
        setRagResults((prev) => ({ ...prev, [item.id]: multi.primary }));
      } else {
        const res = await runRagInterpretation({
          observations: batchObservations,
          redFlags: batchRedFlags,
          medicalTerm: item.name,
          value: `${item.value}${item.unit ? ` ${item.unit}` : ''}`,
        });
        setRagResults((prev) => ({ ...prev, [item.id]: res }));
      }
    } catch (err) {
      const msg = isGeminiApiError(err)
        ? err.message
        : 'RAG 解读失败。请确认已运行 npm run dev 并访问 http://localhost:3000，且 .env.local 已配置百炼/混元。';
      setRagErrors((prev) => ({ ...prev, [item.id]: msg }));
      setError(msg);
    } finally {
      setRagLoadingId(null);
    }
  };

  const handleRagInterpretAll = async () => {
    if (!aiConsentGranted) {
      setConsentHighlight(true);
      setError('请勾选 AI 第三方模型使用同意后再执行 RAG 解读。');
      return;
    }
    if (llmStatus && !llmStatus.configured) {
      setError(
        'LLM 未配置。请在 .env.local 设置 DASHSCOPE_API_KEY（百炼 Qwen）或 HUNYUAN_API_KEY（腾讯混元），并重启 API。',
      );
      return;
    }
    setRagBatchLoading(true);
    setError(null);
    setRagErrors({});
    logConsentEvent('ai_rag_report:batch');
    try {
      const next: Record<string, RagInterpretResult> = { ...ragResults };
      const nextMulti: Record<string, MultiModelRagResult> = { ...ragMultiResults };
      for (const item of displayAnomalies) {
        const multi = await runMultiModelRagInterpretation({
          observations: batchObservations,
          redFlags: batchRedFlags,
          medicalTerm: item.name,
          value: `${item.value}${item.unit ? ` ${item.unit}` : ''}`,
        });
        nextMulti[item.id] = multi;
        next[item.id] = multi.primary;
      }
      setRagResults(next);
      setRagMultiResults(nextMulti);
    } catch (err) {
      setError(
        isGeminiApiError(err)
          ? err.message
          : '批量 RAG 解读失败，请确认 API 服务已启动且 LLM 密钥已配置（百炼/混元）。',
      );
    } finally {
      setRagBatchLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingAutoRag || step !== 'analysis' || !aiConsentGranted || !llmStatus?.configured) return;
    setPendingAutoRag(false);
    setAutoRagTriggered(true);
    void handleRagInterpretAll();
  }, [pendingAutoRag, step, aiConsentGranted, llmStatus?.configured]);

  const renderAnomalyContent = (item: AnomalyItem) => {
    const rag = ragResults[item.id];
    const multi = ragMultiResults[item.id];
    const itemLoading = ragLoadingId === item.id;
    const itemError = ragErrors[item.id];
    const nature = rag?.nature ?? item.nature;
    const familyExplanation = rag?.familyExplanation ?? item.familyExplanation;
    const abnormalReason = rag?.abnormalReason ?? item.abnormalReason;
    const actionableSteps = rag?.actionableSteps ?? item.actionableSteps;

    return (
      <>
        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/80 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={itemLoading || ragBatchLoading}
              onClick={(e) => {
                e.stopPropagation();
                void handleRagInterpret(item);
              }}
              className="px-5 py-2.5 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black disabled:opacity-30 flex items-center gap-2"
            >
              {itemLoading ? (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {itemLoading ? '正在 RAG 解读…' : rag ? '重新 RAG 解读' : 'RAG 档案解读'}
            </button>
            {rag?.provider && (
              <span className="text-[9px] font-mono text-neutral-500">
                via {rag.provider}/{rag.model}
              </span>
            )}
            {multi?.alternatives?.filter((a) => !a.error).map((alt) => (
              <span key={`${alt.provider}-${alt.model}`} className="text-[9px] font-mono text-neutral-400">
                + {alt.label ?? alt.provider}
              </span>
            ))}
          </div>

          {itemLoading && (
            <div className="flex items-center gap-3 p-3 bg-white border border-neutral-200 text-[11px] font-serif text-neutral-600">
              <span className="w-4 h-4 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin shrink-0" />
              正在检索 L2–L6 知识库并调用 {llmStatus?.label ?? 'LLM'}，通常需 5–20 秒…
            </div>
          )}

          {itemError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-[11px] font-serif text-rose-800">
              {itemError}
            </div>
          )}
        </div>

        {rag && !itemLoading && (
          <div className="px-6 py-3 bg-emerald-50/60 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              RAG 档案解读 · 照护等级 {rag.careLevel}
            </span>
            <span className="text-[10px] font-mono text-emerald-700/70">{rag.summary}</span>
          </div>
        )}

        <div className={cn(
          "px-6 py-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs",
          nature === 'transient' ? "bg-[#FFFCF3]" : "bg-[#F3F6F3]"
        )}>
          <div className="flex items-center gap-1.5 font-bold">
            {nature === 'transient' ? (
              <>
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-amber-800 bg-amber-50/60 px-1.5 py-0.5 border border-amber-200/50 uppercase tracking-tight text-[9px]">
                  一过性暂时性波动指标 (Transient)
                </span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-emerald-800 shrink-0" />
                <span className="text-emerald-800 bg-emerald-50/60 px-1.5 py-0.5 border border-emerald-200/50 uppercase tracking-tight text-[9px]">
                  长期盯防稳态硬资产指标 (Persistent)
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] text-neutral-400 font-mono leading-none">
            {nature === 'transient' ? "可能受近期熬夜饮食影响" : "受底层基因体质合成控制"}
          </span>
        </div>

        <div className="p-8 space-y-6">
          {!rag && !itemLoading && (
            <div className="p-4 bg-amber-50/50 border border-amber-100 text-[11px] font-serif text-neutral-600">
              {item.natureExplanation}
            </div>
          )}

          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-1">
              {rag ? 'RAG 临床说人话转译' : '结构化提取摘要'}
            </span>
            <div className="prose prose-sm max-w-none font-serif text-[#1a1a1a] text-sm leading-relaxed space-y-3 italic">
              <ReactMarkdown>{familyExplanation}</ReactMarkdown>
            </div>
          </div>

          <div className="p-4 bg-white border border-neutral-200/60 font-serif text-[11px] text-neutral-500 leading-relaxed">
            <strong className="text-[#1A1A1A] block font-sans text-[10px] uppercase tracking-wider mb-1">
              微观生化原理解析 (Why)
            </strong>
            {abnormalReason}
          </div>

          {rag?.citations?.length ? (
            <div className="space-y-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 block">
                知识库引用
              </span>
              {rag.citations.map((c) => {
                const chunk = KNOWLEDGE_BY_ID.get(c.chunkId);
                return (
                  <div key={c.chunkId} className="p-3 bg-white border border-neutral-100 text-[11px] font-serif">
                    <span className="font-mono text-[9px] text-neutral-400 block">{c.chunkId}</span>
                    <strong>{c.title}</strong>
                    {c.excerpt && <p className="mt-1 text-neutral-600">{c.excerpt}</p>}
                    {chunk?.source && (
                      <p className="mt-1 text-[9px] text-neutral-400">
                        来源：{chunk.source.name} · {chunk.source.evidenceLevel}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-3 pt-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1a1a1a] block mb-2">
              🛡️ 推荐生活自纠偏路径 (无压自控路线)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {actionableSteps.map((stepText, idx) => (
                <div key={idx} className="p-4 bg-white border border-neutral-100 rounded-sm hover:shadow-sm transition-all flex flex-col justify-between">
                  <span className="text-[9px] font-mono text-neutral-300 font-bold block mb-2">
                    ACTION 0{idx + 1}
                  </span>
                  <p className="text-[11px] font-serif text-[#1A1A1A]/90 leading-normal flex-1">
                    {stepText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length) void processFiles(files);
  };

  const processFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setIsDemoMode(false);
    setProgress(0);
    setError(null);
    setRagResults({});
    setRagMultiResults({});
    setRagErrors({});
    setBatchAnalysis(null);
    setAutoRagTriggered(false);
    const interval = setInterval(() => {
      setProgress((p) => (p === null || p >= 90 ? 90 : p + 8));
    }, 200);
    try {
      const summary = await importReportFiles(list);
      setBatchResults(summary.results);
      const hint = `成功导入 ${summary.successCount}/${summary.totalFiles} 份 · 共 ${summary.totalObservations} 项指标 · ${summary.totalAbnormal} 项异常`;
      setParseHint(hint);

      if (summary.successCount === 0) {
        const reasons = summary.results
          .filter((r) => !r.ok && r.error)
          .map((r) => `${r.fileName}：${r.error}`)
          .slice(0, 3)
          .join('\n');
        setError(
          reasons ||
            '三份文件均未解析成功。常见原因：① npm run dev 未启动 ② 扫描版 PDF 需百炼 OCR（DASHSCOPE_API_KEY）③ 请改用手机拍照 JPG 重试。',
        );
      }

      const uploadCharts = buildChartSeriesFromBatchResults(summary.results);
      setChartHints(uploadCharts);

      setProgress(100);
      setTimeout(() => {
        setStep('analysis');
        setProgress(null);
        if (aiConsentGranted) setPendingAutoRag(true);
      }, 400);

      // 办公小浣熊分析耗时 1–3 分钟，不阻塞导入完成
      if (summary.successCount >= 1) {
        setBatchAnalysisLoading(true);
        void fetchBatchAnalysis(summary.results, { memberName: activeMember.name })
          .then((analysis) => {
            setBatchAnalysis(analysis);
            // 趋势图优先用本次上传数据；仅当上传不足以成图时才用分析 API 的 chartHints
            if (analysis.chartHints?.length && uploadCharts.length === 0) {
              setChartHints(analysis.chartHints);
            }
          })
          .catch((err) => {
            setParseHint((prev) =>
              `${prev ?? ''} · 跨报告分析未完成：${err instanceof Error ? err.message : '请稍后重试'}`.trim(),
            );
          })
          .finally(() => setBatchAnalysisLoading(false));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量导入失败');
      setProgress(null);
    } finally {
      clearInterval(interval);
    }
  };

  const processPdfFile = async (file: File) => {
    await processFiles([file]);
  };

  const triggerOcrParse = () => fileInputRef.current?.click();

  const resetToUpload = () => {
    setStep('upload');
    setIsDemoMode(false);
    setBatchResults([]);
    setBatchAnalysis(null);
    setChartHints([]);
    setParseHint(null);
    setRagResults({});
    setRagMultiResults({});
    setRagErrors({});
    setActiveAnomaly(null);
    setError(null);
  };

  const triggerDemoParse = () => {
    setIsDemoMode(true);
    setBatchResults([]);
    setBatchAnalysis(null);
    setChartHints([]);
    setParseHint('Demo 模式：展示样例解读（非真实导入数据）');
    setStep('analysis');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Dynamic Header */}
      <div className="flex justify-between items-start border-b border-[#1A1A1A]/10 pb-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-800 bg-amber-50 px-2.5 py-1 border border-amber-200">
            档案高级分析：报告复盘
          </span>
          <h1 className="text-4xl font-serif mt-3 text-[#1A1A1A] tracking-tight">复盘已归档报告</h1>
          <p className="text-xs text-neutral-500 font-serif mt-1">
            这里不再作为新报告主入口；适合在 Agent 同步归档后，对异常项、历史差异与 RAG 证据做高级复盘。
          </p>
          {lastPdfUpload && step === 'upload' && (
            <p className="text-[10px] font-mono text-neutral-400 mt-2">
              档案中曾有导入：{lastPdfUpload.fileName}（本页需重新上传才会显示本批清单）
            </p>
          )}
        </div>
        {step === 'analysis' && (
          <button 
            type="button" 
            onClick={resetToUpload}
            className="px-4 py-2 border border-[#1A1A1A] hover:bg-neutral-50 transition-all text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> 重新上传
          </button>
        )}
      </div>

      {error && (
        <div ref={errorRef}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
      {parseHint && step === 'analysis' && (
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 font-serif">{parseHint}</p>
      )}

      {step === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) void processFiles(files);
              e.target.value = '';
            }}
          />
          <div className="lg:col-span-8 space-y-6">
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed h-96 flex flex-col items-center justify-center p-8 transition-all relative",
                isDragging 
                  ? "bg-neutral-100 border-[#1A1A1A]" 
                  : "bg-white hover:bg-neutral-50/50 border-neutral-300"
              )}
            >
              {progress !== null ? (
                <div className="w-full max-w-md text-center space-y-4">
                  <div className="p-3 bg-neutral-100 border border-neutral-200 inline-block">
                    <Sparkles className="w-6 h-6 text-amber-800 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">正在进行临床指南比对 & 沙盒转译</h3>
                    <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                      Running local OCR. Normalizing medical terminologies...
                    </p>
                  </div>
                  <div className="h-1 bg-neutral-100 w-full">
                    <div className="h-full bg-black transition-all duration-150" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold">{progress}% parsed</span>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="p-5 bg-[#FAF9F5] border border-neutral-200 inline-block text-neutral-600">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
                      一键导入体检报告（支持多份 PDF / 图片）
                    </h4>
                    <p className="text-xs text-neutral-400 font-serif">
                      ② 百炼/混元标准化 → ③ RAG 异常解读 · 多份报告完成后由办公小浣熊（OpenClaw）做跨期分析与图表。
                    </p>
                  </div>
                  
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      type="button"
                      onClick={triggerOcrParse}
                      className="px-6 py-3 bg-[#1A1A1A] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all"
                    >
                      选择文件（可多选）
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/agent')}
                      className="px-6 py-3 border border-[#1A1A1A]/20 text-[#1A1A1A] hover:border-black text-[11px] font-bold uppercase tracking-widest bg-white transition-all"
                    >
                      Agent 单份解读
                    </button>
                    <button 
                      type="button"
                      onClick={triggerDemoParse}
                      className="px-6 py-3 border border-[#1A1A1A]/20 text-[#1A1A1A] hover:border-black text-[11px] font-bold uppercase tracking-widest bg-yellow-50/30 hover:bg-yellow-50 transition-all"
                    >
                      Demo：模拟 2026 体检复盘
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-[#F2F1EF]/40 border border-neutral-200/50 flex gap-3 text-neutral-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-800 mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed font-serif">
                <span className="font-sans font-bold text-[#1A1A1A] uppercase tracking-wider block mb-1">
                  数据处理说明
                </span>
                新报告建议先走 Agent：即时解读、追问、同步归档。此页保留为档案内复盘与批量 RAG 深挖。
              </div>
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div className="lg:col-span-4 bg-[#FAF9F5] border border-[#1A1A1A]/10 p-8 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A] border-b pb-3 border-neutral-200">
              现在的入口分工
            </h3>
            
            <div className="space-y-4 font-serif text-xs leading-relaxed text-neutral-600">
              <div className="flex gap-3">
                <span className="font-sans font-black text-amber-800 opacity-60">01</span>
                <p><strong>新报告入口：</strong>去 Agent 上传 PDF、图片或拍照，先获得可信摘要与异常项解释。</p>
              </div>
              <div className="flex gap-3">
                <span className="font-sans font-black text-amber-800 opacity-60">02</span>
                <p><strong>同步到档案：</strong>确认后把本次报告写入对应家庭成员，形成长期趋势。</p>
              </div>
              <div className="flex gap-3">
                <span className="font-sans font-black text-amber-800 opacity-60">03</span>
                <p><strong>报告复盘：</strong>在本页比较历史差异，批量 RAG 解读异常项，并整理复诊问题。</p>
              </div>
            </div>

            <div className="border-t border-dashed border-neutral-200 pt-4 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 block">上传后可见：</span>
              <p className="text-[11px] font-serif text-neutral-500 leading-relaxed">
                本批异常清单、规则红旗、指标趋势与小浣熊跨报告分析均<strong>仅来自本次上传</strong>，不含 Dashboard Demo 档案。
              </p>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Summary status block */}
          <div className="bg-amber-50/40 border border-amber-200 p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-200">
                  {isDemoMode ? 'DEMO MODE' : hasBatchParse ? '本批上传 · 已解析' : '待上传'}
                </span>
                <h3 className="text-lg font-serif mt-1 font-semibold">
                  {isDemoMode
                    ? 'Demo 样例报告（非真实导入）'
                    : hasBatchParse
                      ? `本批 ${batchLocalMeta.fileCount} 份报告 · ${batchLocalMeta.reportDatesLabel} · 已完成结构化提取`
                      : '请上传 PDF 或图片开始复盘'}
                </h3>
                <p className="text-xs text-neutral-500 font-serif">
                  {isDemoMode
                    ? 'Demo 样例；可测试 RAG 流程。上传真实报告后将替换为本批数据。'
                    : hasBatchParse
                      ? `共 ${batchLocalMeta.totalCount} 项 Observation，${batchLocalMeta.abnormalCount} 项标记异常 · 规则引擎仅基于本批`
                      : '上传后本页所有模块均来自本批次，不含 Dashboard Demo 档案。'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-[#1A1A1A] text-white px-3 py-1.5">
                  {isDemoMode
                    ? `${displayAnomalies.length} 项 Demo`
                    : hasBatchParse
                      ? `${displayAnomalies.length} 项异常待阅`
                      : '待上传'}
                </span>
              </div>
            </div>

            {batchResults.length > 0 && (
              <div className="border border-neutral-200 bg-white p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">导入批次</p>
                <ul className="text-xs font-serif space-y-1">
                  {batchResults.map((r) => (
                    <li key={r.fileName} className={r.ok ? 'text-neutral-700' : 'text-rose-700'}>
                      {r.ok ? '✓' : '✗'} {r.fileName} · {r.observationCount} 项
                      {r.abnormalCount ? ` · ${r.abnormalCount} 异常` : ''}
                      {r.error ? ` — ${r.error}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <RaccoonAnalysisPanel analysis={batchAnalysis} loading={batchAnalysisLoading} />

            {batchResults.length > 0 && (
              <div className="border border-neutral-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                  本次上传 · 指标趋势
                </p>
                <p className="text-[11px] text-neutral-500 font-serif mb-3">
                  仅基于本批次导入的报告，不含 Demo 历史档案。
                </p>
                <ExamTrendChart chartHints={chartHints ?? []} />
              </div>
            )}

            {llmStatus && (
              <div
                className={cn(
                  'p-3 border text-[11px] font-serif',
                  llmStatus.apiReachable === false
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : llmStatus.configured
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900',
                )}
              >
                {llmStatus.apiReachable === false ? (
                  <>
                    API 服务未连接。请在终端运行{' '}
                    <code className="font-mono text-[10px]">cd health-link && npm run dev</code>，并访问{' '}
                    <strong>http://localhost:3000</strong>（不是 5174 / 3006）。
                  </>
                ) : llmStatus.configured ? (
                  <>
                    LLM 已就绪：<strong>{llmStatus.label}</strong>（{llmStatus.model}）· 策略 {llmStatus.preferred}
                  </>
                ) : (
                  <>
                    LLM 未配置。请在 <code className="font-mono text-[10px]">.env.local</code> 设置{' '}
                    <strong>DASHSCOPE_API_KEY</strong>（百炼）或 <strong>HUNYUAN_API_KEY</strong>（混元），保存后重启{' '}
                    <code className="font-mono text-[10px]">npm run dev</code>。
                  </>
                )}
              </div>
            )}

          </div>

          <EmergencyCareBanner careLevel={inferCareLevel(batchRedFlags)} redFlags={batchRedFlags} />

          {batchRedFlags.length > 0 && !isDemoMode && (
            <RedFlagPanel flags={batchRedFlags} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side: Anomaly List (2 Cols on large screen) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                  本批上传 · 异常项清单
                </span>
                <span className="text-[9px] font-sans text-neutral-400 italic">* 来自 PDF 提取，非医院诊断结论</span>
              </div>

              {displayAnomalies.length === 0 && !isDemoMode && (
                <div className="flex flex-col items-center gap-4 px-6 py-12 border-2 border-dashed border-neutral-300 bg-neutral-50 text-center rounded-sm">
                  <Inbox className="w-10 h-10 text-neutral-400" />
                  <p className="text-sm font-serif text-neutral-800 font-medium">
                    {hasBatchParse
                      ? `本批已解析 ${batchLocalMeta.totalCount} 项，无异常标记项`
                      : '本批异常项清单为空'}
                  </p>
                  <p className="text-xs text-neutral-500 font-serif max-w-md leading-relaxed">
                    {hasBatchParse
                      ? '清单仅展示 PDF 中带 ↑/↓ 或超出参考范围的指标。若应有异常却为空，请检查解析是否完整，或点击右上角「重新上传」。'
                      : '请在本页上传 PDF/图片；上传成功且检出异常后，才会出现可展开的指标卡片与 RAG 解读按钮。'}
                  </p>
                  {!hasBatchParse && (
                    <button
                      type="button"
                      onClick={triggerOcrParse}
                      className="px-5 py-2.5 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black"
                    >
                      选择文件上传
                    </button>
                  )}
                </div>
              )}

              {displayAnomalies.map((item) => {
                const isOpen = activeAnomaly === item.id;
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "bg-white border transition-all duration-300",
                      isOpen 
                        ? "border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,0.03)]" 
                        : "border-neutral-200 hover:border-[#1A1A1A]/40"
                    )}
                  >
                    {/* Header bar of metric */}
                    <div 
                      onClick={() => setActiveAnomaly(isOpen ? null : item.id)}
                      className="p-6 flex justify-between items-center cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-3 h-3 rounded-full animate-pulse shrink-0",
                          item.type === 'danger' ? "bg-rose-500" : "bg-orange-500"
                        )} />
                        <div>
                          <h4 className="font-bold text-sm tracking-tight text-[#1A1A1A]">{item.name}</h4>
                          <p className="text-[10px] text-neutral-400 font-serif mt-0.5">{item.label}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right font-mono">
                          <span className="text-lg font-bold text-neutral-800">{item.value}</span>
                          <span className="text-[10px] text-neutral-500 ml-1">{item.unit}</span>
                        </div>
                        <div className="p-1 border bg-neutral-50 hover:bg-neutral-100">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Integrated decodation content - Never jumps! */}
                    {isOpen && (
                      <div className="border-t border-[#1A1A1A]/10 bg-[#FCFBF8]/40 animate-in fade-in duration-300">
                        {renderAnomalyContent(item)}
                      </div>
                    )}
                  </div>
                );
              })}

              {(displayAnomalies.length > 0 || isDemoMode) && (
                <div className="border border-neutral-200 bg-white p-5 space-y-4 mt-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">RAG 解读</p>
                  <label
                    className={cn(
                      'flex gap-2 items-start cursor-pointer',
                      consentHighlight && !aiConsentGranted && 'p-3 bg-amber-50 border border-amber-300 rounded-sm',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={aiConsentGranted}
                      onChange={(e) => {
                        setAiConsentGranted(e.target.checked);
                        setConsentHighlight(false);
                        if (e.target.checked) logConsentEvent('ai_consent_granted_report');
                      }}
                      className="mt-0.5"
                    />
                    <span className="text-[10px] font-serif text-neutral-600 leading-relaxed">
                      同意将<strong>本批</strong>指标经服务端代理发送至 LLM 进行 RAG 解读（不含 Demo 历史档案）。
                      {!aiConsentGranted && (
                        <span className="block text-amber-800 mt-1">必选 — 勾选后再点解读按钮</span>
                      )}
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={ragBatchLoading || ragLoadingId != null || displayAnomalies.length === 0}
                    onClick={() => void handleRagInterpretAll()}
                    className="px-5 py-2.5 border border-[#1A1A1A] text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-50 disabled:opacity-30 flex items-center gap-2"
                  >
                    {ragBatchLoading ? (
                      <span className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    批量 RAG 解读全部异常项（{displayAnomalies.length}）
                  </button>
                </div>
              )}
            </div>

            {/* Right side: Report metadata context */}
            <div className="lg:col-span-1 space-y-6">
              
              <div className="bg-neutral-50 border border-[#1A1A1A] p-6 space-y-5">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 block border-b pb-2">
                  本批报告 Meta
                </span>
                
                <div className="space-y-4 font-mono text-[11px]">
                  <div>
                    <span className="opacity-40 block">检验机构</span>
                    <strong className="font-serif text-xs font-semibold block text-[#1a1a1a]">
                      {isDemoMode ? 'Demo 样例' : batchLocalMeta.institution}
                    </strong>
                  </div>
                  <div>
                    <span className="opacity-40 block">报告日期</span>
                    <strong>{isDemoMode ? '—' : batchLocalMeta.reportDatesLabel}</strong>
                  </div>
                  <div>
                    <span className="opacity-40 block">受检对象</span>
                    <strong>{batchLocalMeta.subjectName}</strong>
                  </div>
                  <div>
                    <span className="opacity-40 block">本批文件</span>
                    <strong>{isDemoMode ? '0 份' : `${batchLocalMeta.fileCount} 份 · ${batchLocalMeta.sourceLabel}`}</strong>
                  </div>
                  <div>
                    <span className="opacity-40 block">指标统计</span>
                    <strong className="text-emerald-700">
                      {isDemoMode
                        ? 'Demo'
                        : `${batchLocalMeta.normalCount} 项正常 / ${batchLocalMeta.totalCount} 项合计 · ${batchLocalMeta.abnormalCount} 项异常`}
                    </strong>
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed border-neutral-200">
                  <div className="p-3.5 bg-neutral-100 text-[10px] font-mono leading-normal text-neutral-500">
                    {isDemoMode ? '>>> Demo · 无本地签章' : `>>> 本批 ${batchLocalMeta.fileCount} 份 · 浏览器本地解析`}
                  </div>
                </div>
              </div>

              <div className="p-6 border border-neutral-200 bg-[#FAF9F5]/40 text-center">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a] mb-2">
                  您觉得怎么样？
                </h4>
                <p className="text-[11px] text-neutral-500 font-serif leading-relaxed mb-4">
                  如对指标转译仍有疑惑，可一键将其合并记入「就诊主诉」，随下周复诊档案导出给主治医师讨论。
                </p>
                <button 
                  type="button"
                  className="w-full py-2.5 bg-[#1A1A1A] text-white hover:bg-black text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40"
                  disabled={isDemoMode || displayAnomalies.length === 0}
                  onClick={() => {
                    alert(
                      `已将本批 ${displayAnomalies.length} 项指标摘要记入「${activeMember.name}」复诊备忘录（${batchLocalMeta.reportDatesLabel}）。`,
                    );
                  }}
                >
                  推送至复诊备忘录
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      <MedicalDisclaimer className="mt-8" />
    </div>
  );
};
