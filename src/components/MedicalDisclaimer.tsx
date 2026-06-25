import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

type DisclaimerVariant = 'compact' | 'full';

interface MedicalDisclaimerProps {
  variant?: DisclaimerVariant;
  className?: string;
}

export function MedicalDisclaimer({ variant = 'compact', className }: MedicalDisclaimerProps) {
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'p-4 bg-amber-50/60 border border-amber-200/80 text-[11px] font-serif text-neutral-700 leading-relaxed',
          className,
        )}
      >
        <span className="font-sans font-bold text-amber-900 uppercase tracking-wider text-[10px] block mb-1">
          非医疗诊断声明
        </span>
        本应用仅供健康档案整理与指标解读参考，不能替代执业医师的诊断、处方或治疗方案。如有不适或指标异常，请前往正规医疗机构就诊。
        <span className="block mt-1 text-neutral-500">
          AI 解读需联网，指标文本经服务端代理发送至大模型（如百炼 Qwen）；PDF 文本提取在浏览器本地完成。
          <Link to="/privacy" className="text-emerald-800 underline ml-1">
            隐私政策
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-6 bg-[#FAF9F5] border border-amber-200/80 space-y-3 text-xs font-serif text-neutral-700 leading-relaxed',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-amber-900">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <h3 className="font-sans font-bold text-sm">医疗信息使用边界</h3>
      </div>
      <ul className="space-y-2 list-disc list-inside">
        <li>本应用<strong>不提供</strong>疾病诊断、用药建议或预后判断。</li>
        <li>图表与叙事基于您导入的档案数据，仅供复诊沟通参考。</li>
        <li>「AI 说人话」解读经服务端安全代理调用 Gemini，不会在前端暴露 API 密钥。</li>
        <li>PDF 文本在浏览器本地提取；仅当您主动触发 AI 解读时，相关指标才会发送至 AI 服务。</li>
      </ul>
    </div>
  );
}
