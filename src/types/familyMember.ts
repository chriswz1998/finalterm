export type FamilyRelation = 'self' | 'spouse' | 'parent' | 'child' | 'other';

export const FAMILY_RELATION_LABELS: Record<FamilyRelation, string> = {
  self: '本人',
  spouse: '配偶',
  parent: '父母',
  child: '子女',
  other: '其他',
};

export interface FamilyMember {
  id: string;
  name: string;
  relation: FamilyRelation;
  gender?: 'male' | 'female' | 'other';
  birthYear?: number;
  createdAt: string;
}

export interface MemberArchiveState {
  hasData: boolean;
  userImports: import('@/src/lib/healthArchive').UserExamImport[];
  lastPdfUpload: import('@/src/lib/pdfParser').PdfParseResult | null;
  userRemarks: string;
  /** 仅该成员激活 Demo 时使用全局示例基线，不影响其他成员 */
  useDemoBaseline?: boolean;
}

export function createEmptyMemberArchive(): MemberArchiveState {
  return {
    hasData: false,
    userImports: [],
    lastPdfUpload: null,
    userRemarks: '',
  };
}

export function createMemberId(): string {
  return `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function memberInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1);
}
