import { invoke } from '@tauri-apps/api/core';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Invoca el método nativo en Rust (db.sync().await) para sincronizar
 * la base de datos local SQLite con Turso en la nube.
 */
export async function syncDatabaseWithTurso(): Promise<{ success: boolean; frames?: number; error?: string }> {
  if (!isTauri()) {
    return { success: false, error: 'Not running inside Tauri runtime' };
  }

  try {
    const frames = await invoke<number>('sync_turso_database');
    console.log(`[Turso Sync] Sincronización exitosa: ${frames} frames replicados.`);
    return { success: true, frames };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn('[Turso Sync] Sincronización diferida o fallida:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Escuchar automáticamente la reconexión de red en el dispositivo móvil
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Turso Sync] Conexión detectada. Iniciando sincronización automática...');
    syncDatabaseWithTurso();
  });
}
