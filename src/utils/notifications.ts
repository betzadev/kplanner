import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let activeNotificationTimeout: ReturnType<typeof setTimeout> | null = null;

export async function requestNotificationAccess(): Promise<boolean> {
  if (isTauri()) {
    try {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }
      return granted;
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
  }
  return false;
}

export function cancelScheduledNotification(): void {
  if (activeNotificationTimeout) {
    clearTimeout(activeNotificationTimeout);
    activeNotificationTimeout = null;
  }
}

export function scheduleTimerNotification(
  title: string,
  body: string,
  delayMs: number
): void {
  cancelScheduledNotification();

  if (delayMs <= 0) return;

  activeNotificationTimeout = setTimeout(async () => {
    activeNotificationTimeout = null;

    if (isTauri()) {
      try {
        const granted = await isPermissionGranted();
        if (granted) {
          sendNotification({ title, body });
          return;
        }
      } catch {
        // Fall back to Web Notification
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/vite.svg',
        });
      } catch {
        // Ignore notification display error
      }
    }
  }, delayMs);
}
