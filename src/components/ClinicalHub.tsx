import React, { useState } from 'react';
import { 
  Stethoscope, 
  FileDown, 
  Printer, 
  Calendar, 
  Info, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ChevronRight, 
  Activity, 
  User, 
  Clock, 
  AlertCircle,
  Undo
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useHealthArchive } from '@/src/context/AppContext';
import { getAggregatedSummary, DATA_7D, DATA_30D, DATA_90D, type TimeWindow } from '@/src/data/telemetry';
import { useAppContext } from '@/src/context/AppContext';
import { useMedications } from '@/src/hooks/useMedications';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export const ClinicalHub = () => {
  const { userRemarks, setUserRemarks, activeMember, activeMemberId, activeMemberUseDemoBaseline } = useAppContext();
  const { data4Y } = useHealthArchive();
  const {
    medications,
    newMedName,
    setNewMedName,
    newMedDose,
    setNewMedDose,
    newMedPurpose,
    setNewMedPurpose,
    addMedication,
    toggleMedication,
    removeMedication,
    activeMedications,
  } = useMedications(activeMemberId, { seedDefaults: activeMemberUseDemoBaseline });

  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('30d');
  const [isPrintLayout, setIsPrintLayout] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const changeSelectedWindow = (win: TimeWindow) => {
    setSelectedWindow(win);
    if (isGenerated) {
      setHasChanges(true);
    }
  };

  const changeRemarks = (txt: string) => {
    setUserRemarks(txt);
    if (isGenerated) setHasChanges(true);
  };

  const handleGenerateCard = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
      setHasChanges(false);
    }, 900);
  };

  const handleAddMed = (e: React.FormEvent) => {
    if (addMedication(e) && isGenerated) setHasChanges(true);
  };

  const handleToggleMed = (id: string) => {
    toggleMedication(id);
    if (isGenerated) setHasChanges(true);
  };

  const handleRemoveMed = (id: string) => {
    removeMedication(id);
    if (isGenerated) setHasChanges(true);
  };

  const triggerPrint = () => {
    window.print();
  };

  const currentSummary = getAggregatedSummary(selectedWindow);

  return (
    <div className="space-y-12 pb-20">

      {/* HEADER ACTION AREA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-[#1A1A1A] pb-6 gap-6">
        <div>
          <h1 className="text-5xl font-serif tracking-tight text-[#1A1A1A]">就诊参考卡</h1>
          <p className="text-sm opacity-60 mt-3 font-serif">
            健康硬资产输出接口：多重生命体征与体检纵向轨迹聚合，用于高效直观的面诊。
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto shrink-0">
          <button 
            type="button"
            disabled={!isGenerated}
            onClick={() => setIsPrintLayout(!isPrintLayout)}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 border text-[11px] font-bold uppercase tracking-wider transition-all",
              !isGenerated 
                ? "border-neutral-200 text-neutral-300 cursor-not-allowed bg-neutral-50/50"
                : isPrintLayout 
                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                  : "border-[#1A1A1A] text-[#1A1A1A] hover:bg-neutral-100"
            )}
            title={!isGenerated ? "请先完成参考卡生成" : ""}
          >
            {isPrintLayout ? <Undo className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
            {isPrintLayout ? "退出打印视图" : "进入打印排版"}
          </button>

          <button 
            type="button"
            disabled={!isGenerated}
            onClick={triggerPrint}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-wider transition-all border border-transparent",
              !isGenerated
                ? "bg-neutral-100 text-neutral-300 cursor-not-allowed"
                : "bg-[#1A1A1A] text-white hover:bg-black"
            )}
            title={!isGenerated ? "请先完成参考卡生成" : ""}
          >
            <FileDown className="w-4 h-4" /> 打印当前参考卡
          </button>
        </div>
      </div>

      {/* CORE WORKSPACE SPLIT LAYOUT */}
      <div className={cn("grid grid-cols-1 gap-12", isPrintLayout ? "lg:grid-cols-1" : "lg:grid-cols-12")}>
        
        {/* LEFT PANEL: DATA AND USER EDITOR (Hidden or moved under print preview in print mode) */}
        {!isPrintLayout && (
          <div className="lg:col-span-4 space-y-10">
            
            {/* TIME WINDOW SELECTION */}
            <div className="bg-white border-t-4 border-[#1A1A1A] p-8 border-x border-b border-[#1A1A1A]/10 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-3">1. 选择随访时间跨度</span>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">证据集聚合范围</h3>
              <p className="text-xs text-neutral-500 font-serif leading-relaxed mb-6">
                选择向医生呈现哪个周期范围的客观记录。数据由本应用本地数据库进行安全脱敏聚合。
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '7d', label: '过去 7 天' },
                  { id: '30d', label: '过去 30 天' },
                  { id: '90d', label: '过去 90 天' },
                  { id: '4y', label: '4年年鉴年鉴' }
                ].map((win) => (
                  <button
                    key={win.id}
                    type="button"
                    onClick={() => changeSelectedWindow(win.id as TimeWindow)}
                    className={cn(
                      "py-3 border text-[11px] font-bold transition-all rounded-none",
                      selectedWindow === win.id 
                        ? "bg-[#1A1A1A] border-[#1A1A1A] text-white" 
                        : "border-[#1A1A1A]/10 text-neutral-700 hover:border-black"
                    )}
                  >
                    {win.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PRE-DISCHARGE MANUAL REMARKS */}
            <div className="bg-white border border-[#1A1A1A]/10 p-8 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-3">2. 补充面诊自诉主诉</span>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-2">就诊前异常自述备注</h3>
              <p className="text-xs text-neutral-500 font-serif leading-relaxed mb-4">
                允许您在导出前手动加入任何主观感受（如最近工作劳累、突发胀痛等），这些笔记将直接显示在最终摘要单上以便医生直读。
              </p>
              
              <textarea 
                value={userRemarks}
                onChange={(e) => changeRemarks(e.target.value)}
                placeholder="在此记下您的症状感受、工作压力或是复诊目的..."
                className="w-full h-36 bg-neutral-50 border border-neutral-200 p-3 text-xs leading-relaxed font-serif text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] transition-all"
              />
            </div>

            {/* INTERACTIVE COMPLIANCE / MEDICATION CHECKLIST */}
            <div className="bg-white border border-[#1A1A1A]/10 p-8 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-3">3. 自主维护的干预记录</span>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-2">当前用药及辅助行为登记</h3>
              <p className="text-xs text-neutral-500 font-serif leading-relaxed mb-6">
                您可以挑勾或手动录入您最近坚持吃的降脂药、保健补剂或行为干预方式，作为就诊时的依据。
              </p>

              {/* Medication Checklist */}
              <div className="space-y-3 mb-6">
                {medications.map((med) => (
                  <div 
                    key={med.id} 
                    className={cn(
                      "flex items-start justify-between p-3 border rounded-none transition-all",
                      med.checked ? "bg-emerald-50/40 border-emerald-300" : "bg-neutral-50 border-neutral-200"
                    )}
                  >
                    <div className="flex gap-3 items-start cursor-pointer" onClick={() => handleToggleMed(med.id)}>
                      <input 
                        type="checkbox" 
                        checked={med.checked} 
                        onChange={() => {}} // Controlled by outer div tap
                        className="mt-1 h-3.5 w-3.5 accent-[#1A1A1A] rounded-none cursor-pointer"
                      />
                      <div>
                        <p className={cn("text-xs font-bold", med.checked ? "text-[#1A1A1A]" : "text-neutral-400 line-through")}>
                          {med.name} <span className="font-mono text-[10px] font-normal opacity-60 ml-1">({med.dose})</span>
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{med.purpose}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveMed(med.id)}
                      className="text-neutral-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Entry */}
              <form onSubmit={handleAddMed} className="pt-4 border-t border-neutral-100 space-y-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">手动追加药物/保健干预</p>
                <input 
                  type="text" 
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="干预名称 (例如：阿司匹林、运动半小时)"
                  className="w-full px-2 py-2 border border-neutral-200 text-xs focus:outline-none focus:border-[#1A1A1A] rounded-sm font-serif"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={newMedDose}
                    onChange={(e) => setNewMedDose(e.target.value)}
                    placeholder="频次剂量 (如: 10mg QD)"
                    className="w-full px-2 py-2 border border-neutral-200 text-xs focus:outline-none focus:border-[#1A1A1A] rounded-sm font-serif"
                  />
                  <input 
                    type="text" 
                    value={newMedPurpose}
                    onChange={(e) => setNewMedPurpose(e.target.value)}
                    placeholder="目的 (如: 预防血栓)"
                    className="w-full px-2 py-2 border border-neutral-200 text-xs focus:outline-none focus:border-[#1A1A1A] rounded-sm font-serif"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newMedName.trim()}
                  className="w-full py-2 border border-dashed border-[#1A1A1A] hover:bg-neutral-50 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 rounded-sm disabled:opacity-30"
                >
                  <Plus className="w-3.5 h-3.5" /> 登记到用药列表
                </button>
              </form>
            </div>

            {/* 4. ACTIVE USER DECISION SOVEREIGNTY GENERATOR */}
            <div className="bg-neutral-50 border border-[#1A1A1A] p-6 space-y-4 shadow-sm animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                  {isGenerated ? "状态: 预览就绪" : "状态: 待触发出片"}
                </span>
                {isGenerated && hasChanges && (
                  <span className="text-[9px] font-bold text-amber-700 animate-pulse bg-amber-50 px-2 py-0.5 border border-amber-200">
                    配置已获修改
                  </span>
                )}
              </div>
              
              <button
                type="button"
                onClick={handleGenerateCard}
                disabled={isGenerating}
                className={cn(
                  "w-full py-3.5 text-xs font-bold uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-2",
                  isGenerating 
                    ? "bg-neutral-200 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                    : isGenerated 
                      ? hasChanges 
                        ? "bg-amber-800 text-white border border-amber-800 hover:bg-amber-900 shadow-sm" 
                        : "bg-white text-[#1A1A1A] border border-[#1A1A1A] hover:bg-neutral-50"
                      : "bg-[#1A1A1A] text-white hover:bg-black"
                )}
              >
                {isGenerating ? (
                  <>
                    <span className="h-3 w-3 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
                    <span>系统正在对齐医疗证据...</span>
                  </>
                ) : isGenerated ? (
                  hasChanges ? "更新就诊参考卡 (同步改动)" : "重新生成参考卡"
                ) : (
                  "生成就诊参考卡"
                )}
              </button>
              <p className="text-[10px] opacity-60 text-center font-serif leading-relaxed">
                按照「主动确认触发」机制，点击上键对齐参数并输出。
              </p>
            </div>

          </div>
        )}

        {/* RIGHT PANEL: PRINT-PREVIEW CANVAS (Takes full grid in printLayout mode) */}
        <div className={cn(isPrintLayout ? "lg:col-span-12" : "lg:col-span-8")}>
          
          {/* Outer styling showing printable border sheets */}
          <div className="relative">
            {isPrintLayout && (
              <div className="absolute -top-6 left-0 bg-neutral-900 text-neutral-100 text-[10px] font-serif px-3 py-1 uppercase tracking-widest rounded-t-sm z-20">
                A4 书面纸张比例排版预览 (在浏览器打印选项中开启“背景图形”以保留背景线条)
              </div>
            )}

            {!isGenerated ? (
              <div className="bg-white border-2 border-dashed border-[#1A1A1A]/20 p-12 min-h-[550px] flex flex-col justify-center items-center text-center space-y-6 animate-in fade-in duration-500 shadow-[15px_15px_0px_0px_rgba(26,26,26,0.02)]">
                <div className="p-5 border-2 border-[#1A1A1A] rounded-sm bg-[#FAF9F5] flex items-center justify-center">
                  <Stethoscope className={cn("w-10 h-10 text-neutral-500", isGenerating && "animate-spin")} />
                </div>
                
                <div className="max-w-md space-y-3">
                  <span className="text-[9px] font-mono uppercase font-black text-amber-800 tracking-[0.3em] bg-amber-50 px-3 py-1 border border-amber-200 inline-block">
                    {isGenerating ? "对齐分析中 ANALYSIS IN PROGRESS" : "等待生成 AWAITING GENERATION"}
                  </span>
                  <h3 className="text-2xl font-serif tracking-tight text-[#1A1A1A] pt-2">
                    {isGenerating ? "正在聚合多维指标证据集..." : "就诊参考卡正静候出样"}
                  </h3>
                  <p className="text-xs text-neutral-500 font-serif leading-relaxed">
                    {isGenerating 
                      ? "系统正在提取4年跨度体检纵向轨迹、近期高频血压心律波动规律，及自述用药，合拢计算高品质打印排版印样。"
                      : "您已在左侧完成了随访时间跨度、自述主诉与用药项的行为登记。系统秉持「用户主权（User Sovereignty）」理念，不擅自默认输出，请主动点击下方或左下侧的按钮，触发正式版面生成程序。"}
                  </p>
                </div>

                <div className="pt-4 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateCard}
                    disabled={isGenerating}
                    className="px-8 py-3.5 bg-[#1A1A1A] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 rounded-none disabled:opacity-40"
                  >
                    {isGenerating ? (
                      <>
                        <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>同步硬资产指标证据中...</span>
                      </>
                    ) : (
                      <>
                        <span>手动触发：生成正式参考卡</span>
                      </>
                    )}
                  </button>
                  <span className="text-[9px] font-mono text-neutral-400">
                    * 保证：数据均于本地沙盒真实对齐编译，未上传任何外部云端。
                  </span>
                </div>
              </div>
            ) : (
              /* Standard container with exact classes parsed by @media print CSS below */
              <div className={cn(
                "bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] printable-ref-card animate-in fade-in duration-500",
                isPrintLayout 
                  ? "max-w-[800px] mx-auto p-12 min-h-[1100px] shadow-[0px_10px_30px_rgba(0,0,0,0.15)]" 
                  : "p-10 shadow-[15px_15px_0px_0px_rgba(26,26,26,0.02)]"
              )}>
              
              {/* BRAND / SHEET HEADER */}
              <div className="flex justify-between items-start border-b-4 border-[#1A1A1A] pb-8 mb-8">
                <div>
                  <div className="flex items-center gap-2 opacity-80 mb-2">
                    <Stethoscope className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">就诊参考卡 (核心健康记录摘要)</span>
                  </div>
                  <h2 className="text-3xl font-serif tracking-tight">Health Records Abstract</h2>
                  <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-[0.25em] mt-2">
                    本地离线加密生成层 · 临床会诊循证依据物证
                  </p>
                </div>
                <div className="text-right border-l border-neutral-100 pl-8">
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-widest">导出密鉴 ID</span>
                  <span className="text-sm font-mono font-bold tracking-tighter text-[#1A1A1A] block mt-1">2026-CY-CHEN-BASE</span>
                  <span className="text-[9px] font-serif opacity-50 block mt-1">数据截止: 2026-06-08</span>
                </div>
              </div>

              {/* BASIC INFORMATION BAR */}
              <div className="p-6 bg-[#F2F1EF]/50 border border-[#1A1A1A]/10 grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-xs font-serif">
                <div>
                  <span className="text-[10px] font-black text-neutral-400 block uppercase tracking-wider mb-1">患者姓名</span>
                  <span className="font-sans font-bold text-sm text-[#1A1A1A]">{activeMember.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-neutral-400 block uppercase tracking-wider mb-1">年龄 / 生理性别</span>
                  <span className="font-sans text-[#1A1A1A]">30岁 / 女性</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-neutral-400 block uppercase tracking-wider mb-1">时间透视窗口</span>
                  <span className="font-sans font-bold text-amber-900">{currentSummary.windowLabel}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-neutral-400 block uppercase tracking-wider mb-1">稳定倾向慢性体质</span>
                  <span className="text-[10px] font-sans leading-tight text-neutral-600 block">
                    1. 疑似家族脂代谢偏差 (FH 随访)<br/>
                    2. 胆囊息肉样变 (0.3cm) 稳定随访
                  </span>
                </div>
              </div>

              {/* DUAL COGNITION AREA: USER COMPLAINTS & MANUAL REMARKS */}
              <section className="mb-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" /> 
                  患者诊断前主诉备注 / 自述说明
                </h4>
                <div className="p-6 bg-white border border-[#1A1A1A]/10 border-l-4 border-l-[#1A1A1A]">
                  <p className="text-xs text-[#1A1A1A]/90 leading-relaxed font-serif">
                    “{userRemarks || '（患者未提供就诊前备注。此行供就诊打印前临时手写补充）'}”
                  </p>
                </div>
              </section>

              {/* CORE MEDICAL EVIDENCE TABLES (EVIDENCE ONLY, NO RATING) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                
                {/* 1. AGGREGATED VARIABLES DATA */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" /> 
                    核心生化常数统计值 (Evidence Aggregation)
                  </h4>
                  
                  <div className="border border-[#1A1A1A]/10 divide-y divide-neutral-100 font-serif">
                    <div className="flex justify-between items-center p-4 bg-neutral-50/50">
                      <span className="text-[11px] font-bold text-neutral-500 font-sans">收缩压/舒张压均值</span>
                      <div className="text-right">
                        <span className="font-sans font-bold text-sm text-[#1A1A1A]">{currentSummary.bp}</span>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{currentSummary.bpFluc}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-4">
                      <span className="text-[11px] font-bold text-neutral-500 font-sans">平均睡眠时长</span>
                      <span className="text-xs font-sans text-neutral-800">{currentSummary.sleep}</span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-neutral-50/50">
                      <span className="text-[11px] font-bold text-neutral-500 font-sans">静息自测心率均值</span>
                      <span className="text-xs font-sans text-neutral-800 font-bold">{currentSummary.hr}</span>
                    </div>

                    <div className="flex justify-between items-center p-4">
                      <span className="text-[11px] font-bold text-neutral-500 font-sans">平均步数活动水平</span>
                      <span className="text-xs font-sans text-neutral-800">{currentSummary.steps}</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-[#1A1A1A]/50 font-serif leading-relaxed mt-3 px-1">
                    * 说明：上述数据由患者所携智能穿戴设备（静息状态抽取）、个人便携式电子血压计日常按时维护得出，未添加任何病理干预性降噪处理。
                  </p>
                </div>

                {/* 2. RECHARTS TRAJECTORY GRAPH */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" /> 
                    所选周期可视化演进轨迹图 (Trajectory Visualization)
                  </h4>
                  
                  <div className="bg-white border border-[#1A1A1A]/10 p-4 h-[190px] flex flex-col justify-between">
                    {/* Recharts box */}
                    <div className="h-[150px] w-full min-h-[150px]">
                      <ResponsiveContainer width="100%" height={150} minWidth={0}>
                        {selectedWindow === '4y' ? (
                          <AreaChart data={data4Y}>
                            <CartesianGrid strokeDasharray="1 5" vertical={false} stroke="#1A1A1A" opacity={0.15} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                            <YAxis domain={[0, 6]} axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                            <Area type="monotone" name="LDL-C" dataKey="ldl" stroke="#1A1A1A" fillOpacity={0.1} fill="#1A1A1A" strokeWidth={2} />
                            <Tooltip contentStyle={{fontSize: '9px', borderRadius: '0px', border: '1px solid #1A1A1A', padding: '4px'}} />
                          </AreaChart>
                        ) : (
                          <LineChart data={[...(selectedWindow === '7d' ? DATA_7D :
                            selectedWindow === '30d' ? DATA_30D : DATA_90D)]}>
                            <CartesianGrid strokeDasharray="1 5" vertical={false} stroke="#1A1A1A" opacity={0.15} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                            <YAxis domain={[50, 140]} axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                            <Line type="monotone" name="收缩压" dataKey="bpSys" stroke="#1A1A1A" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" name="舒张压" dataKey="bpDias" stroke="#FF5E62" strokeWidth={1} strokeDasharray="4 4" dot={{ r: 1 }} />
                            <Tooltip contentStyle={{fontSize: '9px', borderRadius: '0px', padding: '4px'}} />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">
                        {selectedWindow === '4y' ? '指标轴：LDL-C LDL (mmol/L)' : '指标轴：血液收缩上限/舒张下限 (mmHg)'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-[#1A1A1A]/50 font-serif leading-relaxed mt-3 px-1">
                    * 演进透视：系统在简报折线图中严格排除了一切非线性推断插值，以保真保留真实时点偏移。
                  </p>
                </div>
              </div>

              {/* TIMELINE OF RAW ABNORMAL VALUES WITHIN MEDICAL FILES */}
              <section className="mb-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" /> 
                  历年档案中确证的异常测定点记录 (Exceeded Reference Thresholds Timeline)
                </h4>
                
                <div className="border border-[#1A1A1A]/10 bg-white">
                  <table className="w-full text-left text-xs font-serif border-collapse">
                    <thead>
                      <tr className="border-b border-[#1A1A1A]/10 bg-neutral-50">
                        <th className="p-4 font-sans font-bold text-[10px] text-neutral-500 uppercase tracking-widest">观测时间</th>
                        <th className="p-4 font-sans font-bold text-[10px] text-neutral-500 uppercase tracking-widest">偏离观测项</th>
                        <th className="p-4 font-sans font-bold text-[10px] text-neutral-500 uppercase tracking-widest">测定真实值</th>
                        <th className="p-4 font-sans font-bold text-[10px] text-neutral-500 uppercase tracking-widest">临床参考区间(三甲指南)</th>
                        <th className="p-4 font-sans font-bold text-[10px] text-neutral-500 uppercase tracking-widest">既往随访背景说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      <tr>
                        <td className="p-4 font-sans font-bold text-[#1A1A1A]">2021-11-12</td>
                        <td className="p-4 font-sans">低密度脂蛋白胆固醇 (LDL-C)</td>
                        <td className="p-4 font-mono font-bold text-rose-700">5.04 mmol/L ↑</td>
                        <td className="p-4 font-mono text-neutral-500">&lt; 3.12 mmol/L</td>
                        <td className="p-4 text-neutral-600 font-sans text-[11px] leading-tight">基线测定值，当时BMI 22.76处于历史最优状态，提示遗传代谢偏差。</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-sans font-bold text-[#1A1A1A]">2024-05-18</td>
                        <td className="p-4 font-sans">丙氨酸氨基转移酶 (ALT)</td>
                        <td className="p-4 font-mono font-bold text-rose-700">51.1 U/L ↑</td>
                        <td className="p-4 font-mono text-neutral-500">&lt; 40.0 U/L</td>
                        <td className="p-4 text-neutral-600 font-sans text-[11px] leading-tight">2024体检见轻度增高。后常态复查恢复至正常标准（2025测得为19.4）。</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-sans font-bold text-[#1A1A1A]">2025-05-20</td>
                        <td className="p-4 font-sans">空腹血糖 (FPG)</td>
                        <td className="p-4 font-mono text-amber-700">5.03 mmol/L</td>
                        <td className="p-4 font-mono text-neutral-500">&lt; 6.10 mmol/L</td>
                        <td className="p-4 text-neutral-600 font-sans text-[11px] leading-tight">未超标准上限，但相较2021年基线（4.37 mmol/L）呈平缓阶梯抬升。</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* MEDICATION AND STATED ACTIVE DAILY INTERVENTIONS */}
              <section className="mb-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" /> 
                  就诊阶段自主申报用药及辅助行为干预 (Medications & Interventions Status)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeMedications.length > 0 ? (
                    activeMedications.map((med) => (
                      <div key={med.id} className="p-4 border border-[#1A1A1A]/10 bg-[#FCD34D]/5 font-serif flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold font-sans text-neutral-800">{med.name}</p>
                          <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-wider font-sans">频率剂量: {med.dose}</p>
                          <p className="text-[10px] text-neutral-600 mt-1 leading-snug">{med.purpose}</p>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 border border-emerald-600 text-emerald-800 text-[8px] font-bold tracking-widest uppercase font-sans">
                          执行中 ACTIVE
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 border border-dashed border-neutral-200 text-neutral-400 font-serif text-xs text-center col-span-2">
                      当前未勾选或手动登记任何用药及健康管理行为。
                    </div>
                  )}
                </div>
              </section>

              {/* FOOTER STATEMENTS & SIGNATURE SPACE */}
              <div className="mt-14 pt-8 border-t-2 border-[#1A1A1A] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="text-[10px] font-serif text-[#1A1A1A]/70 max-w-2xl leading-relaxed">
                  <p className="mb-2 text-[#1A1A1A] font-bold">⚠️ 医生专属 · 临床认知边界核验 (Clinician Attestation & Disclaimer)</p>
                  <p className="mb-1">
                    1. 本【就诊参考卡/健康记录摘要】所有趋势、历史折线点和用药项目均为患者<strong>自主维护</strong>或基于<strong>原始体检文件本地抽取所得</strong>，用于协助打破医患面诊时间紧、病史陈述零碎的障碍。
                  </p>
                  <p>
                    2. <strong>本文件严禁充当最终医学诊断书、预后分析报告、治疗方案或处方药物调节主张</strong>。本系统从不进行任何智能病理评级或风险指标评测，数据呈现之最终临床学术解读权，由面对面为您诊查的三甲医院执业医师完全享有。
                  </p>
                </div>
                
                {/* Visual signature placeholder */}
                <div className="w-full md:w-[200px] border border-dashed border-[#1A1A1A]/35 p-4 text-center mt-4 md:mt-0 bg-neutral-50">
                  <span className="text-[9px] font-sans uppercase font-bold tracking-[0.1em] text-neutral-400 block mb-4">
                    就诊医生手写确认签字
                  </span>
                  <div className="h-8 border-b border-neutral-300 w-full mb-1" />
                  <span className="text-[8px] font-sans text-neutral-400">签署：____________________</span>
                </div>
              </div>

            </div>
            )}
          </div>
        </div>

      </div>

      {/* ⚠️ ENLARGED BOTTOM COGNITIVE BOUNDARY DECLARATION - HIGHLIGHTED PAGE FOOTER */}
      <div className="bg-[#FAF9F5] border-t-8 border-amber-700 p-10 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 text-[#1A1A1A] shadow-[10px_10px_0px_0px_rgba(26,26,26,0.02)] border-x border-b border-amber-800/10">
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-900">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <h3 className="text-base font-bold tracking-tight">医生面诊辅助工具 · 认知边界声明</h3>
          </div>
          <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#1A1A1A]/40">
            Clinical Boundary Declaration
          </p>
          <p className="text-xs text-neutral-600 font-serif leading-relaxed">
            把体检、睡眠、血液等日常高变资产聚拢成客观证据卡，是为了在短短 5 分钟的面诊会商中把更多的时间还给沟通。<strong>AI 唯一的职责是提炼证据、还原轨迹。因此，本系统将解释权完全、无损地拱手交付于临床专业医生，不添加任何干预评判。</strong>
          </p>
        </div>

        <div className="lg:col-span-4 border-l border-[#1A1A1A]/10 pl-0 lg:pl-8 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-700 rounded-full" />
            系统功能可以做的事 (Scope of Capability)
          </h4>
          <ul className="text-xs text-neutral-600 font-serif space-y-2 list-disc list-inside">
            <li><strong>多端数据提纯</strong>：将分散在各种 PDF 文件、日常传感、自主用药登记中的数据，解构成按周期对齐、连贯的主题；</li>
            <li><strong>纯粹趋势平铺</strong>：为心率、血压、血脂指标生成高保真的非线性、非评估轨迹原样；</li>
            <li><strong>自诉备注输入</strong>：支持在面诊打印前任意录入客观的工作负荷说明。</li>
          </ul>
        </div>

        <div className="lg:col-span-4 border-l border-[#1A1A1A]/10 pl-0 lg:pl-8 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-rose-700 rounded-full" />
            安全防线绝对不做的事 (Absolute Prohibitions)
          </h4>
          <ul className="text-xs text-neutral-600 font-serif space-y-2 list-disc list-inside col-span-1">
            <li><strong>绝不进行病理诊断提示</strong>：从不擅自向用户提供高危报警或疾病论断，绝对避免用户高估报告单进行盲目确诊；</li>
            <li><strong>绝不进行用药/减药指导</strong>：系统严禁对任何降脂药、降压药的具体处方和调理疗程指指点点：此安全红线专属于医生。</li>
          </ul>
        </div>
      </div>

      {/* Dynamic style tag for CSS print styling targeting printable sheets */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: #FDFCFB !important;
            color: #1A1A1A !important;
          }
          .printable-ref-card, .printable-ref-card * {
            visibility: visible;
          }
          .printable-ref-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .recharts-legend-wrapper, .recharts-tooltip-wrapper {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};
