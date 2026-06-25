import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Users } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAppContext } from '@/src/context/AppContext';
import { FAMILY_RELATION_LABELS, memberInitial, type FamilyRelation } from '@/src/types/familyMember';

interface MemberSwitcherProps {
  compact?: boolean;
}

export function MemberSwitcher({ compact }: MemberSwitcherProps) {
  const navigate = useNavigate();
  const { members, activeMember, switchMember, addMember, memberHasData } = useAppContext();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState<FamilyRelation>('parent');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAdd(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleSwitch = (id: string) => {
    switchMember(id);
    setOpen(false);
    if (!memberHasData(id)) {
      navigate('/onboarding');
    } else {
      navigate('/status');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const member = addMember({ name: newName.trim(), relation: newRelation });
    switchMember(member.id);
    setNewName('');
    setShowAdd(false);
    setOpen(false);
    navigate('/onboarding');
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center bg-[#FAF9F5] border border-neutral-200 hover:border-neutral-400 transition-colors',
          compact ? 'justify-center p-2' : 'gap-2.5 p-3',
        )}
        title={activeMember.name}
      >
        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-serif font-bold text-sm shrink-0">
          {memberInitial(activeMember.name)}
        </div>
        {!compact && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] font-extrabold uppercase truncate">{activeMember.name}</p>
              <p className="text-[9px] opacity-65 font-serif">
                {FAMILY_RELATION_LABELS[activeMember.relation]} · 健康档案
              </p>
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 opacity-40 shrink-0 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white border border-[#1A1A1A] shadow-lg max-h-64 overflow-y-auto">
          <div className="px-2 py-1.5 border-b border-neutral-100 text-[8px] font-bold uppercase tracking-widest opacity-40">
            家庭成员
          </div>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSwitch(m.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-neutral-50',
                m.id === activeMember.id && 'bg-[#FAF9F5]',
              )}
            >
              <span className="w-6 h-6 rounded-full bg-neutral-800 text-white text-[10px] flex items-center justify-center font-serif shrink-0">
                {memberInitial(m.name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold truncate">{m.name}</span>
                <span className="block text-[8px] opacity-50">{FAMILY_RELATION_LABELS[m.relation]}</span>
              </span>
              {!memberHasData(m.id) && (
                <span className="text-[7px] px-1 py-0.5 bg-amber-100 text-amber-800 font-bold shrink-0">待导入</span>
              )}
            </button>
          ))}

          {!showAdd ? (
            <div className="border-t border-neutral-100 p-1.5 space-y-1">
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-bold hover:bg-neutral-50"
              >
                <Plus className="w-3 h-3" />
                添加成员
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/members');
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-bold hover:bg-neutral-50 opacity-70"
              >
                <Users className="w-3 h-3" />
                管理家庭成员
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="border-t border-neutral-100 p-2 space-y-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="姓名"
                className="w-full border border-neutral-200 px-2 py-1 text-[10px]"
                autoFocus
              />
              <select
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value as FamilyRelation)}
                className="w-full border border-neutral-200 px-2 py-1 text-[10px] bg-white"
              >
                {(Object.entries(FAMILY_RELATION_LABELS) as [FamilyRelation, string][])
                  .filter(([k]) => k !== 'self')
                  .map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
              </select>
              <div className="flex gap-1">
                <button type="submit" className="flex-1 bg-[#1A1A1A] text-white text-[9px] py-1 font-bold">
                  添加
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 border border-neutral-200 text-[9px] py-1"
                >
                  取消
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
