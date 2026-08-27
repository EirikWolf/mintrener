/**
 * Audio Ducking Service
 * Demper bakgrunnsmusikk og media automatisk når tale eller treningslyder spilles.
 */

class AudioDuckingService {
  private isDucked: boolean = false;
  private releaseTimeout: any = null;

  /**
   * Aktiverer musikk-ducking (demper volum til 20 %)
   */
  public startDucking(autoReleaseAfterMs?: number) {
    if (this.releaseTimeout) {
      clearTimeout(this.releaseTimeout);
      this.releaseTimeout = null;
    }

    if (!this.isDucked) {
      this.isDucked = true;
      this.applyDuckingToMediaElements(0.25);
      window.dispatchEvent(
        new CustomEvent('audio-duck-changed', { detail: { isDucked: true, volume: 0.25 } })
      );
    }

    if (autoReleaseAfterMs) {
      this.releaseTimeout = setTimeout(() => {
        this.stopDucking();
      }, autoReleaseAfterMs);
    }
  }

  /**
   * Gjenoppretter normalt musikkvolum (100 %)
   */
  public stopDucking() {
    if (this.releaseTimeout) {
      clearTimeout(this.releaseTimeout);
      this.releaseTimeout = null;
    }

    if (this.isDucked) {
      this.isDucked = false;
      this.applyDuckingToMediaElements(1.0);
      window.dispatchEvent(
        new CustomEvent('audio-duck-changed', { detail: { isDucked: false, volume: 1.0 } })
      );
    }
  }

  public getIsDucked(): boolean {
    return this.isDucked;
  }

  private applyDuckingToMediaElements(targetVolume: number) {
    if (typeof document === 'undefined') return;

    try {
      const media = document.querySelectorAll<HTMLMediaElement>('audio[data-background-music], video[data-background-music]');
      media.forEach((el) => {
        el.volume = Math.max(0, Math.min(1, targetVolume));
      });
    } catch {
      // Ignorer
    }
  }
}

export const audioDuckingService = new AudioDuckingService();
