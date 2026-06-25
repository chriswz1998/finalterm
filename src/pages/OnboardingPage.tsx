import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload,
  Sparkles,
  Database,
  ArrowRight,
} from 'lucide-react';
import { useAppContext } from '@/src/context/AppContext';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';
import { ErrorBanner } from '@/src/components/ErrorBanner';

const onboardingMilestones = [
  '📐 在浏览器本地读取 PDF 文本层...',
  '🧬 正则匹配 LDL-C、ALT、BMI 等常见指标...',
  '📊 与历史档案基准比对（若存在）...',
  '🌿 标记一过性波动 vs 长期硬资产...',
  '✨ 档案写入 localStorage，解锁全部场景...',
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const {
    importPdfFile,
    activateDemoArchive,
    dataProcessingConsent,
    setDataProcessingConsent,
    aiConsentGranted,
    setAiConsentGranted,
    logConsentEvent,
    activeMember,
  } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState<string | null>(null);

  const runProgressAnimation = () => {
    setOnboardStep(0);
    const stepInterval = setInterval(() => {
      setOnboardStep((prev) => {
        if (prev >= onboardingMilestones.length - 1) {
          clearInterval(stepInterval);
          return onboardingMilestones.length - 1;
        }
        return prev + 1;
      });
    }, 700);
    return () => clearInterval(stepInterval);
  };

  const finishOnboarding = () => {
    setIsUploading(false);
    navigate('/status');
  };

  const handlePdfFile = async (file: File) => {
    if (!dataProcessingConsent) {
      setError('请先勾选数据处理同意书后再上传 PDF。');
      return;
    }
    setIsUploading(true);
    setError(null);
    setUploadHint(null);
    const cleanup = runProgressAnimation();
    try {
      const result = await importPdfFile(file);
      const obsSummary =
        result.observations.length > 0
          ? `已识别 ${result.observations.length} 项 Observation：${result.observations.map((o) => o.standardName).join('、')}`
          : result.metrics.length > 0
            ? `已识别 ${result.metrics.length} 项指标：${result.metrics.map((m) => m.name).join('、')}`
            : 'PDF 文本已读取，但未自动识别到常见指标。您仍可手动查看各模块。';
      setUploadHint(obsSummary);
      setTimeout(finishOnboarding, 1200);
    } catch (e) {
      cleanup();
      setIsUploading(false);
      setError(e instanceof Error ? e.message : 'PDF 解析失败');
    }
  };

  const handleDemoActivate = () => {
    if (!dataProcessingConsent) {
      setError('请先勾选数据处理同意书后再加载 Demo 档案。');
      return;
    }
    setIsUploading(true);
    setError(null);
    if (aiConsentGranted) logConsentEvent('ai_consent_granted_onboarding');
    runProgressAnimation();
    setTimeout(() => {
      activateDemoArchive();
      finishOnboarding();
    }, 3600);
  };

  return (
    <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch animate-in fade-in duration-300">
      <div className="lg:col-span-7 flex flex-col justify-between border-2 border-dashed border-[#1A1A1A] p-10 bg-white min-h-[500px]">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-6" />}
        {uploadHint && (
          <p className="mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 font-serif">
            {uploadHint}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handlePdfFile(file);
            e.target.value = '';
          }}
        />

        {isUploading ? (
          <div className="my-auto text-center space-y-6 animate-pulse">
            <div className="p-4 bg-neutral-100 border border-neutral-200 inline-block animate-spin rounded-none">
              <Sparkles className="w-8 h-8 text-amber-800" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.2em] font-mono uppercase bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 font-bold">
                LOCAL PDF IMPORT
              </span>
              <h2 className="text-2xl font-serif text-[#1A1A1A]">正在本地解析 PDF 并写入档案...</h2>
            </div>
            <div className="bg-neutral-50/50 border border-neutral-200/50 p-4 max-w-md mx-auto text-left">
              <span className="text-[9px] font-mono uppercase text-neutral-400 block mb-1">当前步骤：</span>
              <p className="text-xs text-[#1A1A1A] font-serif italic">{onboardingMilestones[onboardStep]}</p>
            </div>
            <div className="w-full max-w-sm mx-auto h-1.5 bg-neutral-100 overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${((onboardStep + 1) / onboardingMilestones.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-800 bg-amber-100/40 border border-amber-200 px-2.5 py-1">
                档案未检测 · 初始化激活区
              </span>
              <h2 className="text-3xl font-serif text-neutral-900 mt-4 leading-tight tracking-tight">
                为 {activeMember.name} 导入第一份体检报告
              </h2>
              <p className="text-xs text-neutral-500 font-serif leading-relaxed mt-1">
                PDF 在浏览器本地解析，文本不会上传。识别到的指标存入 localStorage；AI 解读需另行联网调用。
              </p>
            </div>

            <div className="space-y-3 border border-neutral-200 bg-neutral-50/80 p-4">
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={dataProcessingConsent}
                  onChange={(e) => {
                    setDataProcessingConsent(e.target.checked);
                    if (e.target.checked) logConsentEvent('data_processing_consent');
                  }}
                  className="mt-0.5"
                />
                <span className="text-[11px] font-serif leading-relaxed text-neutral-700">
                  我同意在本地浏览器解析 PDF / 加载 Demo 档案，并将结构化指标存入 localStorage（不上传 PDF 原文）。
                </span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiConsentGranted}
                  onChange={(e) => {
                    setAiConsentGranted(e.target.checked);
                    if (e.target.checked) logConsentEvent('ai_consent_granted_onboarding');
                  }}
                  className="mt-0.5"
                />
                <span className="text-[11px] font-serif leading-relaxed text-neutral-600">
                  可选：我了解「AI 解读」会将指标文本经服务端代理发送至 Gemini，并同意后续使用该功能。
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!dataProcessingConsent}
              className="w-full border border-dashed border-neutral-300 p-8 text-center bg-[#FAF9F5]/40 hover:bg-[#FAF9F5] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-7 h-7 mx-auto text-neutral-400 mb-2" />
              <span className="text-xs font-bold text-neutral-700 block">点击选择 PDF 检验报告</span>
              <span className="text-[10px] text-neutral-400 font-serif block mt-1">支持拖拽至此处（Archive 模块）</span>
            </button>

            <div className="border-t border-neutral-100 pt-6 space-y-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                快捷通路：加载 Demo 档案（2021-2025 示例数据）
              </span>
              <button
                type="button"
                onClick={handleDemoActivate}
                disabled={!dataProcessingConsent}
                className="w-full py-4.5 bg-[#1A1A1A] hover:bg-black text-white text-[12px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                一键激活 Demo 档案（真实 hosptial_data） <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                to="/members"
                className="block text-center text-[10px] font-bold text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
              >
                管理家庭成员 / 为其他家人导入档案
              </Link>
            </div>
          </div>
        )}

        <div className="text-[10px] font-mono text-neutral-400 border-t border-neutral-100 pt-4 flex gap-2 items-center justify-center mt-6">
          <Database className="w-3.5 h-3.5" />
          <span>PDF 本地解析 · 档案存于浏览器 localStorage</span>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#FAF9F5] border border-neutral-200/80 p-10 flex flex-col justify-between min-h-[400px]">
          <div className="space-y-6">
            <div>
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">ABOUT HEALTH LINK</span>
              <h3 className="text-xl font-serif text-[#1A1A1A] mt-2 leading-snug">为什么必须把「数据导入」作为起点？</h3>
            </div>
            <div className="space-y-4 font-serif text-xs leading-relaxed text-[#1A1A1A]/80">
              <p>没有历史基准，仪表盘只是孤立的数字。导入后系统才能判断 LDL-C 是在好转还是恶化。</p>
              <p>PDF 文本在本地提取；只有您主动点击「AI 解读」时，指标才会经服务端代理发送至 Gemini。</p>
            </div>
          </div>
        </div>
        <MedicalDisclaimer variant="full" />
      </div>
    </div>
  );
}
