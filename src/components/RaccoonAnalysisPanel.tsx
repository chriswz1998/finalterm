import { useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { BarChart3, Download, FileText, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import type { BatchAnalysisResult } from '@/src/lib/batchReportImport';
import {
  INSIGHT_KIND_LABEL,
  INSIGHT_KIND_STYLE,
  parseRaccoonMarkdown,
  type InsightKind,
} from '@/src/lib/parseRaccoonMarkdown';
import { cn } from '@/src/lib/utils';
import { ImageLightbox, ZoomableImage } from '@/src/components/ImageLightbox';
import { MarkdownTableCharts } from '@/src/components/MarkdownTableCharts';

function raccoonImageSrc(raw: string): string {
  if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
  return `data:image/png;base64,${raw}`;
}

function artifactLabel(name: string): string {
  if (/\.pptx?$/i.test(name)) return 'PPT 报告';
  if (/\.xlsx?$/i.test(name)) return 'Excel';
  if (/\.pdf$/i.test(name)) return 'PDF';
  if (/\.png|\.jpe?g|\.webp$/i.test(name)) return '图表';
  return '文件';
}

function InsightIcon({ kind }: { kind: InsightKind }) {
  const cls = 'w-3.5 h-3.5 shrink-0';
  if (kind === 'trend') return <TrendingUp className={cls} />;
  if (kind === 'abnormal') return <AlertTriangle className={cls} />;
  if (kind === 'question') return <FileText className={cls} />;
  return <BarChart3 className={cls} />;
}

function LlmTrendColumns({ analysis }: { analysis: BatchAnalysisResult }) {
  const cols = [
    { key: 'improving', label: '向好', icon: TrendingUp, style: 'border-emerald-200 bg-emerald-50 text-emerald-950' },
    { key: 'worsening', label: '需关注', icon: TrendingDown, style: 'border-rose-200 bg-rose-50 text-rose-950' },
    { key: 'stable', label: '稳定', icon: Minus, style: 'border-neutral-200 bg-neutral-50 text-neutral-800' },
  ] as const;

  const hasAny = cols.some((c) => (analysis[c.key]?.length ?? 0) > 0);
  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cols.map(({ key, label, icon: Icon, style }) => {
        const items = analysis[key] ?? [];
        if (!items.length) return null;
        return (
          <div key={key} className={cn('border p-3 space-y-2', style)}>
            <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item} className="text-xs font-serif leading-snug">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function useMarkdownComponents(onZoom: (src: string, alt: string) => void) {
  return useMemo(
    () => ({
      h1: ({ children }: { children?: ReactNode }) => (
        <h3 className="text-base font-serif font-semibold text-[#1A1A1A] mt-6 mb-2 first:mt-0">{children}</h3>
      ),
      h2: ({ children }: { children?: ReactNode }) => (
        <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-600 mt-5 mb-2">{children}</h4>
      ),
      h3: ({ children }: { children?: ReactNode }) => (
        <h5 className="text-sm font-serif font-semibold text-neutral-800 mt-4 mb-1">{children}</h5>
      ),
      p: ({ children }: { children?: ReactNode }) => (
        <p className="text-sm font-serif text-neutral-700 leading-relaxed my-2">{children}</p>
      ),
      ul: ({ children }: { children?: ReactNode }) => (
        <ul className="my-2 space-y-1.5 pl-1">{children}</ul>
      ),
      ol: ({ children }: { children?: ReactNode }) => (
        <ol className="my-2 space-y-1.5 pl-5 list-decimal">{children}</ol>
      ),
      li: ({ children }: { children?: ReactNode }) => (
        <li className="text-sm font-serif text-neutral-700 leading-relaxed flex gap-2">
          <span className="text-amber-800 mt-1.5 shrink-0">·</span>
          <span className="flex-1">{children}</span>
        </li>
      ),
      strong: ({ children }: { children?: ReactNode }) => (
        <strong className="font-semibold text-[#1A1A1A]">{children}</strong>
      ),
      blockquote: ({ children }: { children?: ReactNode }) => (
        <blockquote className="border-l-2 border-amber-300 pl-3 my-3 text-xs text-neutral-600 italic">
          {children}
        </blockquote>
      ),
      img: ({ src, alt }: { src?: string; alt?: string }) => {
        if (!src) return null;
        const resolved = raccoonImageSrc(src);
        return (
          <span className="block my-3 max-w-md">
            <ZoomableImage
              src={resolved}
              alt={alt ?? '分析图片'}
              onZoom={onZoom}
            />
          </span>
        );
      },
      table: ({ children }: { children?: ReactNode }) => (
        <div className="my-3 overflow-x-auto border border-neutral-200 bg-white">
          <table className="min-w-full text-xs font-serif">{children}</table>
        </div>
      ),
      th: ({ children }: { children?: ReactNode }) => (
        <th className="bg-neutral-100 px-3 py-2 text-left font-bold text-neutral-700">{children}</th>
      ),
      td: ({ children }: { children?: ReactNode }) => (
        <td className="border-t border-neutral-100 px-3 py-2 text-neutral-700">{children}</td>
      ),
    }),
    [onZoom],
  );
}

export function RaccoonAnalysisPanel({
  analysis,
  loading,
}: {
  analysis: BatchAnalysisResult | null;
  loading?: boolean;
}) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const openZoom = useCallback((src: string, alt: string) => setLightbox({ src, alt }), []);
  const markdownComponents = useMarkdownComponents(openZoom);

  if (loading) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-4 text-xs font-serif text-amber-900 space-y-1">
        <p className="font-bold">办公小浣熊正在做跨报告数据分析…</p>
        <p className="text-amber-800/80">远程沙箱通常需要 1–3 分钟，请耐心等待。</p>
      </div>
    );
  }

  if (!analysis) return null;

  const markdown = analysis.analysisText ?? analysis.overallSummary ?? '';
  const parsed = parseRaccoonMarkdown(markdown, analysis.crossReportInsights ?? []);

  return (
    <>
      <ImageLightbox
        open={lightbox != null}
        src={lightbox?.src ?? null}
        alt={lightbox?.alt ?? ''}
        onClose={() => setLightbox(null)}
      />

      <div className="border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 bg-[#FAF9F5]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
            {analysis.source === 'raccoon' ? '🦝 办公小浣熊 · 跨报告分析' : 'LLM 跨期分析'}
            {analysis.label ? ` · ${analysis.label}` : ''}
          </p>
          {analysis.headline && (
            <h2 className="text-lg font-serif font-semibold text-[#1A1A1A] mt-2 leading-snug">{analysis.headline}</h2>
          )}
        </div>

        <div className="p-5 space-y-5">
          {parsed.insights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parsed.insights.map((item, i) => {
                const style = INSIGHT_KIND_STYLE[item.kind];
                return (
                  <div
                    key={`${item.kind}-${i}`}
                    className={cn('border p-3 flex gap-2.5', style.border, style.bg, style.text)}
                  >
                    <div className={cn('w-1 rounded-full shrink-0 self-stretch', style.dot)} />
                    <div className="min-w-0 space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-1">
                        <InsightIcon kind={item.kind} />
                        {INSIGHT_KIND_LABEL[item.kind]}
                      </span>
                      <p className="text-xs font-serif leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <LlmTrendColumns analysis={analysis} />

          <MarkdownTableCharts tables={parsed.tables} />

          {parsed.bodyMarkdown && (
            <div className="border border-neutral-100 bg-neutral-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">详细分析</p>
              <div className="raccoon-prose max-w-none">
                <ReactMarkdown components={markdownComponents}>{parsed.bodyMarkdown}</ReactMarkdown>
              </div>
            </div>
          )}

          {(analysis.suggestedQuestions?.length ?? 0) > 0 && (
            <div className="border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">复诊可问医生</p>
              <ul className="space-y-1">
                {analysis.suggestedQuestions!.map((q) => (
                  <li key={q} className="text-xs font-serif text-emerald-950 flex gap-2">
                    <span className="text-emerald-600">?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis.images?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                小浣熊生成图表 · 点击放大
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analysis.images!.map((img, i) => {
                  const src = raccoonImageSrc(img);
                  const alt = `分析图表 ${i + 1}`;
                  return (
                    <ZoomableImage
                      key={`${i}-${src.slice(0, 24)}`}
                      src={src}
                      alt={alt}
                      caption={`图表 ${i + 1} · 点击放大`}
                      onZoom={openZoom}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {(analysis.artifacts?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">下载产物</p>
              <div className="flex flex-wrap gap-2">
                {analysis.artifacts!.map((a) => (
                  <a
                    key={a.url}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#1A1A1A]/15 bg-white hover:bg-neutral-50 transition-colors text-xs font-serif"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-800" />
                    <span>
                      <span className="block font-semibold text-[#1A1A1A]">{artifactLabel(a.filename)}</span>
                      <span className="block text-[10px] text-neutral-500 truncate max-w-[200px]">{a.filename}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {analysis.disclaimer && (
            <p className="text-[10px] font-serif text-neutral-400 border-t border-neutral-100 pt-3 leading-relaxed">
              {analysis.disclaimer}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
