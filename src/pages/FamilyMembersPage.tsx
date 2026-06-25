import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Loader2, Plus, Trash2, Upload, UserPlus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppContext } from '@/src/context/AppContext';
import {
  FAMILY_RELATION_LABELS,
  memberInitial,
  type FamilyRelation,
} from '@/src/types/familyMember';
import { MedicalDisclaimer } from '@/src/components/MedicalDisclaimer';
import { ErrorBanner } from '@/src/components/ErrorBanner';

export function FamilyMembersPage() {
  const navigate = useNavigate();
  const {
    members,
    activeMember,
    activeMemberId,
    switchMember,
    addMember,
    removeMember,
    memberHasData,
    importPdfFile,
    dataProcessingConsent,
    setDataProcessingConsent,
  } = useAppContext();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState<FamilyRelation>('parent');
  const [newGender, setNewGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const member = addMember({
      name: newName.trim(),
      relation: newRelation,
      gender: newGender || undefined,
    });
    setNewName('');
    setNewRelation('parent');
    setNewGender('');
    setShowForm(false);
    switchMember(member.id);
  };

  const handleUpload = async (memberId: string, file: File) => {
    if (!dataProcessingConsent) {
      setError('请先勾选数据处理同意书后再上传。');
      return;
    }
    setUploadingId(memberId);
    setError(null);
    setSuccess(null);
    try {
      const result = await importPdfFile(file, memberId);
      const memberName = members.find((m) => m.id === memberId)?.name ?? '成员';
      const count = result.observations.length || result.metrics.length;
      setSuccess(`已为 ${memberName} 导入档案${count > 0 ? `（识别 ${count} 项指标）` : ''}`);
      if (memberId === activeMemberId) {
        navigate('/status');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neutral-400 mb-2">家庭健康档案</p>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">家庭成员管理</h1>
        <p className="text-sm text-neutral-500 mt-2 font-serif">
          为每位家人建立独立健康档案，上传 PDF 报告后将自动解析并归入对应成员。
        </p>
      </header>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex justify-between gap-2">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} className="text-emerald-700 hover:opacity-70 shrink-0">
            关闭
          </button>
        </div>
      )}

      <label className="flex items-start gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={dataProcessingConsent}
          onChange={(e) => setDataProcessingConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span className="opacity-70">我同意在本地浏览器解析 PDF 健康报告，数据不上传至第三方（AI 解读除外）。</span>
      </label>

      <div className="space-y-3">
        {members.map((m) => {
          const isActive = m.id === activeMemberId;
          const hasArchive = memberHasData(m.id);
          return (
            <article
              key={m.id}
              className={cn(
                'border p-4 transition-colors',
                isActive ? 'border-[#1A1A1A] bg-[#FAF9F5]' : 'border-neutral-200 bg-white',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-serif font-bold shrink-0">
                  {memberInitial(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold">{m.name}</h2>
                    <span className="text-[9px] px-1.5 py-0.5 bg-neutral-100 font-bold uppercase">
                      {FAMILY_RELATION_LABELS[m.relation]}
                    </span>
                    {isActive && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold">当前</span>
                    )}
                    {!hasArchive && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold">待导入档案</span>
                    )}
                  </div>
                  <p className="text-[10px] opacity-50 mt-1">
                    {hasArchive ? '已有健康档案数据' : '尚未上传报告，请导入 PDF 或加载 Demo'}
                  </p>
                </div>
                {members.length > 1 && m.relation !== 'self' && (
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600"
                    aria-label="删除成员"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => {
                      switchMember(m.id);
                      if (!hasArchive) navigate('/onboarding');
                      else navigate('/status');
                    }}
                    className="text-[9px] font-bold px-3 py-1.5 border border-neutral-300 hover:bg-neutral-50"
                  >
                    切换到此成员
                  </button>
                )}
                <button
                  type="button"
                  disabled={uploadingId === m.id}
                  onClick={() => fileRefs.current[m.id]?.click()}
                  className="text-[9px] font-bold px-3 py-1.5 bg-[#1A1A1A] text-white flex items-center gap-1 disabled:opacity-50"
                >
                  {uploadingId === m.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  上传健康档案
                </button>
                <input
                  ref={(el) => {
                    fileRefs.current[m.id] = el;
                  }}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(m.id, file);
                    e.target.value = '';
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>

      {showForm ? (
        <form onSubmit={handleAdd} className="border border-[#1A1A1A] p-5 space-y-4 bg-white">
          <h3 className="text-xs font-bold uppercase tracking-widest">添加家庭成员</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[10px] font-bold">
              姓名
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full border border-neutral-200 px-2 py-1.5 text-sm font-normal"
                placeholder="如：张爸爸"
                required
              />
            </label>
            <label className="block text-[10px] font-bold">
              关系
              <select
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value as FamilyRelation)}
                className="mt-1 w-full border border-neutral-200 px-2 py-1.5 text-sm font-normal bg-white"
              >
                {(Object.entries(FAMILY_RELATION_LABELS) as [FamilyRelation, string][])
                  .filter(([k]) => k !== 'self')
                  .map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold sm:col-span-2">
              生理性别（可选）
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value as typeof newGender)}
                className="mt-1 w-full border border-neutral-200 px-2 py-1.5 text-sm font-normal bg-white"
              >
                <option value="">未填写</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex items-center gap-1 bg-[#1A1A1A] text-white text-[10px] font-bold px-4 py-2">
              <UserPlus className="w-3.5 h-3.5" />
              添加并导入档案
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[10px] font-bold px-4 py-2 border border-neutral-200"
            >
              取消
            </button>
          </div>
          <p className="text-[9px] opacity-50 flex items-center gap-1">
            <FileUp className="w-3 h-3" />
            添加后可立即为该成员上传 PDF 健康报告
          </p>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-neutral-300 py-4 flex items-center justify-center gap-2 text-[10px] font-bold hover:bg-neutral-50"
        >
          <Plus className="w-4 h-4" />
          添加家庭成员
        </button>
      )}

      <MedicalDisclaimer />
    </div>
  );
}
