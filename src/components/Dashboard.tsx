import React, { useEffect, useMemo, useState } from 'react';
import { 
  Heart, 
  Activity, 
  Moon, 
  Calendar, 
  FileText, 
  Users, 
  Stethoscope,
  TrendingUp,
  Brain,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { 
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useHealthArchive } from '@/src/context/AppContext';
import { buildMemberTimelineView, type TimelineSegmentId } from '@/src/lib/memberTimeline';
import { RedFlagPanel } from '@/src/components/RedFlagPanel';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-white border border-[#1A1A1A] rounded-sm overflow-hidden", className)}>
    {children}
  </div>
);

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string, icon: any, subtitle?: string }) => (
  <div className="flex justify-between items-end mb-8 border-b border-[#1A1A1A]/10 pb-4">
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40 mb-1">{subtitle}</span>
      <h2 className="text-2xl font-serif tracking-tight text-[#1A1A1A]">{title}</h2>
    </div>
    <div className="p-2 border border-[#1A1A1A] rounded-sm">
      <Icon className="w-4 h-4 text-[#1A1A1A]" />
    </div>
  </div>
);

export const Dashboard = () => {
  const [activeSegment, setActiveSegment] = useState<TimelineSegmentId>('overall');
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState<boolean>(false);

  const { trendData, topRedFlags, getLatest, activeMember, activeMemberUseDemoBaseline, hasData } =
    useHealthArchive();

  const timelineView = useMemo(
    () => buildMemberTimelineView(trendData, activeMemberUseDemoBaseline, activeMember.name),
    [trendData, activeMemberUseDemoBaseline, activeMember.name],
  );

  useEffect(() => {
    setActiveSegment('overall');
    setIsNarrativeExpanded(false);
  }, [activeMember.id]);

  const timelineData = timelineView.segments;
  const overallData = timelineView.overall;
  const redFlags = topRedFlags(4);
  const latestLdl = getLatest('ldl_c');
  const latestBmi = getLatest('bmi');
  const latestAlt = getLatest('alt');
  const latestGlucose = getLatest('fasting_glucose');
  const latestYear = trendData.at(-1)?.year ?? '—';

  const currentSegment =
    activeSegment === 'overall' ? overallData : timelineData.find((t) => t.id === activeSegment) ?? overallData;

  return (
    <div className="space-y-12 pb-20">
      {/* 1. LAYER 1: Personal Health Baseline (Current Year Snapshot) */}
      <section className="space-y-6">
        <div className="flex justify-between items-end border-b-2 border-[#1A1A1A] pb-6">
          <div>
            <h1 className="text-5xl font-serif tracking-tight text-[#1A1A1A]">生命资产基线</h1>
            <p className="text-sm opacity-60 mt-3 font-serif">
              {hasData ? `${latestYear} 年度快照：捕捉偏差，而非仅仅记录数据。` : '请先为该成员导入体检档案。'}
            </p>
          </div>
          <div className="text-right hidden md:block">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">个人档案</span>
            <p className="text-sm font-mono font-bold tracking-tighter mt-1">{activeMember.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 border-l-4 border-l-rose-500">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-2">LDL-C (核心血脂)</span>
            <div className="text-4xl font-serif">{latestLdl?.numericValue ?? '—'} <span className="text-xs">mmol/L</span></div>
            <div className="text-[9px] text-rose-800 bg-rose-50 px-1.5 py-0.5 border border-rose-200/40 inline-block font-mono mt-1 font-bold rounded-sm">{latestLdl?.reportDate ?? '—'}</div>
            <p className="text-[10px] mt-2 text-rose-600 font-bold uppercase">
              {latestLdl?.abnormalFlag ? '关注区间' : '—'}
            </p>
          </Card>
          <Card className="p-6 border-l-4 border-l-orange-400">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-2">BMI (体成分)</span>
            <div className="text-4xl font-serif">{latestBmi?.numericValue ?? '—'} <span className="text-xs font-sans tracking-widest">{(latestBmi?.numericValue ?? 0) >= 24 ? '超重' : ''}</span></div>
            <div className="text-[9px] text-orange-800 bg-orange-50 px-1.5 py-0.5 border border-orange-200/40 inline-block font-mono mt-1 font-bold rounded-sm">{latestBmi?.reportDate ?? '—'}</div>
            <p className="text-[10px] mt-2 text-orange-600 font-bold uppercase">
              {(latestBmi?.numericValue ?? 0) >= 24 ? '超重区间' : '—'}
            </p>
          </Card>
          <Card className="p-6 border-l-4 border-l-emerald-500">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-2">ALT (肝功能动态)</span>
            <div className="text-4xl font-serif">{latestAlt?.numericValue ?? '—'} <span className="text-xs">U/L</span></div>
            <div className="text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200/40 inline-block font-mono mt-1 font-bold rounded-sm">{latestAlt?.reportDate ?? '—'}</div>
            <p className="text-[10px] mt-2 text-emerald-600 font-bold uppercase">
              {latestAlt?.abnormalFlag ? '需关注' : '正常范围'}
            </p>
          </Card>
          <Card className="p-6 bg-[#F2F1EF]">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 block mb-2">空腹血糖</span>
            <div className="text-4xl font-serif italic">{latestGlucose?.numericValue ?? '—'} <span className="text-xs">mmol/L</span></div>
            <div className="text-[9px] text-neutral-800 bg-white px-1.5 py-0.5 border border-neutral-300 inline-block font-mono mt-1 font-bold rounded-sm">{latestGlucose?.reportDate ?? '—'}</div>
            <p className="text-[10px] mt-2 opacity-60 font-serif">
              {latestGlucose?.reportDate ?? '—'}
            </p>
          </Card>
        </div>

        <RedFlagPanel flags={redFlags} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* 2. LAYER 2: Longitudinal Narrative */}
          <SectionHeader title="四载资产演进叙事" icon={TrendingUp} subtitle="Archive Trajectory" />
          
          <Card className="p-10 border-2">
            {/* Split Grid to Balance visual density */}
            <div className="mb-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* LEFT COLUMN: INTERACTIVE SCANABLE TIMELINE (8 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">四载数据时点扫视 (Timeline Scan)</p>
                  
                  {/* Executive Overall Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveSegment('overall');
                      setIsNarrativeExpanded(false);
                    }}
                    className={cn(
                      "text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 transition-all rounded-none border border-[#1A1A1A]",
                      activeSegment === 'overall' 
                        ? "bg-[#1A1A1A] text-white" 
                        : "bg-white text-[#1A1A1A] hover:bg-neutral-50"
                    )}
                  >
                    4载总体评估结论
                  </button>
                </div>

                {/* Vertical Interconnect Line */}
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-[#1A1A1A] opacity-10" />

                  {timelineData.length === 0 ? (
                    <p className="text-xs text-neutral-500 font-serif p-4 border border-dashed border-neutral-200">
                      {activeMember.name} 暂无历史体检时点。上传 PDF 或加载 Demo 后将在此展示纵向轨迹。
                    </p>
                  ) : (
                  timelineData.map((node) => {
                    const isActive = activeSegment === node.id;
                    return (
                      <div 
                        key={node.id}
                        onClick={() => {
                          setActiveSegment(node.id);
                        }}
                        className={cn(
                          "relative p-4 border transition-all cursor-pointer rounded-none select-none",
                          isActive 
                            ? "border-[#1A1A1A] bg-neutral-50/50 shadow-sm" 
                            : "border-neutral-200/60 hover:border-[#1A1A1A]/40 bg-white"
                        )}
                      >
                        {/* Bullet indicators connected to timeline line */}
                        <div className={cn(
                          "absolute -left-[20px] top-[21px] w-2.5 h-2.5 rounded-full border-2 transition-all z-10",
                          isActive 
                            ? "bg-[#1A1A1A] border-[#1A1A1A] scale-125" 
                            : "bg-white border-neutral-300"
                        )} />

                        {/* Node Card Title block */}
                        <div className="flex flex-wrap justify-between items-baseline gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-black text-sm text-[#1A1A1A]">{node.year}</span>
                            <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 bg-neutral-100/80 border border-neutral-200/40 text-neutral-600">
                              {node.status}
                            </span>
                          </div>
                          
                          {/* Chronological Mini Values Display */}
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-500">
                            <span>LDL: <strong className="text-neutral-800">{node.ldl}</strong></span>
                            <span>•</span>
                            <span>BMI: <strong className="text-neutral-800">{node.bmi}</strong></span>
                            <span>•</span>
                            <span>ALT: <strong className="text-neutral-800">{node.alt} U/L</strong></span>
                          </div>
                        </div>

                        {/* One line snapshot */}
                        <p className="text-xs text-neutral-600 font-serif leading-relaxed line-clamp-2">
                          {node.summary}
                        </p>
                      </div>
                    );
                  })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: REVELATIVE NARRATIVE INSIGHT WITH CLICK-TO-EXPAND FOLD (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-neutral-200/60 pt-6 lg:pt-0 lg:pl-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>故事洞察叙事 (Narrative Insights)</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-black text-amber-800 tracking-widest block mb-1">
                        {activeSegment === 'overall' ? 'EXECUTIVE SUMMARY' : `${activeSegment} YEAR ABSTRACT`}
                      </span>
                      <h4 className="text-xl font-serif font-semibold text-[#1A1A1A] leading-tight">
                        {activeSegment === 'overall' ? '4载综合代谢结论' : `${activeSegment} 轴向透传`}
                      </h4>
                    </div>

                    {/* Highly-visible, short high-impact focal sentence container */}
                    <div className="p-4 bg-[#F2F1EF]/40 border border-[#1A1A1A]/10 rounded-none relative">
                      <p className="text-xs text-[#1A1A1A]/90 font-serif leading-relaxed">
                        {currentSegment.summary}
                      </p>
                    </div>

                    {/* Interactive Folding Trigger */}
                    <div className="pt-2">
                      <button 
                        type="button"
                        onClick={() => setIsNarrativeExpanded(!isNarrativeExpanded)}
                        className="inline-flex items-center gap-1.5 text-xs text-[#1A1A1A] font-bold uppercase tracking-wider border-b-2 border-[#1A1A1A] pb-0.5 hover:opacity-75 transition-all text-left"
                      >
                        {isNarrativeExpanded ? (
                          <>
                            <span>收起历史解读段落</span>
                            <ChevronUp className="w-4 h-4 shrink-0" />
                          </>
                        ) : (
                          <>
                            <span>展开完整深入叙事</span>
                            <ChevronDown className="w-4 h-4 shrink-0" />
                          </>
                        )}
                      </button>

                      {/* Expanded Narrative panel */}
                      {isNarrativeExpanded && (
                        <div className="mt-4 p-5 bg-[#1A1A1A] text-white rounded-none border border-[#1A1A1A] animate-in fade-in slide-in-from-top-2 duration-300">
                          <p className="text-xs font-serif leading-relaxed text-neutral-100 tracking-wide">
                            {currentSegment.insight}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-dotted border-neutral-200">
                  <p className="text-[10px] font-serif text-neutral-400 leading-normal">
                    * 循证解读：点击左侧时间轴的各个历史节点，系统将自动对齐并定位展示该时点的健康资产自述解构。
                  </p>
                </div>
              </div>

            </div>

            {/* Recharts Trajectory Graph */}
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="1 5" vertical={false} stroke="#1A1A1A" opacity={0.1} />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                  <Tooltip contentStyle={{borderRadius: '0px', border: '1px solid #1A1A1A', backgroundColor: '#FDFCFB'}} />
                  <Area type="monotone" name="LDL-C" dataKey="ldl" stroke="#1A1A1A" fillOpacity={0.1} fill="#1A1A1A" strokeWidth={3} />
                  <Area type="monotone" name="BMI" dataKey="bmi" stroke="#1A1A1A" fill="transparent" strokeDasharray="5 5" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 3. LAYER 3: Honesty Boundary (Slow shifts + Stability) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 border border-[#1A1A1A]/10 rounded-sm">
               <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">缓慢偏移监测信号 (Signals in Normal Range)</h4>
               <div className="space-y-6">
                 <div>
                   <div className="flex justify-between items-end mb-2">
                     <span className="text-xs font-serif">收缩压 (97 → 118 mmHg)</span>
                     <span className="text-[10px] font-bold uppercase text-orange-600">正常但持续抬升</span>
                   </div>
                   <div className="h-1 bg-[#1A1A1A]/5 w-full">
                     <div className="h-full bg-[#1A1A1A] w-[65%]" />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between items-end mb-2">
                     <span className="text-xs font-serif">空腹血糖 (4.37 → 5.03 mmol/L)</span>
                     <span className="text-[10px] font-bold uppercase text-orange-600">2025 出现显著偏移</span>
                   </div>
                   <div className="h-1 bg-[#1A1A1A]/5 w-full">
                     <div className="h-full bg-[#1A1A1A] w-[45%]" />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between items-end mb-2">
                     <span className="text-xs font-serif">eGFR (肾小球滤过率 107 → 92)</span>
                     <span className="text-[10px] font-bold uppercase text-[#1A1A1A] opacity-60">阶梯式平缓下降</span>
                   </div>
                   <div className="h-1 bg-[#1A1A1A]/5 w-full">
                     <div className="h-full bg-[#1A1A1A]/60 w-[30%]" />
                   </div>
                 </div>
               </div>
               <p className="text-[10px] mt-6 opacity-50 font-serif leading-relaxed">这些指标单看目前处于“绿区”，但 4 年维度叠加正在滑向“黄区”边缘，需提前建立防线下沉策略。</p>
             </div>

             <div className="p-8 bg-[#F2F1EF] border border-[#1A1A1A]/5 rounded-sm">
               <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">诚实观测边界 (不可调指标)</h4>
               <div className="space-y-4">
                 {[
                   { name: '胆囊息肉样变', val: '0.3cm', trend: '长期稳定' },
                   { name: '双侧乳腺囊性结节', val: 'BI-RADS 2', trend: '2024 新增' }
                 ].map(item => (
                   <div key={item.name} className="flex justify-between items-start opacity-70">
                     <div className="flex flex-col">
                       <span className="text-sm font-bold">{item.name}</span>
                       <span className="text-[10px] font-serif font-medium">{item.trend}</span>
                     </div>
                     <span className="text-[10px] px-2 py-0.5 border border-[#1A1A1A] uppercase font-bold">{item.val}</span>
                   </div>
                 ))}
               </div>
               <div className="mt-8 pt-4 border-t border-[#1A1A1A]/5">
                 <p className="text-[9px] font-serif opacity-40 leading-relaxed uppercase tracking-tight">这些指标属性被标记为“静态资产”。系统将它们从日常干预仪表盘中剥离，仅在年度复查时唤起关注。</p>
               </div>
             </div>
          </div>
        </div>

        {/* 4. LAYER 4: Personalized Intervention Focus */}
        <aside className="space-y-8">
          <SectionHeader title="本年个性化焦点" icon={Brain} subtitle="Strategic Levers" />
          <div className="space-y-4">
            {[
              { 
                id: 'fh', 
                title: '讨论 FH (家族性高胆固醇) 假设', 
                desc: '鉴于您在 26 岁体重极优时已有严重血脂异常。下次复诊主动向内分泌科医生提问。',
                type: 'Clinical',
              },
              { 
                id: 'salt', 
                title: '减盐实验与血压耦合监测', 
                desc: '自测问卷显示口味偏重，且收缩压 4 年持续上升。验证低盐饮食对血压的压制力。',
                type: 'Lifestyle',
              },
              { 
                id: 'cgm', 
                title: '考虑进行 14 天 CGM 血糖监测', 
                desc: '2025 年血糖出现明显上升信号。识别清晨空腹至工作集中期间的血糖轨迹。',
                type: 'Advanced',
              },
              { 
                id: 'bmi_goal', 
                title: '将 BMI 锁定在 23.5 以下', 
                desc: '2022 年的数据证明，体重回归是您稳定血脂资产的最强杠杆。',
                type: 'Body',
              },
              {
                id: 'clinical_export',
                title: '2026.02 体检前生成就诊参考卡',
                desc: '系统将过去 4 年的演进模式提炼为医生可读的客观就诊参考档案。',
                type: 'System'
              }
            ].map(item => (
              <div key={item.id} className="p-6 bg-white border border-[#1A1A1A] hover:bg-[#FDFCFB] transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#1A1A1A] text-white">Focus: {item.type}</span>
                  </div>
                  <h5 className="font-serif text-lg leading-tight mb-2 flex items-center gap-2">
                    {item.title}
                  </h5>
                  <p className="text-[11px] opacity-60 leading-relaxed font-serif">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-8 border border-[#1A1A1A] border-dashed mt-12 bg-white flex flex-col items-center justify-center text-center">
            <Clock className="w-12 h-12 mb-4 opacity-5" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">距离下一次资产评估</p>
            <p className="text-2xl font-serif italic mt-2 opacity-80">Remaining: 291 Days</p>
          </div>
        </aside>
      </div>
      <footer className="mt-20 pt-10 border-t border-[#1A1A1A]/10 flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="flex flex-col gap-4">
           <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30">Active Data Archives (4-Year Dataset)</span>
           <div className="flex gap-4">
              {['2021.11', '2022.12', '2024.03', '2025.02'].map(date => (
                <div key={date} className="flex flex-col gap-1 group cursor-pointer">
                   <div className="w-8 h-10 border border-[#1A1A1A]/20 bg-white flex items-center justify-center group-hover:bg-[#1A1A1A] transition-all">
                     <FileText className="w-4 h-4 opacity-20 group-hover:opacity-100 group-hover:text-white" />
                   </div>
                   <span className="text-[8px] font-mono opacity-40">{date}</span>
                 </div>
              ))}
           </div>
        </div>
        <div className="text-right">
           <p className="text-[10px] font-serif italic opacity-30">Health Archive Project | Data Policy: Honesty & Minimalist Privacy</p>
           <p className="text-[9px] font-mono opacity-20 mt-1">Reflects longitudinal patterns of CY Chen (Network Technology Worker)</p>
        </div>
      </footer>
      <MedicalDisclaimer className="mt-8" />
    </div>
  );
};
