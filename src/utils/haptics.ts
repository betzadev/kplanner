import {
  impactFeedback,
  notificationFeedback,
  selectionFeedback,
} from '@tauri-apps/plugin-haptics';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Mobile Haptic Feedback utility
 * Integrates @tauri-apps/plugin-haptics with seamless fallback to Web Vibration API.
 */
export async function triggerHaptic(type: HapticType = 'light'): Promise<void> {
  if (isTauri()) {
    try {
      switch (type) {
        case 'selection':
          await selectionFeedback();
          return;
        case 'light':
          await impactFeedback('light');
          return;
        case 'medium':
          await impactFeedback('medium');
          return;
        case 'heavy':
          await impactFeedback('heavy');
          return;
        case 'success':
          await notificationFeedback('success');
          return;
        case 'warning':
          await notificationFeedback('warning');
          return;
        case 'error':
          await notificationFeedback('error');
          return;
      }
    } catch {
      // Fall through to navigator.vibrate
    }
  }

  // Web Vibration API fallback
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'selection':
        case 'light':
          navigator.vibrate(8);
          break;
        case 'medium':
          navigator.vibrate(16);
          break;
        case 'heavy':
          navigator.vibrate(28);
          break;
        case 'success':
          navigator.vibrate([10, 30, 20]);
          break;
        case 'warning':
        case 'error':
          navigator.vibrate([25, 40, 25]);
          break;
      }
    } catch {
      // Ignore vibration error
    }
  }
}
