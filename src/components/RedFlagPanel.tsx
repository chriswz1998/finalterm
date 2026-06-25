import React from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { RedFlagHit, RedFlagSeverity } from '@/src/lib/redFlagRules';

const severityStyles: Record<RedFlagSeverity, { border: string; bg: string; text: string; icon: typeof AlertCircle }> = {
  critical: { border: 'border-rose-400', bg: 'bg-rose-50', text: 'text-rose-900', icon: AlertCircle },
  high: { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-900', icon: AlertCircle },
  moderate: { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-900', icon: AlertCircle },
  info: { border: 'border-neutral-300', bg: 'bg-neutral-50', text: 'text-neutral-700', icon: Info },
};

export function RedFlagPanel({ flags, className }: { flags: RedFlagHit[]; className?: string }) {
  if (flags.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">规则引擎 · 红旗提示</span>
        <span className="text-[9px] font-mono text-neutral-400">非诊断 · 供复诊讨论参考</span>
      </div>
      <div className="grid gap-2">
        {flags.map((flag) => {
          const style = severityStyles[flag.severity];
          const Icon = style.icon;
          return (
            <div
              key={flag.ruleId}
              className={cn('border p-4 rounded-sm', style.border, style.bg)}
            >
              <div className="flex gap-3">
                <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', style.text)} />
                <div className="space-y-1 min-w-0">
                  <p className={cn('text-xs font-bold uppercase tracking-wide', style.text)}>{flag.title}</p>
                  <p className="text-xs font-serif leading-relaxed opacity-90">{flag.message}</p>
                  {flag.discussionPrompt && (
                    <p className="text-[10px] font-mono opacity-70 pt-1">→ {flag.discussionPrompt}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
