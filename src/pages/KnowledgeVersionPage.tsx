import { L0_SOURCES } from '@/src/data/knowledge/l0Sources';
import { KNOWLEDGE_REGISTRY } from '@/src/data/knowledge/registry';
import { ExternalLink } from 'lucide-react';

export function KnowledgeVersionPage() {
  return (
    <div className="space-y-8 pb-16">
      <div className="border-b-2 border-[#1A1A1A] pb-6">
        <h1 className="text-4xl font-serif tracking-tight text-[#1A1A1A]">知识库版本</h1>
        <p className="text-sm opacity-60 mt-2 font-serif">
          只读展示当前内置结构化知识库版本与来源元数据（L0–L6）。
        </p>
      </div>

      <section className="p-5 bg-white border border-neutral-200 space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">当前版本</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-mono">
          <div>
            <dt className="text-[9px] text-neutral-400 uppercase">版本号</dt>
            <dd className="font-bold">{KNOWLEDGE_REGISTRY.version}</dd>
          </div>
          <div>
            <dt className="text-[9px] text-neutral-400 uppercase">发布日期</dt>
            <dd>{KNOWLEDGE_REGISTRY.publishedAt}</dd>
          </div>
          <div>
            <dt className="text-[9px] text-neutral-400 uppercase">更新日期</dt>
            <dd>{KNOWLEDGE_REGISTRY.updatedAt}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2 pt-2">
          {Object.entries(KNOWLEDGE_REGISTRY.layers).map(([layer, count]) => (
            <span
              key={layer}
              className="text-[10px] font-mono px-2 py-1 bg-neutral-50 border border-neutral-200"
            >
              {layer}: {count} 条
            </span>
          ))}
        </div>
        <ul className="text-[11px] text-neutral-600 font-serif space-y-1 list-disc pl-4 pt-2">
          {KNOWLEDGE_REGISTRY.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
          L0 来源与证据元数据
        </h2>
        <div className="border border-neutral-200 divide-y divide-neutral-100 bg-white">
          {L0_SOURCES.map((src) => (
            <div key={src.id} className="p-4 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs font-bold">{src.name}</p>
                  <p className="text-[10px] font-mono text-neutral-400">{src.id}</p>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-100 shrink-0">
                  {src.evidenceLevel}
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 font-serif">
                {src.publisher} · v{src.version}
                {src.scope ? ` · ${src.scope}` : ''}
              </p>
              {src.url && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-800 underline font-mono"
                >
                  来源链接
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {src.licenseNote && (
                <p className="text-[10px] text-neutral-400 font-serif">{src.licenseNote}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
