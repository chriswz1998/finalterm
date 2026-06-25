import { useCallback, useEffect, useRef, useState } from 'react';

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function usePersistedState<T>(key: string, initialValue: T) {
  const initialRef = useRef(initialValue);
  const [value, setValue] = useState<T>(() => readStored(key, initialRef.current));

  useEffect(() => {
    setValue(readStored(key, initialRef.current));
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or private mode — keep in-memory only
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(initialRef.current), []);

  return [value, setValue, reset] as const;
}
