export class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoice();
      }
    }
  }

  private loadVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioriter norske stemmer
    const norwegian = voices.find(
      (v) => v.lang.startsWith('nb') || v.lang.startsWith('no') || v.lang.startsWith('nn')
    );
    this.voice = norwegian || voices.find((v) => v.lang.startsWith('en')) || null;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public speak(text: string) {
    if (!this.enabled || !this.synth || !text) return;

    // Avbryt pågående tale for lav latens
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
      utterance.lang = this.voice.lang;
    } else {
      utterance.lang = 'nb-NO';
    }
    utterance.rate = 1.1; // Litt raskere, energisk tempo
    utterance.pitch = 1.0;

    this.synth.speak(utterance);
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
