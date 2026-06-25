import { DEFAULT_USER_REMARKS, DEFAULT_MEDICATIONS } from '@/src/data/defaultMedications';
import type { UserExamImport } from '@/src/lib/healthArchive';
import type { PdfParseResult } from '@/src/lib/pdfParser';
import {
  createEmptyMemberArchive,
  createMemberId,
  type FamilyMember,
  type MemberArchiveState,
} from '@/src/types/familyMember';

const MEMBERS_KEY = 'health-link:familyMembers';
const ACTIVE_KEY = 'health-link:activeMemberId';
const ARCHIVES_KEY = 'health-link:memberArchives';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readFamilyMembers(): FamilyMember[] {
  return readJson<FamilyMember[]>(MEMBERS_KEY, []);
}

export function writeFamilyMembers(members: FamilyMember[]) {
  writeJson(MEMBERS_KEY, members);
}

export function readActiveMemberId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function writeActiveMemberId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function readMemberArchives(): Record<string, MemberArchiveState> {
  return readJson<Record<string, MemberArchiveState>>(ARCHIVES_KEY, {});
}

export function writeMemberArchives(archives: Record<string, MemberArchiveState>) {
  writeJson(ARCHIVES_KEY, archives);
}

export function migrateLegacyScopedStorage(selfMemberId: string) {
  const flag = 'health-link:scopedStorageMigrated';
  if (localStorage.getItem(flag)) return;

  const legacyMeds = localStorage.getItem('health-link:medications');
  if (legacyMeds && !localStorage.getItem(`health-link:medications:${selfMemberId}`)) {
    localStorage.setItem(`health-link:medications:${selfMemberId}`, legacyMeds);
  }

  const legacyArchives = localStorage.getItem('health-link:archives-v2');
  if (legacyArchives && !localStorage.getItem(`health-link:archives-v2:${selfMemberId}`)) {
    localStorage.setItem(`health-link:archives-v2:${selfMemberId}`, legacyArchives);
  }

  localStorage.setItem(flag, '1');
}

/** One-time migration from single-user localStorage keys */
export function ensureFamilySetup(): { members: FamilyMember[]; activeId: string; archives: Record<string, MemberArchiveState> } {
  let members = readFamilyMembers();
  let archives = readMemberArchives();
  let activeId = readActiveMemberId();

  if (members.length === 0) {
    const legacyHasData = localStorage.getItem('health-link:hasData') === 'true';
    const legacyImports = readJson<UserExamImport[]>('health-link:userImports', []);
    const legacyPdf = readJson<PdfParseResult | null>('health-link:lastPdf-v2', null);
    const legacyRemarks = readJson<string>('health-link:remarks', DEFAULT_USER_REMARKS);

    const defaultMember: FamilyMember = {
      id: createMemberId(),
      name: legacyHasData || legacyImports.length > 0 ? '陈春芸' : '本人',
      relation: 'self',
      gender: 'female',
      createdAt: new Date().toISOString(),
    };

    members = [defaultMember];
    activeId = defaultMember.id;
    archives = {
      [defaultMember.id]: {
        hasData: legacyHasData || legacyImports.length > 0,
        userImports: legacyImports,
        lastPdfUpload: legacyPdf,
        userRemarks: legacyRemarks,
        useDemoBaseline:
          (legacyHasData || legacyPdf?.source === 'hospital_csv') && legacyImports.length === 0,
      },
    };

    writeFamilyMembers(members);
    writeActiveMemberId(activeId);
    writeMemberArchives(archives);
  }

  if (!activeId || !members.some((m) => m.id === activeId)) {
    activeId = members[0]!.id;
    writeActiveMemberId(activeId);
  }

  for (const m of members) {
    if (!archives[m.id]) {
      archives[m.id] = createEmptyMemberArchive();
    }
  }

  const selfMember = members.find((m) => m.relation === 'self') ?? members[0];
  if (selfMember) {
    migrateLegacyScopedStorage(selfMember.id);
    if (archives[selfMember.id]?.useDemoBaseline && !localStorage.getItem(`health-link:medications:${selfMember.id}`)) {
      localStorage.setItem(`health-link:medications:${selfMember.id}`, JSON.stringify(DEFAULT_MEDICATIONS));
    }
  }

  return { members, activeId, archives };
}

export function getMemberArchive(
  archives: Record<string, MemberArchiveState>,
  memberId: string,
): MemberArchiveState {
  return archives[memberId] ?? createEmptyMemberArchive();
}
