import { KNOWLEDGE_BY_ID, resolveSourceUrl } from '@/src/data/knowledge/index';
import type { AgentCitation } from '@/src/agent/types';
import { ExternalLink } from 'lucide-react';

interface AgentCitationListProps {
  citations?: AgentCitation[];
  compact?: boolean;
}

export function AgentCitationList({ citations, compact }: AgentCitationListProps) {
  if (!citations?.length) return null;

  return (
    <div className="space-y-2">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 block">
        知识库引用
      </span>
      {citations.map((c) => {
        const chunk = KNOWLEDGE_BY_ID.get(c.chunkId);
        const url = chunk ? resolveSourceUrl(chunk.source) : undefined;
        return (
          <div
            key={c.chunkId}
            className={
              compact
                ? 'p-2 bg-neutral-50 border border-neutral-100 text-[10px] font-serif'
                : 'p-3 bg-white border border-neutral-100 text-[11px] font-serif'
            }
          >
            <span className="font-mono text-[9px] text-neutral-400 block">{c.chunkId}</span>
            <strong className="text-neutral-800">{c.title}</strong>
            {c.excerpt && <p className="mt-1 text-neutral-600 leading-relaxed">{c.excerpt}</p>}
            {chunk?.source && (
              <p className="mt-1 text-[9px] text-neutral-400">
                来源：{chunk.source.name} · 证据等级 {chunk.source.evidenceLevel}
                {url && (
                  <>
                    {' · '}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-800 underline inline-flex items-center gap-0.5"
                    >
                      查看来源
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CareLevelBadge({ level }: { level?: string }) {
  if (!level) return null;
  const labels: Record<string, string> = {
    S0: '日常维护',
    S1: '生活方式 + 复查',
    S2: '门诊咨询',
    S3: '尽快就医',
    S4: '急诊/立即就医',
  };
  const isEmergency = level === 'S4';
  return (
    <span
      className={
        isEmergency
          ? 'inline-block text-[9px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-900 border border-rose-300'
          : 'inline-block text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200'
      }
    >
      照护等级 {level} · {labels[level] ?? level}
    </span>
  );
}
