import React, { useState } from 'react';
import { 
  Stethoscope, 
  Clock, 
  Printer, 
  Plus, 
  Trash2, 
  FileCheck, 
  Info, 
  Activity, 
  BriefcaseMedical,
  CheckCircle2,
  ListRestart
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppContext, useHealthArchive } from '@/src/context/AppContext';
import { useMedications } from '@/src/hooks/useMedications';
import { buildTrendTableRows } from '@/src/lib/memberTimeline';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  CartesianGrid, 
  Tooltip,
  LineChart,
  Line
} from 'recharts';

type TimeWindow = '7d' | '30d' | '90d';

interface MedicationItem {
  id: string;
  name: string;
  dose: string;
  purpose: string;
  checked: boolean;
}

export const PrepareFollowup = () => {
  const { userRemarks, setUserRemarks, activeMember, activeMemberId, activeMemberUseDemoBaseline } = useAppContext();
  const { archive, trendData, redFlags } = useHealthArchive();
  const tableRows = buildTrendTableRows(trendData);
  const latestImport = archive.latestImport;
  const latestAbnormal = latestImport?.observations.filter((o) => o.abnormalFlag != null).slice(0, 6) ?? [];
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
  } = useMedications(activeMemberId, { seedDefaults: activeMemberUseDemoBaseline });

  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
  const [previewGenerated, setPreviewGenerated] = useState(true);

  // Synthesized telemetry matching each state window
  const getWindowSummary = () => {
    switch (timeWindow) {
      case '7d':
        return {
          title: '过去 7 天高精度体征摘要',
          desc: '适逢网络高强度发布周，睡眠受到零星侵扰。收缩压均值有轻微波动但仍平稳，静息心率受自律调节处于良性格局。',
          stats: [
            { name: '收缩压均值', val: '117.1', unit: 'mmHg', status: '稳定波动区' },
            { name: '舒张压均值', val: '76.1', unit: 'mmHg', status: '优' },
            { name: '睡眠时均值', val: '6.3', unit: '小时/宿', status: '略低', alert: true },
            { name: '静息心率', val: '65.7', unit: 'bpm', status: '极稳' }
          ],
          chartData: [
            { label: '06-02', BP: 114, HR: 64, Sleep: 6.5 },
            { label: '06-03', BP: 118, HR: 67, Sleep: 5.8 },
            { label: '06-04', BP: 121, HR: 69, Sleep: 6.2 },
            { label: '06-05', BP: 116, HR: 63, Sleep: 7.0 },
            { label: '06-06', BP: 115, HR: 65, Sleep: 6.8 },
            { label: '06-07', BP: 119, HR: 66, Sleep: 5.5 },
            { label: '06-08', BP: 117, HR: 65, Sleep: 6.4 },
          ]
        };
      case '30d':
      default:
        return {
          title: '过去 30 天慢周期健康扫描',
          desc: '上月经历高强度生产环境重构，收缩压高点 121mmHg 偶现于熬夜交付时段，体重控制保持 55.6kg。整体体征显露良性代偿。',
          stats: [
            { name: '收缩压均值', val: '116.8', unit: 'mmHg', status: '正常高值范畴' },
            { name: '心率常态区', val: '65.8', unit: 'bpm', status: '平稳' },
            { name: '平均睡眠', val: '6.25', unit: '小时', status: '待改善' },
            { name: '平均步数', val: '8,080', unit: '步/单日', status: '达标' }
          ],
          chartData: [
            { label: 'W1均值', BP: 115, HR: 64, Sleep: 6.6 },
            { label: 'W2均值', BP: 117, HR: 71, Sleep: 6.1 },
            { label: 'W3均值', BP: 119, HR: 68, Sleep: 5.9 },
            { label: 'W4均值', BP: 116, HR: 65, Sleep: 6.4 },
          ]
        };
      case '90d':
        return {
          title: '过去 90 天宏观系统总结',
          desc: '一季度网络运行及作息控制均衡，血压在 114 至 119 毫米汞柱安全内壁平复。胆固醇控制策略平缓，未见过度逆增。',
          stats: [
            { name: '血压宏观区', val: '116/75', unit: 'mmHg', status: '整体优质' },
            { name: '均值心率', val: '65.0', unit: 'bpm', status: '优秀' },
            { name: '健康自律天数', val: '81', unit: '天/90天', status: '九成控制率' },
            { name: 'BMI高水位', val: '24.88', unit: '限度超重', status: '须温和防守' }
          ],
          chartData: [
            { label: '3月前', BP: 114, HR: 63, Sleep: 6.8 },
            { label: '2月前', BP: 116, HR: 65, Sleep: 6.4 },
            { label: '1月前', BP: 118, HR: 67, Sleep: 6.0 },
            { label: '本月均', BP: 117, HR: 65, Sleep: 6.3 },
          ]
        };
    }
  };

  const handleAddMedication = (e: React.FormEvent) => {
    addMedication(e);
  };

  const triggerPrint = () => {
    window.print();
  };

  const activeData = getWindowSummary();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Scenario header and introduction */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#1A1A1A]/10 pb-6 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[#1A1A1A] bg-neutral-100 px-2.5 py-1 border border-[#1A1A1A]/20">
            场景二：下周预约去复诊
          </span>
          <h1 className="text-4xl font-serif mt-3 text-[#1A1A1A] tracking-tight">生成面诊参考卡</h1>
          <p className="text-xs text-neutral-500 font-serif mt-1">
            将过去一段时间的自测体征、服药自述打包。右侧极简就诊卡是随时可打印、医生秒入眼帘的循证卡。
          </p>
        </div>
        <button 
          type="button" 
          onClick={triggerPrint}
          className="px-5 py-2.5 bg-[#1A1A1A] text-white hover:bg-black transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md"
        >
          <Printer className="w-4 h-4" /> 打印 A4 复诊卡片
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        
        {/* LEFT WORKSPACE: Input telemetry window, self-reported notes, med lists */}
        <div className="xl:col-span-5 space-y-8">
          
          {/* STEP 1: Time Window Selection */}
          <div className="bg-white border border-[#1A1A1A] p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-[#1a1a1a]">选择就诊回顾时间窗口</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Select telemetry span</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '7d', label: '近 7 天高频' },
                { id: '30d', label: '近 30 天慢周期' },
                { id: '90d', label: '近 一季度宏观' }
              ].map(windowOpt => (
                <button
                  key={windowOpt.id}
                  type="button"
                  onClick={() => setTimeWindow(windowOpt.id as TimeWindow)}
                  className={cn(
                    "py-2 px-1 border text-xs font-bold text-center transition-all",
                    timeWindow === windowOpt.id 
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                      : "border-neutral-200 hover:border-black text-[#1A1A1A]/80 bg-white"
                  )}
                >
                  {windowOpt.label}
                </button>
              ))}
            </div>

            {/* Injected Material Dashboard Summary - Guided content */}
            <div className="p-4 bg-[#F2F1EF]/30 border border-neutral-200/60 rounded-none space-y-2 mt-2">
              <h4 className="text-xs font-bold font-sans text-neutral-800">{activeData.title}</h4>
              <p className="text-[11px] text-neutral-500 font-serif leading-relaxed">{activeData.desc}</p>
              
              {/* Core quick micro-aggregates */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-[#1a1a1a]/5 text-[10px] font-mono">
                {activeData.stats.map((st, sidx) => (
                  <div key={sidx} className="bg-white p-2 border border-neutral-100">
                    <span className="opacity-40 block scale-90 origin-left">{st.name}</span>
                    <strong className="text-neutral-900 block mt-0.5">{st.val}</strong>
                    <span className={cn("text-[8px] font-bold", st.alert ? "text-rose-600" : "text-neutral-500")}>
                      {st.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Smooth Micro-chart */}
              <div className="h-16 w-full min-h-[64px] pt-2">
                <ResponsiveContainer width="100%" height={64} minWidth={0}>
                  <LineChart data={activeData.chartData}>
                    <Line type="monotone" dataKey="BP" stroke="#1A1A1A" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="Sleep" stroke="#1A1A1A" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* STEP 2: Patient Self-Report Statement / Subjective Description */}
          <div className="bg-white border border-[#1A1A1A] p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-[#1a1a1a]">自述症状主诉 & 提问备忘</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Chief complaint</span>
            </div>

            <div>
              <label className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 block mb-1.5">
                面诊时的言简意赅主诉 (支持手动修改编辑)
              </label>
              <textarea
                value={userRemarks}
                onChange={(e) => setUserRemarks(e.target.value)}
                rows={4}
                className="w-full text-xs font-serif p-3 bg-neutral-50/50 border border-neutral-200 focus:outline-none focus:border-[#1A1A1A] transition-all leading-relaxed"
                placeholder="在此处输入近期的主试症状，在右侧就诊卡中可事实渲染可见。"
              />
              <span className="text-[9px] italic text-neutral-400 mt-1 block leading-normal">
                * 简明重点是有效面诊的关键。建议向医生提问：“鉴于我2021年BMI完美时坏胆固醇即已触顶5.04，是否存在FH（家族性高血脂）体质？”
              </span>
            </div>
          </div>

          {/* STEP 3: Medication list & Supplements adjustment */}
          <div className="bg-white border border-[#1A1A1A] p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-[#1a1a1a]">当前生活干涉 & 补剂服药核对</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Medications & lifestyle list</span>
            </div>

            {/* List current medications */}
            <div className="space-y-2">
              {medications.map((med) => (
                <div key={med.id} className="flex justify-between items-center p-3 border border-neutral-100 hover:bg-neutral-50 bg-white">
                  <div className="flex items-start gap-2.5">
                    <input 
                      type="checkbox"
                      checked={med.checked}
                      onChange={() => toggleMedication(med.id)}
                      className="mt-1 accent-black"
                    />
                    <div>
                      <span className={cn("text-xs font-bold block", !med.checked && "line-through opacity-45")}>
                        {med.name}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">
                        分量: {med.dose} | 配合目的: {med.purpose}
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeMedication(med.id)}
                    className="p-1 text-neutral-300 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to add item */}
            <form onSubmit={handleAddMedication} className="border-t border-dashed border-neutral-200 pt-4 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">快捷增填新补剂 / 降压降脂药：</span>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input 
                  type="text" 
                  value={newMedName} 
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="药品/营养素名称"
                  className="px-2.5 py-1.5 border border-neutral-200 outline-none focus:border-black"
                />
                <input 
                  type="text" 
                  value={newMedDose} 
                  onChange={(e) => setNewMedDose(e.target.value)}
                  placeholder="剂量 (如: 10mg gd)"
                  className="px-2.5 py-1.5 border border-neutral-200 outline-none focus:border-black"
                />
              </div>
              <input 
                type="text" 
                value={newMedPurpose} 
                onChange={(e) => setNewMedPurpose(e.target.value)}
                placeholder="调治目的 (如: 调节胆汁淤结)"
                className="w-full px-2.5 py-1.5 border border-neutral-200 outline-none focus:border-black text-xs"
              />
              <button 
                type="submit"
                className="w-full py-2 border border-dashed border-[#1A1A1A] hover:bg-neutral-50 transition-all font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5"
                disabled={!newMedName}
              >
                <Plus className="w-3.5 h-3.5" /> 登记并添加至随诊清单
              </button>
            </form>

          </div>

        </div>

        {/* RIGHT PREVIEW PANELS: Real Clinician-Ready Reference Sheet */}
        <div className="xl:col-span-7 bg-white border-2 border-[#1A1A1A] p-10 space-y-8 shadow-[12px_12px_0px_0px_rgba(26,26,26,0.02)] print:border-none print:shadow-none">
          
          {/* Visual header of reference sheet */}
          <div className="flex justify-between items-start border-b-2 border-black pb-5">
            <div>
              <p className="text-xl font-serif font-black tracking-tight text-neutral-900 leading-none">
                医学随访与就诊沟通建议备忘卡
              </p>
              <p className="text-[10px] font-mono text-neutral-400 mt-2 tracking-wide uppercase">
                CLINIC-READY HISTORICAL COMMUNICATOR CARD
              </p>
            </div>
            <span className="p-2 border border-black/10 rounded-sm font-serif italic text-xs text-neutral-500 bg-neutral-50">
              内分泌 / 消化内科
            </span>
          </div>

          {/* Demographic context block */}
          <div className="bg-neutral-50 p-5 border border-neutral-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="opacity-40 block scale-95 origin-left">患者姓名</span>
              <strong className="text-neutral-900 font-sans">{activeMember.name}</strong>
            </div>
            <div>
              <span className="opacity-40 block scale-95 origin-left">职业背景</span>
              <strong className="text-neutral-900 font-sans">网络技术 / 研发</strong>
            </div>
            <div>
              <span className="opacity-40 block scale-95 origin-left">随诊时距</span>
              <strong className="text-neutral-900 font-sans">回顾数据: 近 {timeWindow === '7d' ? '7天' : timeWindow === '30d' ? '30天' : '90d'}</strong>
            </div>
            <div>
              <span className="opacity-40 block scale-95 origin-left">档案核签</span>
              <strong>{activeMember.name.slice(0, 8).toUpperCase()}-CLINIC</strong>
            </div>
          </div>

          {/* 4-Year Metabolic Core Alignment - Highly professional structure */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] border-b pb-2 flex items-center justify-between">
              <span>一、 {activeMember.name} 关键代谢指标轨迹</span>
              <span className="text-neutral-400 lowercase font-normal">* 来自已导入档案</span>
            </h4>

            {/* Structured Table to make doctors immediately capture the core insights */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-neutral-600 border border-neutral-200">
                <thead className="bg-[#FAF9F5] text-[10px] font-black text-neutral-700 uppercase tracking-wider font-mono border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">年份</th>
                    <th className="py-2.5 px-3">体重 (kg)</th>
                    <th className="py-2.5 px-3">BMI</th>
                    <th className="py-2.5 px-3">LDL-C (mmol/L)</th>
                    <th className="py-2.5 px-3">ALT (U/L)</th>
                    <th className="py-2.5 px-3 font-serif">报告日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 px-3 text-center text-neutral-400 font-serif">
                        {activeMember.name} 暂无导入记录
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((row, idx) => (
                      <tr key={row.year} className={idx === tableRows.length - 1 ? 'bg-neutral-50/50' : undefined}>
                        <td className="py-2 px-3 font-bold">{row.year}</td>
                        <td className="py-2 px-3">{row.weight}</td>
                        <td className="py-2 px-3">{row.bmi}</td>
                        <td className="py-2 px-3 font-bold">{row.ldl}</td>
                        <td className="py-2 px-3">{row.alt}</td>
                        <td className="py-2 px-3 font-serif opacity-70">{row.imaging}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {activeMemberUseDemoBaseline && (
            <div className="p-3 bg-neutral-50 border border-neutral-100 flex items-start gap-2.5 text-[10px] text-neutral-500 font-serif leading-relaxed">
              <Info className="w-3.5 h-3.5 mt-0.5 text-neutral-400 shrink-0" />
              <div>
                <strong>临床趋势特征说明 (Demo 样例):</strong>
                <br />
                1. 2021 年基准表现为【原装低体重而坏胆固醇高达5.04】。支持家族性胆固醇合成过高（FH类似型）疑似探出。
                <br />
                2. 2024 至 2025 年肝转氨酶 ALT 展现出【由一过性偏高（51.1）随睡眠改善顺利回归极低底噪（19.4）】的极佳调理韧性。
              </div>
            </div>
            )}
          </div>

          {/* LATEST IMPORT SNAPSHOT */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] border-b pb-2 flex items-center justify-between">
              <span>二、 最近导入报告摘要</span>
              <span className="text-neutral-400 lowercase font-normal">* 来自 Health Link 档案</span>
            </h4>

            {!latestImport ? (
              <div className="p-4 border border-neutral-200 text-xs text-neutral-400 font-serif">
                暂无最近导入报告。可先在 Agent 上传报告并同步到档案。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#FAF9F5] border border-neutral-200">
                  <span className="opacity-40 block text-[9px] font-mono">报告日期</span>
                  <strong>{latestImport.reportDate}</strong>
                </div>
                <div className="p-3 bg-[#FAF9F5] border border-neutral-200">
                  <span className="opacity-40 block text-[9px] font-mono">导入来源</span>
                  <strong>
                    {latestImport.source === 'vision_ocr'
                      ? '图片/拍照 OCR'
                      : latestImport.source === 'hospital_csv'
                        ? '结构化历史档案'
                        : 'PDF 文本解析'}
                  </strong>
                </div>
                <div className="p-3 bg-[#FAF9F5] border border-neutral-200">
                  <span className="opacity-40 block text-[9px] font-mono">异常项目</span>
                  <strong>{latestImport.observations.filter((o) => o.abnormalFlag != null).length} 项</strong>
                </div>
              </div>
            )}

            {latestAbnormal.length > 0 && (
              <div className="border border-neutral-200 divide-y divide-neutral-100">
                {latestAbnormal.map((o) => (
                  <div key={o.id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2 text-xs">
                    <div>
                      <strong>{o.standardName}</strong>
                      {o.originalName !== o.standardName && (
                        <span className="text-neutral-400 font-serif">（{o.originalName}）</span>
                      )}
                    </div>
                    <span className="font-mono">
                      {o.value ?? '—'} {o.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {redFlags.length > 0 && (
              <div className="p-3 border border-amber-200 bg-amber-50 text-[11px] text-amber-950 font-serif space-y-1">
                {redFlags.slice(0, 3).map((f) => (
                  <p key={f.ruleId}>
                    <strong>{f.title}：</strong>{f.message}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* TELEMETRY PERIOD SNAPSHOT */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] border-b pb-2 flex justify-between">
              <span>三、 最近周期 ({timeWindow === '7d' ? '7天' : timeWindow === '30d' ? '30天' : '90天'}) 家庭端自测汇总数据</span>
              <span className="text-neutral-400 lowercase font-normal">* 循证自测</span>
            </h4>

            <div className="grid grid-cols-4 gap-4 text-center font-mono">
              {activeData.stats.map((st, sidx) => (
                <div key={sidx} className="p-3 bg-[#FAF9F5] border">
                  <span className="text-[9px] text-neutral-400 block tracking-tight">{st.name}</span>
                  <strong className="text-sm font-sans block text-neutral-800 mt-1">{st.val} {st.unit}</strong>
                  <span className="text-[8px] font-bold text-neutral-500 block mt-0.5">{st.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Remarks Subjective Block (Doctor's Quick Reading Core) */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] border-b pb-2">
              四、 患者近况自述与诊前主诉备忘
            </h4>
            <div className="p-5 border bg-white border-black text-xs font-serif leading-relaxed">
              <span className="text-[9px] font-sans font-bold text-neutral-400 block mb-2">主诉陈情段落：</span>
              <p className="text-neutral-800 italic">
                “{userRemarks}”
              </p>
            </div>
          </div>

          {/* Core interventions medication checkbox lists */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A] border-b pb-2">
              五、 当前患者自控干预 & 服药登记核备
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {medications.filter(m => m.checked).map((med, idx) => (
                <div key={med.id} className="p-3.5 border border-neutral-200/80 bg-neutral-50/20">
                  <strong className="text-neutral-900 block mb-0.5">0{idx + 1}. {med.name}</strong>
                  <p className="text-[10px] text-neutral-500 font-serif leading-normal">
                    登记用法: {med.dose} | 配合目的: {med.purpose}
                  </p>
                </div>
              ))}
              {medications.filter(m => m.checked).length === 0 && (
                <div className="p-4 text-center text-neutral-400 italic text-xs col-span-2">
                  未选配或登记任何日常干预策略。
                </div>
              )}
            </div>
          </div>

          {/* Final signatures and advice block */}
          <div className="pt-6 border-t border-dashed border-neutral-300 md:flex justify-between items-end text-[10px] text-neutral-400 font-mono">
            <div>
              <span>* 数据收集策略: 传感器 + PDF智能解析</span>
              <br />
              <span>* 支持设备: 家用腕带 & 厦门远程医学实验室数据核验</span>
            </div>
            <div className="text-right mt-4 md:mt-0">
              <span className="font-bold text-[#1A1A1A]">受检人核鉴签字: __________________</span>
            </div>
          </div>

        </div>

      </div>

      <MedicalDisclaimer className="mt-8" />
    </div>
  );
};
