import { useCallback, useState } from 'react';
import { DEFAULT_MEDICATIONS, type MedicationItem } from '@/src/data/defaultMedications';
import { usePersistedState } from '@/src/hooks/usePersistedState';

function storageKey(memberId: string) {
  return `health-link:medications:${memberId}`;
}

export function seedMemberMedications(memberId: string, items: MedicationItem[]) {
  localStorage.setItem(storageKey(memberId), JSON.stringify(items));
}

export function useMedications(memberId: string, options?: { seedDefaults?: boolean }) {
  const fallback = options?.seedDefaults ? DEFAULT_MEDICATIONS : [];
  const [medications, setMedications] = usePersistedState<MedicationItem[]>(storageKey(memberId), fallback);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedPurpose, setNewMedPurpose] = useState('');

  const addMedication = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newMedName.trim()) return false;
      const item: MedicationItem = {
        id: Date.now().toString(),
        name: newMedName.trim(),
        dose: newMedDose.trim() || '随医嘱',
        purpose: newMedPurpose.trim() || '健康干预',
        checked: true,
      };
      setMedications((prev) => [...prev, item]);
      setNewMedName('');
      setNewMedDose('');
      setNewMedPurpose('');
      return true;
    },
    [newMedName, newMedDose, newMedPurpose, setMedications],
  );

  const toggleMedication = useCallback(
    (id: string) => {
      setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)));
    },
    [setMedications],
  );

  const removeMedication = useCallback(
    (id: string) => {
      setMedications((prev) => prev.filter((m) => m.id !== id));
    },
    [setMedications],
  );

  const activeMedications = medications.filter((m) => m.checked);

  return {
    medications,
    setMedications,
    newMedName,
    setNewMedName,
    newMedDose,
    setNewMedDose,
    newMedPurpose,
    setNewMedPurpose,
    addMedication,
    toggleMedication,
    removeMedication,
    activeMedications,
  };
}
