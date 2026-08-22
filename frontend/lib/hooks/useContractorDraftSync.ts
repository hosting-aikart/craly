'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Field Staff draft persistence + low-connectivity sync (spec §7-9).
//
// Deliberately localStorage-only — no IndexedDB, no service worker, no
// offline-request-queue framework. This gives reliable *local* persistence
// (a half-filled form survives a closed tab/browser crash) and sync-on-
// reconnect for the record currently open, which covers the field
// scenario described in the task (a gate/MIDC visit with patchy signal).
//
// Known, deliberate limitation: this is not a conflict-resolving offline
// queue. If the same contractor record is edited offline from two devices
// at once, the later reconnect simply overwrites with last-write-wins —
// there's no merge. Building real multi-device conflict resolution would
// mean a much larger offline framework than a Phase 1 field tool needs;
// the task's own instructions prefer reporting that limitation over adding
// one "without need."
export type DraftSyncStatus = 'idle' | 'saving' | 'saved' | 'saved_offline' | 'syncing' | 'synced' | 'sync_failed';

function storageKeyFor(contractorId: string): string {
  return `craly:field-staff:draft:${contractorId}`;
}

/** Reads a locally-persisted draft for a contractor, if one exists (used to offer "resume"). */
export function readLocalDraft<T>(contractorId: string): T | null {
  try {
    const raw = localStorage.getItem(storageKeyFor(contractorId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Private-browsing / quota / storage disabled — no local draft to offer.
    return null;
  }
}

export function useContractorDraftSync<T>(contractorId: string, onSave: (data: T) => Promise<void>) {
  const [status, setStatus] = useState<DraftSyncStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<T | null>(null);
  const savingRef = useRef(false);

  const writeLocal = useCallback((data: T) => {
    try {
      localStorage.setItem(storageKeyFor(contractorId), JSON.stringify(data));
    } catch {
      // Nothing else to do — the in-memory form state is still intact for
      // as long as the tab stays open; the sync status just won't say
      // "Saved offline" since there's nowhere durable to put it.
    }
  }, [contractorId]);

  const clearLocal = useCallback(() => {
    try {
      localStorage.removeItem(storageKeyFor(contractorId));
    } catch {
      // ignore
    }
  }, [contractorId]);

  const attemptSync = useCallback(async (data: T, isRetry: boolean) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      writeLocal(data);
      setStatus('saved_offline');
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setStatus(isRetry ? 'syncing' : 'saving');
    try {
      await onSave(data);
      clearLocal();
      setStatus(isRetry ? 'synced' : 'saved');
    } catch {
      writeLocal(data);
      setStatus(isRetry ? 'sync_failed' : 'saved_offline');
    } finally {
      savingRef.current = false;
    }
  }, [onSave, writeLocal, clearLocal]);

  /** Debounced autosave — call on every form change. */
  const scheduleSave = useCallback((data: T) => {
    latestRef.current = data;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (latestRef.current) attemptSync(latestRef.current, false);
    }, 800);
  }, [attemptSync]);

  /** Immediate save — call from an explicit "Save Draft" / "Next" tap. */
  const saveNow = useCallback((data: T) => {
    latestRef.current = data;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    return attemptSync(data, false);
  }, [attemptSync]);

  const retry = useCallback(() => {
    if (latestRef.current) attemptSync(latestRef.current, true);
  }, [attemptSync]);

  // Connection returns -> local draft -> sync -> backend -> sync success (§8).
  useEffect(() => {
    const handleOnline = () => {
      if (latestRef.current) attemptSync(latestRef.current, true);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [attemptSync]);

  return { status, scheduleSave, saveNow, retry };
}
