import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { buildReferenceRangeDisplay } from '@/src/lib/referenceRangeHint';
import type { Observation } from '@/src/types/observation';

const FLAG_LABEL: Record<string, string> = {
  high: '偏高',
  low: '偏低',
  positive: '阳性',
  critical: '危急',
};

interface AgentRawReportSectionProps {
  observations: Observation[];
  reportDate?: string;
  source?: string;
}

function sortObservations(list: Observation[]): Observation[] {
  return [...list].sort((a, b) => {
    const aAb = a.abnormalFlag != null ? 0 : 1;
    const bAb = b.abnormalFlag != null ? 0 : 1;
    if (aAb !== bAb) return aAb - bAb;
    return a.standardName.localeCompare(b.standardName, 'zh-CN');
  });
}

export function AgentRawReportSection({ observations, reportDate, source }: AgentRawReportSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const abnormal = useMemo(
    () => sortObservations(observations.filter((o) => o.abnormalFlag != null)),
    [observations],
  );
  const normal = useMemo(
    () => sortObservations(observations.filter((o) => o.abnormalFlag == null)),
    [observations],
  );

  const visible = showAll ? sortObservations(observations) : abnormal.length > 0 ? abnormal : sortObservations(observations).slice(0, 12);

  if (observations.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2">
        <FileText className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">报告原始数据</h3>
          <p className="text-[11px] text-neutral-500 font-serif leading-relaxed mt-1">
            以下由大模型从报告中提取的<strong className="text-neutral-700">原文指标</strong>。
            「标准名称」是系统归一化后的叫法，便于与知识库对照；下方「说人话摘要」将据此解读。
          </p>
          {(reportDate || source) && (
            <p className="text-[10px] font-mono text-neutral-400 mt-1">
              {reportDate ?? '—'}
              {source === 'vision_ocr' ? ' · 拍照/图片 · 视觉大模型提取' : source === 'pdf_extract' ? ' · PDF 文本提取' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="border border-neutral-200 bg-white divide-y divide-neutral-100">
        {visible.map((o) => (
          <div key={o.id} className="px-3 py-2.5 space-y-1">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#1A1A1A] truncate">{o.originalName}</p>
                {o.standardName !== o.originalName && (
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    标准名称：<span className="font-mono text-neutral-700">{o.standardName}</span>
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-bold tabular-nums">
                  {o.value ?? '—'}
                  {o.unit ? <span className="text-[10px] font-normal text-neutral-500 ml-0.5">{o.unit}</span> : null}
                </p>
                {o.abnormalFlag && (
                  <span
                    className={cn(
                      'inline-block text-[9px] font-bold px-1 py-0.5 mt-0.5',
                      o.abnormalFlag === 'high' || o.abnormalFlag === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : o.abnormalFlag === 'low'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-orange-100 text-orange-800',
                    )}
                  >
                    {FLAG_LABEL[o.abnormalFlag] ?? o.abnormalFlag}
                  </span>
                )}
              </div>
            </div>
            {(() => {
              const ref = buildReferenceRangeDisplay({
                referenceRange: o.referenceRange,
                canonicalId: o.canonicalId,
              });
              if (!ref.displayRange) return null;
              return (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-neutral-400 font-mono">
                    参考范围 {ref.displayRange}
                    {ref.source === 'report' && (
                      <span className="text-neutral-300 ml-1">· 报告单</span>
                    )}
                  </p>
                  {ref.source === 'wst_fallback' && ref.hint && (
                    <p className="text-[9px] text-amber-700/90 font-serif flex items-start gap-1">
                      <Info className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        {ref.hint}
                        {ref.sourceName ? `（${ref.sourceName}）` : ''}
                      </span>
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {observations.length > visible.length || (abnormal.length > 0 && normal.length > 0 && !showAll) ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full py-2 text-[10px] font-bold text-neutral-600 border border-dashed border-neutral-300 flex items-center justify-center gap-1"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              收起 · 仅看 {abnormal.length} 项异常
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              展开全部 {observations.length} 项
              {normal.length > 0 ? `（含 ${normal.length} 项正常）` : ''}
            </>
          )}
        </button>
      ) : null}

      <p className="text-[10px] text-neutral-400 font-serif px-1">
        异常项 {abnormal.length} / 共 {observations.length} 项
      </p>
    </section>
  );
}
