import { speechService } from './speechService';
import { audioDuckingService } from './audioDuckingService';
import { audioBufferEngine } from './audioBufferEngine';
import { VoiceTone } from '../schemas/profileSchema';
import rawManifest from '../data/audioManifest.json';

const AUDIO_MANIFEST: Record<string, string> = rawManifest as Record<string, string>;

export class AudioClipService {
  private activeAudio: HTMLAudioElement | null = null;
  private audioCache = new Map<string, HTMLAudioElement>();

  /**
   * Spiller en lydfil fra manifestet, eller kaller fallback-talesyntese hvis filen ikke finnes
   */
  public async playClipOrFallback(
    clipKey: string,
    fallbackText: string,
    _tone: VoiceTone = 'rolig',
    rate: number = 1.05
  ): Promise<void> {
    // Buffer-motoren først: sample-nøyaktig start uten HTMLAudio-latens.
    // Ved false (ikke dekodet ennå / ukjent nøkkel) beholdes den gamle kjeden
    // HTMLAudio → talesyntese uendret som fallback.
    try {
      if (await audioBufferEngine.playSequence([clipKey])) {
        return;
      }
    } catch (err) {
      console.warn(`AudioBuffer-avspilling feilet for "${clipKey}", bruker fallback:`, err);
    }

    const audioUrl = AUDIO_MANIFEST[clipKey];

    if (audioUrl) {
      try {
        await this.playAudioFile(audioUrl);
        return;
      } catch (err) {
        console.warn(`Kunne ikke spille lydklipp (${audioUrl}), bruker talesyntese fallback:`, err);
      }
    }

    // Fallback til Web Speech hvis lydfil ikke er generert ennå
    speechService.speak(fallbackText, rate);
  }

  /**
   * Forhåndslaster en liste klipp. Primært dekodes de til AudioBuffere i motoren
   * (fjerner første-avspillingskostnaden helt); HTMLAudio-cachen varmes i tillegg
   * slik at fallback-stien også er klar hvis dekoding feiler (f.eks. offline).
   */
  public preloadClips(clipKeys: string[]): void {
    void audioBufferEngine.preload(clipKeys);
    clipKeys.forEach((key) => {
      const url = AUDIO_MANIFEST[key];
      if (!url || this.audioCache.has(url)) return;
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.audioCache.set(url, audio);
      } catch {
        // Preload er kun en optimalisering
      }
    });
  }

  private playAudioFile(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.activeAudio) {
          this.activeAudio.pause();
          this.activeAudio.currentTime = 0;
        }

        let audio = this.audioCache.get(url);
        if (!audio) {
          audio = new Audio(url);
          this.audioCache.set(url, audio);
        }

        audio.onplay = () => {
          audioDuckingService.startDucking();
        };

        audio.onended = () => {
          audioDuckingService.stopDucking();
          resolve();
        };

        audio.onerror = (e) => {
          audioDuckingService.stopDucking();
          reject(e);
        };

        this.activeAudio = audio;
        audio.play().catch(reject);
      } catch (err) {
        audioDuckingService.stopDucking();
        reject(err);
      }
    });
  }

  /**
   * Annonserer klargjøring til en øvelse
   */
  public announcePrepare(exerciseId?: string, exerciseName?: string, tone: VoiceTone = 'rolig'): void {
    const key = exerciseId ? `exercise-${exerciseId}` : `prepare-${tone}`;
    const fallbackText =
      tone === 'lek'
        ? exerciseName
          ? `Gjør deg klar til ${exerciseName}! Nå starter moroa!`
          : 'Er du klar? Nå setter vi i gang!'
        : tone === 'gira'
        ? exerciseName
          ? `Gjør deg klar til ${exerciseName}! Fullt fokus!`
          : 'Gjør deg klar! Nå gir vi alt!'
        : tone === 'tørr'
        ? exerciseName
          ? `Klargjøring. ${exerciseName}.`
          : 'Klargjøring.'
        : exerciseName
        ? `Gjør deg klar til ${exerciseName}`
        : 'Gjør deg klar';

    this.playClipOrFallback(key, fallbackText, tone);
  }

  /**
   * Annonserer start på et arbeidsintervall
   */
  public announceWork(exerciseId?: string, exerciseName?: string, tone: VoiceTone = 'rolig'): void {
    const key = exerciseId ? `exercise-${exerciseId}` : `start-${tone}-1`;
    const fallbackText =
      tone === 'lek'
        ? exerciseName
          ? `Og kjør på med ${exerciseName}!`
          : 'Tre, to, en – og kjør på!'
        : tone === 'gira'
        ? exerciseName
          ? `Let’s go! Fullt trøkk med ${exerciseName}!`
          : 'Let’s go! Fullt trøkk!'
        : tone === 'tørr'
        ? exerciseName
          ? `Start. ${exerciseName}.`
          : 'Start.'
        : exerciseName
        ? `Kjør! ${exerciseName}`
        : 'Kjør!';

    this.playClipOrFallback(key, fallbackText, tone);
  }

  /**
   * Annonserer pause
   */
  public announceRest(nextExerciseName?: string, tone: VoiceTone = 'rolig'): void {
    const fallbackText =
      tone === 'lek'
        ? nextExerciseName
          ? `Pause! Neste øvelse er ${nextExerciseName}.`
          : 'Pause! Pust som en løve!'
        : tone === 'gira'
        ? nextExerciseName
          ? `Pause! Hent pusten, neste er ${nextExerciseName}!`
          : 'Pause! Hent pusten!'
        : tone === 'tørr'
        ? nextExerciseName
          ? `Pause. Neste er ${nextExerciseName}.`
          : 'Pause.'
        : nextExerciseName
        ? `Pause. Neste er ${nextExerciseName}`
        : 'Pause';

    const key = `rest-${tone}`;
    this.playClipOrFallback(key, fallbackText, tone);
  }

  /**
   * Annonserer 3-2-1 nedtelling
   */
  public announceCountdown(second: number, tone: VoiceTone = 'rolig'): void {
    const key = `count-${tone}-${second}`;
    this.playClipOrFallback(key, second.toString(), tone);
  }

  /**
   * Annonserer fullført økt
   */
  public announceComplete(tone: VoiceTone = 'rolig'): void {
    const key = `finish-${tone}-1`;
    const fallbackText =
      tone === 'lek'
        ? 'Hurra! Du klarte det! Kjempebra jobba!'
        : tone === 'gira'
        ? 'BOM! Fullført! Rått levert!'
        : tone === 'tørr'
        ? 'Ferdig. Økten er fullført.'
        : 'Bra jobba! Økten er fullført!';

    this.playClipOrFallback(key, fallbackText, tone);
  }
}

export const audioClipService = new AudioClipService();
