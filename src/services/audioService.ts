// Audio Service med Web Audio API
// Syntetiserer rene toner for å unngå nettverksforsinkelser og filavhengigheter.
// Inkluderer opplåsingslogikk for iOS Safari Autoplay-policy.

class AudioService {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  /**
   * Appens ENE AudioContext, lazily opprettet. Offentlig fordi audioBufferEngine
   * deler den – to kontekster ville gitt separate klokker og doblet ressursbruken,
   * og sample-nøyaktig skedulering krever felles `currentTime`.
   */
  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    return this.ctx;
  }

  /**
   * Låser opp AudioContext ved første brukerinteraksjon (f.eks. klikk på «Start» eller skjermen).
   * Nødvendig på iOS Safari og nyere Chrome.
   */
  public async unlockAudio(): Promise<boolean> {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Spill en mikroskopisk, uhørbar tone for å bekrefte opplåsing på iOS
      if (!this.isUnlocked) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.01);
        this.isUnlocked = true;
      }
      return true;
    } catch (err) {
      console.warn('Kunne ikke låse opp AudioContext:', err);
      return false;
    }
  }

  /**
   * Spiller en enkel ren tone med volumkurve (attack/decay) for å unngå "klikkelyder".
   */
  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.5, startTimeOffset = 0) {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime + startTimeOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      // Jevn envelope for å unngå clipping/klikk
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.01), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (err) {
      console.warn('Feil under toneavspilling:', err);
    }
  }

  /**
   * Korte pip ved 3 - 2 - 1 nedtelling
   */
  public playCountdownBeep(enabled = true) {
    if (!enabled) return;
    this.playTone(520, 0.12, 'sine', 0.6);
  }

  /**
   * Kraftig og oppløftende tone ved start på arbeidsintervall (f.eks. grønt lys)
   */
  public playWorkStart(enabled = true) {
    if (!enabled) return;
    this.playTone(660, 0.12, 'sine', 0.8, 0);
    this.playTone(990, 0.35, 'triangle', 0.9, 0.12);
  }

  /**
   * Roligere tone ved start på pause/hvile (oransje lys)
   */
  public playRestStart(enabled = true) {
    if (!enabled) return;
    this.playTone(580, 0.15, 'sine', 0.7, 0);
    this.playTone(390, 0.35, 'sine', 0.6, 0.15);
  }

  /**
   * Fanfare når hele økten er fullført
   */
  public playWorkoutComplete(enabled = true) {
    if (!enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, idx === notes.length - 1 ? 0.6 : 0.18, 'triangle', 0.8, idx * 0.18);
    });
  }

  /**
   * Autentisk metallisk boksing-klokke / gong for runder
   */
  public playBoxingBell(enabled = true) {
    if (!enabled) return;
    this.playTone(850, 0.8, 'triangle', 0.8, 0);
    this.playTone(1280, 0.6, 'sine', 0.5, 0.02);
  }

  /**
   * Sportsfløyte for idrettslag
   */
  public playWhistle(enabled = true) {
    if (!enabled) return;
    this.playTone(2800, 0.25, 'sine', 0.8, 0);
    this.playTone(3200, 0.3, 'triangle', 0.9, 0.05);
  }

  /**
   * Myk syngeskål / meditativ chime for kveldsro og kontor
   */
  public playSoftChime(enabled = true) {
    if (!enabled) return;
    this.playTone(440, 1.2, 'sine', 0.5, 0);
    this.playTone(880, 1.0, 'sine', 0.3, 0.05);
  }
}

export const audioService = new AudioService();
