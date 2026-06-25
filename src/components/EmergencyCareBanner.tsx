import { AlertTriangle, Phone } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { RedFlagHit } from '@/src/lib/redFlagRules';
import { hasEmergencyRedFlags, isEmergencyCareLevel } from '@/src/lib/knowledgeRetrieve';

interface EmergencyCareBannerProps {
  careLevel?: string | null;
  redFlags?: RedFlagHit[];
  className?: string;
}

export function EmergencyCareBanner({ careLevel, redFlags, className }: EmergencyCareBannerProps) {
  const show = isEmergencyCareLevel(careLevel) || hasEmergencyRedFlags(redFlags);
  if (!show) return null;

  const emergencyFlags = redFlags?.filter((f) => f.ruleId.startsWith('emergency_')) ?? [];

  return (
    <div
      role="alert"
      className={cn(
        'p-4 border-2 border-rose-600 bg-rose-50 text-rose-950 space-y-2',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 shrink-0 text-rose-700 mt-0.5" />
        <div className="space-y-1.5 min-w-0">
          <p className="text-sm font-bold tracking-tight">
            S4 · 急诊 / 立即就医
          </p>
          <p className="text-[12px] font-serif leading-relaxed">
            检出危急值或接近急诊阈值。若出现胸痛、气促、意识改变、严重腹痛等不适，请<strong>立即拨打 120 或前往急诊</strong>。
            即使暂无明显症状，也应在最短时间内由医生当面评估。
          </p>
          {emergencyFlags.length > 0 && (
            <ul className="text-[11px] space-y-1 list-disc pl-4 font-serif">
              {emergencyFlags.slice(0, 4).map((f) => (
                <li key={f.ruleId}>
                  <strong>{f.title}</strong> — {f.message}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] flex items-center gap-1 text-rose-800/80 font-mono pt-1">
            <Phone className="w-3 h-3" />
            本应用不能替代急诊医疗处置
          </p>
        </div>
      </div>
    </div>
  );
}
