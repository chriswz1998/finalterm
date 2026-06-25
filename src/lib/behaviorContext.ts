/** Load wearable + correlation context from Pipeline output for Agent/RAG prompts. */

const CACHE_KEY = 'health-link-behavior-context';
const CACHE_TTL_MS = 30 * 60 * 1000;

export interface CorrelationInsightDto {
  id: string;
  rule_id: string;
  fact_summary: string;
  indicators: string[];
  exam_date?: string;
  citations?: string[];
}

export interface BehaviorContextPayload {
  context_summary?: {
    latest_exam?: { date: string; anomalies: string[] };
    recent_90d?: {
      avg_sleep?: number | null;
      avg_exercise?: number | null;
      resting_hr_trend?: string;
      avg_hrv?: number | null;
    };
    correlation_insights?: CorrelationInsightDto[];
    data_quality_warnings?: string[];
  };
  correlation_insights?: CorrelationInsightDto[];
  exam_behavior_snapshots?: Array<{
    exam_date: string;
    avg_sleep_hours: number | null;
    avg_exercise_minutes: number | null;
    anomaly_window_count: number;
    anomalies_at_exam: string[];
  }>;
}

let memoryCache: { at: number; data: BehaviorContextPayload | null } | null = null;

export async function loadBehaviorContext(): Promise<BehaviorContextPayload | null> {
  if (memoryCache && Date.now() - memoryCache.at < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  try {
    const res = await fetch('/api/pipeline/output');
    if (res.ok) {
      const data = (await res.json()) as BehaviorContextPayload;
      memoryCache = { at: Date.now(), data };
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
      } catch {
        /* ignore */
      }
      return data;
    }
  } catch {
    /* try cache */
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { at: number; data: BehaviorContextPayload };
      if (Date.now() - parsed.at < CACHE_TTL_MS * 4) {
        memoryCache = { at: parsed.at, data: parsed.data };
        return parsed.data;
      }
    }
  } catch {
    /* ignore */
  }

  memoryCache = { at: Date.now(), data: null };
  return null;
}

export function formatBehaviorContextForPrompt(ctx: BehaviorContextPayload | null): string {
  if (!ctx) return '';

  const lines: string[] = ['【近期行为上下文（Apple Health，非诊断依据）】'];
  const summary = ctx.context_summary;
  const recent = summary?.recent_90d;

  if (recent?.avg_sleep != null) {
    lines.push(`- 近 90 天平均睡眠 ${recent.avg_sleep} 小时/天`);
  }
  if (recent?.avg_exercise != null) {
    lines.push(`- 近 90 天日均运动 ${recent.avg_exercise} 分钟`);
  }
  if (recent?.avg_hrv != null) {
    lines.push(`- 近 90 天平均 HRV ${recent.avg_hrv} ms`);
  }

  const insights = ctx.correlation_insights ?? summary?.correlation_insights ?? [];
  for (const ins of insights.slice(0, 4)) {
    lines.push(`- [${ins.rule_id}] ${ins.fact_summary}`);
  }

  const snap = ctx.exam_behavior_snapshots?.[ctx.exam_behavior_snapshots.length - 1];
  if (snap?.anomaly_window_count) {
    lines.push(
      `- 最近体检（${snap.exam_date}）前 90 天出现 ${snap.anomaly_window_count} 次行为偏移窗口`
    );
  }

  for (const w of summary?.data_quality_warnings ?? []) {
    lines.push(`- 数据提示：${w}`);
  }

  if (lines.length <= 1) return '';
  return lines.join('\n');
}

export function correlationRuleIds(ctx: BehaviorContextPayload | null): string[] {
  if (!ctx) return [];
  const insights = ctx.correlation_insights ?? ctx.context_summary?.correlation_insights ?? [];
  return insights.map((i) => i.rule_id).filter(Boolean);
}

export function correlationCitationIds(ctx: BehaviorContextPayload | null): string[] {
  if (!ctx) return [];
  const insights = ctx.correlation_insights ?? ctx.context_summary?.correlation_insights ?? [];
  return insights.flatMap((i) => i.citations ?? []).filter(Boolean);
}
