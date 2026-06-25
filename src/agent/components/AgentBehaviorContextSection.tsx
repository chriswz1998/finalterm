import { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import {
  loadBehaviorContext,
  formatBehaviorContextForPrompt,
  type BehaviorContextPayload,
} from '@/src/lib/behaviorContext';

export function AgentBehaviorContextSection() {
  const [open, setOpen] = useState(true);
  const [ctx, setCtx] = useState<BehaviorContextPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBehaviorContext()
      .then(setCtx)
      .finally(() => setLoading(false));
  }, []);

  const text = formatBehaviorContextForPrompt(ctx);
  if (loading) return null;
  if (!text) return null;

  const insights = ctx?.correlation_insights ?? ctx?.context_summary?.correlation_insights ?? [];

  return (
    <div className="border border-blue-100 bg-blue-50/50 rounded-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-blue-900 flex items-center gap-1.5">
          <Activity className="w-4 h-4" />
          结合近期生活数据（Apple Health）
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-blue-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-600" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          <pre className="text-xs text-blue-900/90 whitespace-pre-wrap font-sans leading-relaxed">
            {text.replace('【近期行为上下文（Apple Health，非诊断依据）】\n', '')}
          </pre>
          {insights.length > 0 && (
            <p className="text-[10px] text-blue-700/70">
              以上事实由 Pipeline 规则引擎生成，AI 解读时仅作背景引用。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export { loadBehaviorContext, formatBehaviorContextForPrompt };
