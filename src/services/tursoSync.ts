import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

interface SyncState {
  status: SyncStatus;
  lastSynced: Date | null;
  errorMessage: string | null;
  framesSynced: number;
  syncNow: () => Promise<{ success: boolean; frames?: number; error?: string }>;
  setStatus: (status: SyncStatus, errorMessage?: string | null) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
  lastSynced: null,
  errorMessage: null,
  framesSynced: 0,

  setStatus: (status: SyncStatus, errorMessage: string | null = null) => {
    set({ status, errorMessage });
  },

  syncNow: async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ status: 'offline', errorMessage: 'Device is offline' });
      return { success: false, error: 'Device is offline' };
    }

    if (!isTauri()) {
      set({ status: 'synced' });
      return { success: true, frames: 0 };
    }

    set({ status: 'syncing', errorMessage: null });
    try {
      const frames = await invoke<number>('sync_turso_database');
      set({
        status: 'synced',
        lastSynced: new Date(),
        framesSynced: (get().framesSynced || 0) + (frames || 0),
        errorMessage: null,
      });
      return { success: true, frames };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ status: 'error', errorMessage: msg });
      return { success: false, error: msg };
    }
  },
}));

export async function syncDatabaseWithTurso() {
  return useSyncStore.getState().syncNow();
}

// Escuchar automáticamente la conexión/desconexión de red
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useSyncStore.getState().syncNow();
  });

  window.addEventListener('offline', () => {
    useSyncStore.getState().setStatus('offline', 'Device is offline');
  });
}
