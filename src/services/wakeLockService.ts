// Wake Lock Service
// Holder skjermen tent under aktive treningsøkter og reaktiverer automatisk ved fanebytte.

class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isActive = false;
  private visibilityHandler: (() => void) | null = null;

  public isSupported(): boolean {
    return 'wakeLock' in navigator;
  }

  public async requestLock(): Promise<boolean> {
    if (!this.isSupported()) return false;
    this.isActive = true;

    try {
      if (!this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }

      // Sett opp gjenoppretting ved fanebytte (iOS/Android slipper låsen ved bakgrunn)
      if (!this.visibilityHandler) {
        this.visibilityHandler = () => {
          if (document.visibilityState === 'visible' && this.isActive) {
            this.requestLock();
          }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
      }

      return true;
    } catch (err) {
      console.warn('Wake Lock feilet eller ble avvist:', err);
      return false;
    }
  }

  public releaseLock(): void {
    this.isActive = false;
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}

export const wakeLockService = new WakeLockService();
