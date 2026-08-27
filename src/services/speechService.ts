import { audioDuckingService } from './audioDuckingService';

export class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private enabled: boolean = true;
  private primed: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoice();
      }
    }
  }

  public init() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.synth = window.speechSynthesis;
    this.loadVoice();

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      // Prime TTS mot mobile user-gesture restriksjoner
      if (!this.primed) {
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        this.synth.speak(dummy);
        this.primed = true;
      }
    } catch (err) {
      console.warn('TTS init error:', err);
    }
  }

  public loadVoice(): SpeechSynthesisVoice | null {
    if (!this.synth && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
    if (!this.synth) return null;

    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Prioriter norske stemmer (nb-NO, no-NO, nn-NO)
    const norwegian = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('nb') ||
        v.lang.toLowerCase().startsWith('no') ||
        v.lang.toLowerCase().startsWith('nn')
    );
    if (norwegian) {
      this.voice = norwegian;
      return norwegian;
    }

    // 2. Fallback til standardspråk
    const fallback = voices.find((v) => v.default) || voices[0] || null;
    this.voice = fallback;
    return fallback;
  }

  public getVoiceInfo(): { name: string; lang: string; isNorwegian: boolean } {
    const v = this.voice || this.loadVoice();
    if (!v) {
      return { name: 'Standard nettleserstemme', lang: 'nb-NO', isNorwegian: true };
    }
    const isNorwegian =
      v.lang.toLowerCase().startsWith('nb') ||
      v.lang.toLowerCase().startsWith('no') ||
      v.lang.toLowerCase().startsWith('nn');
    return { name: v.name, lang: v.lang, isNorwegian };
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    } else if (enabled) {
      this.init();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public speak(text: string, rate: number = 1.05) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    this.synth = window.speechSynthesis;

    try {
      this.synth.cancel();
      if (this.synth.paused) {
        this.synth.resume();
      }

      const activeVoice = this.voice || this.loadVoice();
      const utterance = new SpeechSynthesisUtterance(text);

      if (activeVoice) {
        utterance.voice = activeVoice;
        utterance.lang = activeVoice.lang;
      } else {
        utterance.lang = 'nb-NO';
      }

      utterance.volume = 1.0;
      utterance.rate = rate;
      utterance.pitch = 1.0;

      // Chrome Android bugfix & Audio Ducking: demper bakgrunnsmusikk mens stemmen snakker
      utterance.onstart = () => {
        audioDuckingService.startDucking();
        if (this.synth?.paused) {
          this.synth.resume();
        }
      };

      utterance.onend = () => {
        audioDuckingService.stopDucking();
      };

      utterance.onerror = (e) => {
        audioDuckingService.stopDucking();
        console.warn('TTS utterance feil:', e);
        if (this.synth?.paused) {
          this.synth.resume();
        }
      };

      this.synth.speak(utterance);

      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch (err) {
      console.warn('Kunne ikke spille av tale:', err);
    }
  }

  public testVoice() {
    this.init();
    this.speak('Dette er en test av norsk stemmeveiledning. Klar til trening!');
  }

  public announceWork(exerciseName?: string) {
    if (exerciseName) {
      this.speak(`Kjør! ${exerciseName}`);
    } else {
      this.speak('Kjør!');
    }
  }

  public announceRest(nextExerciseName?: string) {
    if (nextExerciseName) {
      this.speak(`Pause. Neste er ${nextExerciseName}`);
    } else {
      this.speak('Pause');
    }
  }

  public announcePrepare(exerciseName?: string) {
    if (exerciseName) {
      this.speak(`Gjør deg klar til ${exerciseName}`);
    } else {
      this.speak('Gjør deg klar');
    }
  }

  public announceCountdown(second: number) {
    if (second >= 1 && second <= 3) {
      this.speak(second.toString());
    }
  }

  public announceComplete() {
    this.speak('Bra jobba! Økten er fullført!');
  }
}

export const speechService = new SpeechService();

export function speakMessage(text: string, rate: number = 1.0) {
  speechService.speak(text, rate);
}


