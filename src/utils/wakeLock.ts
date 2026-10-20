/**
 * Screen WakeLock manager
 * Keeps the screen awake ("Desk Clock Mode") during study sessions
 * Automatically re-acquires lock when app returns to foreground.
 */
class ScreenWakeLockManager {
  private sentinel: any = null;
  private isRequested = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRequested) {
          this.acquire();
        }
      });
    }
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  public async acquire(): Promise<boolean> {
    this.isRequested = true;
    if (!this.isSupported()) return false;

    try {
      if (!this.sentinel || this.sentinel.released) {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          if (this.isRequested && document.visibilityState === 'visible') {
            this.acquire();
          }
        });
      }
      return true;
    } catch (e) {
      console.warn('Screen WakeLock error:', e);
      return false;
    }
  }

  public async release(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (e) {
        console.warn('Error releasing WakeLock:', e);
      }
      this.sentinel = null;
    }
  }

  public isActive(): boolean {
    return Boolean(this.sentinel && !this.sentinel.released);
  }
}

export const screenWakeLock = new ScreenWakeLockManager();
