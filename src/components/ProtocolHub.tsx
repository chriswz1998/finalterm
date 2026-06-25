import React, { useState } from 'react';
import { 
  Target, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { reconcileLifestyleConflict, GeminiApiError, type AdjustedProtocol } from '@/src/services/geminiService';
import { useAppContext } from '@/src/context/AppContext';
import { ErrorBanner } from '@/src/components/ErrorBanner';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';

export default function ProtocolHub() {
  const { aiConsentGranted, setAiConsentGranted, logConsentEvent } = useAppContext();
  const [medicalAdvice, setMedicalAdvice] = useState('胆囊 0.3cm 息肉：建议规律饮食，坚持吃早餐以帮助胆汁排空，减少刺激。');
  const [userHabit, setUserHabit] = useState('我习惯不吃早餐。因为我是一名网络技术人员，早晨空腹能让我保持高度的集中力工作，此时效率最高。');
  const [protocol, setProtocol] = useState<AdjustedProtocol | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loggedtoday, setLoggedToday] = useState<Record<string, boolean>>({});

  const [error, setError] = useState<string | null>(null);

  const handleNegotiate = async () => {
    if (!aiConsentGranted) {
      setError('请勾选 AI 第三方模型使用同意后再执行策略调和。');
      return;
    }
    setIsLoading(true);
    setError(null);
    logConsentEvent('ai_reconcile');
    try {
      const result = await reconcileLifestyleConflict(medicalAdvice, userHabit);
      setProtocol(result);
    } catch (err) {
      setError(
        err instanceof GeminiApiError
          ? err.message
          : '策略调和失败，请确认 API 服务已启动。',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLog = (label: string) => {
    setLoggedToday(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-end border-b-2 border-[#1A1A1A] pb-6">
        <div>
          <h1 className="text-5xl font-serif tracking-tight text-[#1A1A1A]">协议干预层</h1>
          <p className="text-sm opacity-60 mt-3 font-serif">当临床医学建议碰撞个人生活习惯，寻找最优共存策略。</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Input Phase */}
        <div className="space-y-8">
          <div className="p-8 bg-[#FDFCFB] border border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
             <div className="flex flex-wrap gap-2 mb-4">
               {[
                 { name: '胆囊息肉 vs 不吃早餐', advice: '建议规律饮食，坚持吃早餐以帮助胆汁排空。', habit: '我习惯不吃早餐，因为空腹能让我早上集中注意力工作，效率最高。' }
               ].map(sample => (
                 <button 
                   key={sample.name}
                   onClick={() => { setMedicalAdvice(sample.advice); setUserHabit(sample.habit); }}
                   className="px-3 py-1 border border-[#1A1A1A]/10 text-[9px] font-bold uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-all"
                 >
                   {sample.name}
                 </button>
               ))}
             </div>

             <div className="flex items-center gap-3 mb-6">
               <AlertCircle className="w-5 h-5 opacity-40" />
               <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">医学建议 (Medical Advice)</h3>
             </div>
             <p className="text-sm font-serif mb-8 opacity-80">“{medicalAdvice}”</p>
             
             <div className="h-px bg-[#1A1A1A]/10 mb-8" />

             <div className="flex items-center gap-3 mb-4">
               <RefreshCcw className="w-5 h-5 opacity-40" />
               <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">习惯冲突与诉求 (User Habits)</h3>
             </div>
             <textarea 
               value={userHabit}
               onChange={(e) => setUserHabit(e.target.value)}
               placeholder="描述您的生活限制，例如：我习惯不吃早餐，因为空腹能让我早上集中注意力工作..."
               className="w-full h-32 bg-[#F2F1EF] border-0 p-4 text-sm font-serif focus:ring-1 focus:ring-[#1A1A1A] outline-none transition-all"
             />

             <label className="flex gap-2 items-start cursor-pointer mt-4">
               <input
                 type="checkbox"
                 checked={aiConsentGranted}
                 onChange={(e) => {
                   setAiConsentGranted(e.target.checked);
                   if (e.target.checked) logConsentEvent('ai_consent_granted_protocol');
                 }}
                 className="mt-0.5"
               />
               <span className="text-[10px] font-serif text-neutral-500">同意 AI 策略调和经 Gemini 代理处理</span>
             </label>

             <button 
               onClick={handleNegotiate}
               disabled={isLoading || !userHabit || !aiConsentGranted}
               className="mt-6 w-full py-4 bg-[#1A1A1A] text-white font-bold text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-30"
             >
               {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
               执行策略调和
             </button>
          </div>

          <div className="p-8 border border-[#1A1A1A]/10 bg-[#F2F1EF]/50">
             <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4 uppercase">调和原则</h4>
             <p className="text-[11px] font-serif opacity-60 leading-relaxed">
               策略调和层优先考虑“生物杠杆”。如果完全执行医学建议会导致您的生活质量或生产力骤降，我们将寻找替代性的物理/生物触发点来实现类似的临床效果。
             </p>
          </div>
        </div>

        {/* Result & Tracking Phase */}
        <div className="space-y-8">
          {protocol ? (
            <div className="animate-in fade-in slide-in-from-right-8 duration-700">
               <div className="bg-white border-2 border-[#1A1A1A] p-10">
                 <div className="flex items-center gap-3 mb-8">
                    <Target className="w-6 h-6" />
                    <h2 className="text-2xl font-serif leading-none">共存策略协议</h2>
                 </div>

                 <div className="p-6 bg-[#F2F1EF] border-l-4 border-[#1A1A1A] mb-10">
                    <p className="text-sm font-serif leading-relaxed opacity-80">
                      {protocol.reconciledStrategy}
                    </p>
                 </div>

                 <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-6 flex items-center gap-4">
                    Daily Check-in
                    <div className="flex-1 h-px bg-[#1A1A1A]/5" />
                 </h3>

                 <div className="space-y-4">
                    {protocol.quantifiableMetrics.map((m, i) => (
                      <button 
                        key={i}
                        onClick={() => toggleLog(m.label)}
                        className={`w-full flex items-center justify-between p-5 border transition-all ${
                          loggedtoday[m.label] 
                          ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-inner' 
                          : 'bg-white border-[#1A1A1A]/10 hover:border-[#1A1A1A]'
                        }`}
                      >
                        <div className="text-left">
                          <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${loggedtoday[m.label] ? 'text-white/40' : 'text-[#1A1A1A]/40'}`}>
                            {m.label}
                          </p>
                          <p className="font-serif text-sm">
                            目标: {m.target} {m.unit}
                          </p>
                        </div>
                        {loggedtoday[m.label] ? (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        ) : (
                          <div className="w-6 h-6 border-2 border-[#1A1A1A]/10 rounded-full" />
                        )}
                      </button>
                    ))}
                 </div>

                 <div className="mt-10 pt-8 border-t border-[#1A1A1A]/10 flex justify-between items-center text-[10px] font-serif opacity-30">
                   <span>数据存储于本地加密层</span>
                   <span>趋势将同步至健康仪表盘</span>
                 </div>
               </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border border-[#1A1A1A]/10 flex flex-col items-center justify-center text-[#1A1A1A]/5">
              <ClipboardList className="w-32 h-32 mb-6 opacity-5" />
              <p className="text-[11px] uppercase tracking-[0.4em] font-bold">等待制定调和协议</p>
            </div>
          )}
        </div>
      </div>
      <MedicalDisclaimer className="mt-8" />
    </div>
  );
}
