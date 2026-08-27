/**
 * Voice Command Service (Web Speech Recognition)
 * Lar brukeren styre timeren håndfritt (Pause, Fortsett, Neste, Hopp over).
 */

export type TimerVoiceCommand =
  | 'pause'
  | 'resume'
  | 'next'
  | 'previous'
  | 'restart'
  | 'add_time';

export type VoiceCommandHandler = (command: TimerVoiceCommand) => void;

class VoiceCommandService {
  private recognition: any = null;
  private isListening = false;
  private handlers: Set<VoiceCommandHandler> = new Set();
  private language: string = 'nb-NO';

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = this.language;

      this.recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript.trim().toLowerCase();
        this.processTranscript(transcript);
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('VoiceCommand error:', event.error);
        }
      };

      this.recognition.onend = () => {
        // Start på nytt hvis aktiv (for kontinuerlig lytteopplevelse)
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch {
            // Ignorer gjentatte startkall
          }
        }
      };
    } catch (e) {
      console.warn('Kunne ikke initialisere SpeechRecognition:', e);
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      )
    );
  }

  public setLanguage(lang: 'nb' | 'nn' | 'en') {
    this.language = lang === 'en' ? 'en-US' : 'nb-NO';
    if (this.recognition) {
      this.recognition.lang = this.language;
    }
  }

  public startListening(): boolean {
    if (!this.isSupported() || !this.recognition) {
      return false;
    }

    try {
      this.isListening = true;
      this.recognition.start();
      window.dispatchEvent(new CustomEvent('voice-command-listening', { detail: { isListening: true } }));
      return true;
    } catch (err) {
      console.warn('Feil ved start av talegjenkjenning:', err);
      return false;
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignorer
      }
    }
    window.dispatchEvent(new CustomEvent('voice-command-listening', { detail: { isListening: false } }));
  }

  public toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public onCommand(handler: VoiceCommandHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public parseCommand(transcript: string): TimerVoiceCommand | null {
    const text = transcript.toLowerCase();

    // Pause / Stopp
    if (
      text.includes('pause') ||
      text.includes('stopp') ||
      text.includes('vent') ||
      text.includes('stop') ||
      text.includes('hold')
    ) {
      return 'pause';
    }

    // Fortsett / Start
    if (
      text.includes('fortsett') ||
      text.includes('start') ||
      text.includes('kjør på') ||
      text.includes('videre') ||
      text.includes('resume') ||
      text.includes('go') ||
      text.includes('play')
    ) {
      return 'resume';
    }

    // Neste / Hopp over
    if (
      text.includes('neste') ||
      text.includes('hopp over') ||
      text.includes('skip') ||
      text.includes('next')
    ) {
      return 'next';
    }

    // Forrige / Tilbake
    if (
      text.includes('forrige') ||
      text.includes('tilbake') ||
      text.includes('previous') ||
      text.includes('back')
    ) {
      return 'previous';
    }

    // Omstart
    if (
      text.includes('omstart') ||
      text.includes('start på nytt') ||
      text.includes('restart') ||
      text.includes('fra start')
    ) {
      return 'restart';
    }

    // Mer tid
    if (
      text.includes('mer tid') ||
      text.includes('ett minutt') ||
      text.includes('mer pause') ||
      text.includes('more time')
    ) {
      return 'add_time';
    }

    return null;
  }

  private processTranscript(transcript: string) {
    const cmd = this.parseCommand(transcript);
    if (cmd) {
      this.handlers.forEach((fn) => fn(cmd));
      window.dispatchEvent(new CustomEvent('voice-command-recognized', { detail: { command: cmd, transcript } }));
    }
  }
}

export const voiceCommandService = new VoiceCommandService();
