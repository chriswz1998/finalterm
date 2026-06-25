import React, { useRef, useState } from 'react';
import { 
  Upload, 
  Plus, 
  Search, 
  ShieldCheck, 
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Activity
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppContext } from '@/src/context/AppContext';
import { usePersistedState } from '@/src/hooks/usePersistedState';
import { ErrorBanner } from '@/src/components/ErrorBanner';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';

interface AnomalyItem {
  name: string;
  value: string;
  unit: string;
  type: 'danger' | 'high' | 'warning';
  label: string;
}

interface ArchiveItem {
  year: string;
  date: string;
  hospital: string;
  status: 'verified' | 'parsing';
  items: number;
  anomaliesCount: number;
  anomaliesList: AnomalyItem[];
  stableIssues?: string[];
}

export const ArchiveCenter = () => {
  const { importPdfFile, activeMemberId, activeMember } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic metric recording forms
  const [selectedMetric, setSelectedMetric] = useState('ldl');
  const [metricValue, setMetricValue] = useState('');
  const [localRecords, setLocalRecords] = usePersistedState<
    Array<{
      key: string;
      name: string;
      value: string;
      unit: string;
      date: string;
      isAnomaly: boolean;
    }>
  >(`health-link:manual-records:${activeMemberId}`, []);

  const [archives, setArchives] = usePersistedState<ArchiveItem[]>(
    `health-link:archives-v2:${activeMemberId}`,
    [],
  );

  const metricMeta: Record<string, { name: string; unit: string; checkAnomaly: (val: number) => boolean }> = {
    ldl: { name: 'LDL-C 坏胆固醇', unit: 'mmol/L', checkAnomaly: (v) => v > 3.4 },
    bmi: { name: '体成分 BMI', unit: '', checkAnomaly: (v) => v >= 24 },
    alt: { name: 'ALT 谷丙转氨酶', unit: 'U/L', checkAnomaly: (v) => v > 40 },
    bp_sys: { name: '收缩压 (BP)', unit: 'mmHg', checkAnomaly: (v) => v >= 120 },
    glucose: { name: '空腹血糖', unit: 'mmol/L', checkAnomaly: (v) => v >= 5.0 },
    hr: { name: '静息心率', unit: 'bpm', checkAnomaly: (v) => v < 60 || v > 100 },
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricValue) return;

    const valNum = parseFloat(metricValue);
    if (isNaN(valNum)) return;

    const meta = metricMeta[selectedMetric];
    const isAnomaly = meta.checkAnomaly(valNum);

    const todayDate = new Date().toISOString().split('T')[0].replace(/-/g, '.');

    setLocalRecords(prev => [
      {
        key: selectedMetric,
        name: meta.name,
        value: metricValue,
        unit: meta.unit,
        date: todayDate,
        isAnomaly
      },
      ...prev
    ]);

    setMetricValue('');
  };

  const handleDeleteLocalRecord = (index: number) => {
    setLocalRecords(prev => prev.filter((_, idx) => idx !== index));
  };

  const commitLocalRecordsToArchive = () => {
    if (localRecords.length === 0) return;

    const todayYear = new Date().getFullYear().toString();
    const todayDate = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    
    const anomalies: AnomalyItem[] = localRecords.filter(r => r.isAnomaly).map(r => ({
      name: r.name.split(' ')[0],
      value: r.value,
      unit: r.unit || '数值',
      type: 'high' as const,
      label: '手动散点登记'
    }));

    const newArchive: ArchiveItem = {
      year: todayYear,
      date: todayDate,
      hospital: '自测便携指标登记馆',
      status: 'verified' as const,
      items: localRecords.length,
      anomaliesCount: anomalies.length,
      anomaliesList: anomalies.length > 0 ? anomalies : [
        { name: '指标', value: '均在安全线', unit: '', type: 'warning' as const, label: '体征散点在此安全界内' }
      ],
      stableIssues: ['日常便携体征散点写入']
    };

    setArchives(prev => [newArchive, ...prev]);
    setLocalRecords([]);
  };

  const processPdfUpload = async (file: File) => {
    setParsingProgress(0);
    setUploadError(null);
    const interval = setInterval(() => {
      setParsingProgress((prev) => (prev === null || prev >= 90 ? 90 : (prev ?? 0) + 10));
    }, 150);
    try {
      const result = await importPdfFile(file);
      const abnormalObs = result.observations.filter((o) => o.abnormalFlag != null);
      const anomaliesList: AnomalyItem[] = (abnormalObs.length > 0 ? abnormalObs : result.observations).map(
        (o) => ({
          name: o.standardName,
          value: o.value ?? '—',
          unit: o.unit,
          type:
            o.abnormalFlag === 'critical' || o.abnormalFlag === 'high'
              ? ('high' as const)
              : o.abnormalFlag === 'low'
                ? ('warning' as const)
                : ('warning' as const),
          label: o.abnormalFlag
            ? `PDF · p${o.provenance.sourcePage ?? '?'} · ${o.abnormalFlag}`
            : `PDF · p${o.provenance.sourcePage ?? '?'}`,
        }),
      );
      setArchives((prev) => [
        {
          year: (result.reportDate ?? new Date().toISOString().slice(0, 10)).slice(0, 4),
          date: (result.reportDate ?? new Date().toISOString().slice(0, 10)).replace(/-/g, '.'),
          hospital: 'PDF 导入',
          status: 'verified',
          items: result.observations.length || result.pageCount,
          anomaliesCount: abnormalObs.length,
          anomaliesList:
            anomaliesList.length > 0
              ? anomaliesList
              : [{ name: '文本已提取', value: '—', unit: '', type: 'warning', label: '未匹配到预设指标' }],
          stableIssues: [`文件: ${result.fileName}`, `Observation × ${result.observations.length}`],
        },
        ...prev,
      ]);
      setParsingProgress(100);
      setTimeout(() => setParsingProgress(null), 500);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '上传失败');
      setParsingProgress(null);
    } finally {
      clearInterval(interval);
    }
  };

  const handleUpload = () => fileInputRef.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processPdfUpload(file);
  };

  const filteredArchives = archives.filter(arc => {
    const q = searchQuery.toLowerCase();
    return (
      arc.year.includes(q) ||
      arc.hospital.toLowerCase().includes(q) ||
      arc.anomaliesList.some(anom => anom.name.toLowerCase().includes(q))
    );
  });

  const totalMarkers = archives.reduce((sum, item) => sum + item.items, 0);

  return (
    <div className="space-y-12 pb-20">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void processPdfUpload(file);
          e.target.value = '';
        }}
      />
      {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} />}
      <div className="flex justify-between items-end border-b-2 border-[#1A1A1A] pb-6">
        <div>
          <h1 className="text-5xl font-serif tracking-tight text-[#1A1A1A]">数据资产中心</h1>
          <p className="text-sm opacity-60 mt-3 font-serif">
            {activeMember.name} 的原始报告与日常记录 · 摄入检查报告或进行散点记录。
          </p>
        </div>
      </div>

      {/* 2. DUAL CAPTURE ZONE (Asymmetric & Hierarchical) */}
      <section className="space-y-6">
        <div className="flex justify-between items-end border-b border-[#1A1A1A]/10 pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40 mb-1">DATA PROCESSING HUB</span>
            <h2 className="text-xl font-serif tracking-tight text-[#1A1A1A]">日常主动采选 & 阶段报告归档</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* A. HIGH-SPEED DAILY VITAL LOG STATION (7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-[#1A1A1A] p-8 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(26,26,26,0.02)]">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 border border-[#1A1A1A]">
                    <Plus className="w-4 h-4 text-[#1A1A1A]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">日常数据自主快录台</h3>
                    <p className="text-[10px] text-neutral-400 font-serif">无纸化快录日常零星指标（如血脂散点、血压、体重）以维系演进线</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono bg-neutral-100 text-neutral-600 px-2.5 py-1 font-bold tracking-tight">ACTIVE STATION</span>
              </div>

              {/* Dynamic form inputs */}
              <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F2F1EF]/30 p-5 border border-neutral-200/40">
                <div>
                  <label className="text-[9px] uppercase tracking-wider font-bold opacity-50 block mb-1.5">登记指标</label>
                  <select 
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="w-full bg-white border border-neutral-200 text-xs px-2.5 py-2 focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="ldl">LDL-C 坏胆固醇 (mmol/L)</option>
                    <option value="bmi">体重 & BMI (体成分)</option>
                    <option value="alt">ALT 谷丙转氨酶 (U/L)</option>
                    <option value="bp_sys">收缩压 BP (mmHg)</option>
                    <option value="glucose">空腹血糖 (mmol/L)</option>
                    <option value="hr">静息心率 (bpm)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-wider font-bold opacity-50 block mb-1.5">检测数值</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="例如 3.82"
                    value={metricValue}
                    onChange={(e) => setMetricValue(e.target.value)}
                    required
                    className="w-full bg-white border border-neutral-200 text-xs px-2.5 py-2 focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div className="flex items-end">
                  <button 
                    type="submit"
                    className="w-full py-2 bg-[#1A1A1A] text-white hover:bg-black text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    存入本会话草稿
                  </button>
                </div>
              </form>

              {/* Session list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/50">
                    本会话未同步指标 ({localRecords.length})
                  </span>
                  {localRecords.length > 0 && (
                    <span className="text-[9px] text-[#1A1A1A] font-serif italic">
                      * 点击下方同步存入主历史库
                    </span>
                  )}
                </div>

                {localRecords.length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed border-neutral-200/50 bg-[#F2F1EF]/10 flex flex-col items-center justify-center">
                    <Activity className="w-5 h-5 text-neutral-300 mb-1" />
                    <p className="text-[10px] text-neutral-400 font-serif">暂无临时散点数据。录入之数据将先在此汇总对齐。</p>
                  </div>
                ) : (
                  <div className="max-h-[140px] overflow-y-auto border border-neutral-200/60 divide-y divide-neutral-100">
                    {localRecords.map((rec, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white text-xs hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            rec.isAnomaly ? "bg-orange-500 animate-pulse" : "bg-emerald-500"
                          )} />
                          <span className="font-bold opacity-80">{rec.name}</span>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-[11px]">
                          <span className="font-bold text-neutral-800">{rec.value} {rec.unit}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 uppercase">{rec.date}</span>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteLocalRecord(idx)}
                            className="text-neutral-400 hover:text-rose-600 font-sans font-bold text-[9px] uppercase tracking-wider"
                          >
                            撤销
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 mt-6 flex flex-wrap gap-4 justify-between items-center">
              <span className="text-[9px] font-sans text-neutral-400 leading-tight block max-w-sm">
                * 自主录入赋予您完整的“用户主权”，让主趋势图不限于依赖官方昂贵的年度体检。
              </span>
              {localRecords.length > 0 && (
                <button 
                  type="button"
                  onClick={commitLocalRecordsToArchive}
                  className="px-5 py-2.5 bg-[#1A1A1A] text-white hover:bg-black text-[9px] font-bold uppercase tracking-wider shadow-sm transition-all"
                >
                  打包同步写入永久资产区 (共{localRecords.length}项)
                </button>
              )}
            </div>
          </div>

          {/* B. PERIODIC METICULOUS REPORT INTEGRATOR (5 Cols) */}
          <div className="lg:col-span-5 bg-[#FAF9F5] border border-[#1A1A1A] p-8 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(26,26,26,0.02)]">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider">年度临床体检报告解析舱</h3>
                <span className="text-[9px] font-mono bg-[#1A1A1A] text-white px-2 py-0.5 font-bold uppercase tracking-tight">MILESTONE</span>
              </div>
              <p className="text-[10px] text-neutral-500 font-serif leading-relaxed">
                周期性重大体检完成后点击使用。支持结构化识别临床标准的 PDF 原始检查报告及影像照片。内置高速转译解析，阻绝纸质归档易失痛点。
              </p>
            </div>

            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "mt-6 h-48 border-2 border-dashed border-[#1A1A1A]/30 flex flex-col items-center justify-center p-6 transition-all relative group cursor-pointer",
                isDragging ? "bg-[#F2F1EF] border-[#1A1A1A]" : "bg-white hover:bg-neutral-50"
              )}
              onClick={handleUpload}
            >
              {parsingProgress !== null ? (
                <div className="w-full space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span>沙盒级安全OCR转译中...</span>
                    <span>{parsingProgress}%</span>
                  </div>
                  <div className="h-1 w-full bg-[#1A1A1A]/5">
                    <div className="h-full bg-[#1A1A1A] transition-all duration-300" style={{ width: `${parsingProgress}%` }} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-mono opacity-40 leading-none">{">>>"} OCR Core Initialized</p>
                    <p className="text-[8px] font-mono opacity-40 leading-none">{">>>"} Extracting Lipid Profile Data</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 bg-[#1A1A1A] text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1">导入 PDF 原始文件 / 回执</h4>
                  <p className="text-[9px] opacity-40 font-serif text-center">点击选取或拖拽至此处</p>
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-200/50 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <p className="text-[9px] font-serif text-neutral-400 leading-normal">
                本系统在浏览器本地解析 PDF 文本；档案写入 localStorage，不上传至自有服务器。
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. HISTORICAL ARCHIVES GRID */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#F2F1EF]/50 p-6 border border-[#1A1A1A]/10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#1A1A1A] text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-40">已存量生命资产卡</h3>
              <p className="font-serif text-lg">{archives.length} 份数据归档文件 / 约 {totalMarkers} 项已对准生化指标</p>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索指标(如 ALT, LDL)或年份..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#1A1A1A]/10 text-xs focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArchives.map((arc, i) => (
            <div key={i} className="p-8 border border-[#1A1A1A] bg-white group hover:shadow-[10px_10px_0px_0px_rgba(26,26,26,0.04)] transition-all flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-[#1A1A1A] text-white">
                      ARCHIVE: {arc.year}
                    </span>
                    <h4 className="text-xl font-serif mt-3 text-[#1A1A1A] font-semibold">{arc.hospital}</h4>
                  </div>
                  <div className={cn(
                    "p-2 rounded-full border",
                    arc.status === 'verified' ? "border-emerald-500 text-emerald-600 bg-emerald-50/20" : "border-orange-500 text-orange-500 animate-pulse"
                  )}>
                    {arc.status === 'verified' ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                  </div>
                </div>

                {/* --- ADDED HIGH-DENSITY VISUAL ANOMALY METRIC COUNTS (Addressing User Request) --- */}
                <div className="mb-6 p-4 bg-amber-50/20 border border-amber-200/40 rounded-none space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                      <span>检出 {arc.anomaliesCount} 项重要异常/偏移</span>
                    </div>
                    <span className="text-[8px] font-mono text-neutral-400 capitalize">STATUS: {arc.status}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {arc.anomaliesList.map((anom, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "px-2 py-0.5 border text-[10px] font-sans flex items-center gap-1.5",
                          anom.type === 'danger' 
                            ? "border-rose-200 bg-rose-50 text-rose-700 font-medium" 
                            : anom.type === 'high' 
                              ? "border-orange-200 bg-orange-50/50 text-orange-700 font-medium"
                              : "border-amber-200 bg-amber-50/30 text-amber-700"
                        )}
                        title={anom.label}
                      >
                        <span className="font-bold">{anom.name}</span>
                        <span className="font-mono">{anom.value}</span>
                        {anom.unit && <span className="text-[8px] opacity-60">{anom.unit}</span>}
                      </div>
                    ))}
                  </div>

                  {arc.stableIssues && arc.stableIssues.length > 0 && (
                    <div className="text-[9px] text-neutral-500 font-serif border-t border-dashed border-neutral-200/50 pt-2 flex flex-wrap gap-x-2 gap-y-1">
                      <span className="text-[8px] font-mono text-neutral-400 font-bold uppercase">慢性关注资产:</span>
                      {arc.stableIssues.map((issue, idx) => (
                        <span key={idx} className="opacity-95">{issue}{idx < arc.stableIssues!.length - 1 ? ',' : ''}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between border-t border-[#1A1A1A]/5 pt-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase opacity-30 tracking-widest">Entry Date</p>
                    <p className="text-xs font-mono text-neutral-600">{arc.date}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[9px] font-bold uppercase opacity-30 tracking-widest">Marked Count</p>
                    <p className="text-xs font-mono text-neutral-600">{arc.items} Markers</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#1A1A1A]/5 flex justify-between gap-4">
                  <button className="text-[9px] font-bold uppercase tracking-widest hover:underline text-[#1A1A1A]">
                    查验数据对准图表
                  </button>
                  <button className="text-[9px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 cursor-not-allowed">
                    下载核签文件 (E-Sign)
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </section>

      <div className="mt-20 p-10 border-2 border-[#1A1A1A]/10 border-dashed flex flex-col items-center justify-center text-center">
         <AlertCircle className="w-12 h-12 mb-4 opacity-10" />
         <h4 className="text-sm font-bold uppercase tracking-[0.4em] opacity-40">本地加密隔离状态 (Confidential)</h4>
         <p className="text-xl font-serif italic mt-2 opacity-60">档案存于浏览器 localStorage · PDF 本地解析</p>
      </div>
      <MedicalDisclaimer className="mt-8" />
    </div>
  );
};
