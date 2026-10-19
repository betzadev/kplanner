/**
 * Mobile Haptic Feedback utility
 * Uses the Web Vibration API when available on mobile devices.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
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
        navigator.vibrate([25, 40, 25]);
        break;
    }
  } catch {
    // Vibration blocked or unsupported
  }
}
