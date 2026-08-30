/**
 * Audio Ducking Service
 * Demper bakgrunnsmusikk og media automatisk når tale eller treningslyder spilles.
 *
 * ⚠️ TJENESTEN ER INERT PER 2026-08-30 — den demper ingenting.
 *
 * Verifisert i revisjon B1, med fire uavhengige mål:
 *  1. Selektoren under leter etter `[data-background-music]`. Attributtet
 *     finnes ingen steder i src/, public/ eller index.html.
 *  2. `audio-duck-changed`-hendelsen har ingen lyttere i kodebasen.
 *  3. Målt på kjørende produksjon: selektoren treffer 0 elementer, og DOM-en
 *     inneholder ingen <audio>/<video> overhodet.
 *  4. Den når heller ikke appens egen lyd: stemmen går via Web Audio
 *     (audioBufferEngine), og `new Audio()`-elementene i audioClipService og
 *     coachPersonaService legges aldri inn i dokumentet — de er detached, og
 *     usynlige for document.querySelectorAll.
 *
 * Refcount, par-balansert duck/unduck og auto-release fungerer som de skal —
 * de opererer bare på en tom liste. De 15 kallstedene ser derfor meningsfulle
 * ut uten å ha effekt.
 *
 * Tjenesten er bevisst LATT STÅ til Del 3 i revisjon B1 er avgjort: skal
 * appen levere lyd/demping i det hele tatt, og er det i så fall mulig fra en
 * PWA? Blir svaret nei, skal denne fjernes sammen med kallstedene. Blir det
 * ja, er dette skallet utgangspunktet — men det må da kobles til noe som
 * faktisk finnes.
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
