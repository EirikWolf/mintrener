import { audioDuckingService } from './audioDuckingService';
import { VoiceTone } from '../schemas/profileSchema';

/**
 * Fonetiske oversettelser og optimaliseringer for norsk Web Speech TTS
 */
export const PRONUNCIATION_MAP: Record<string, string> = {
  // Engelske øvelsesnavn -> naturlig norsk / fonetisk
  'mountain climbers': 'fjellklatrer',
  'mountain climber': 'fjellklatrer',
  'jumping jacks': 'sprellmenn',
  'jumping jack': 'sprellmann',
  'push-ups': 'armhevinger',
  'push-up': 'armhevinger',
  'pushups': 'armhevinger',
  'pushup': 'armhevinger',
  'squats': 'knebøy',
  'squat': 'knebøy',
  'burpees': 'børpis',
  'burpee': 'børpi',
  'high knees': 'høye kneløft',
  'glute bridge': 'bekkenhev',
  'lunges': 'utfall',
  'lunge': 'utfall',
  'side plank': 'sideplanke',
  'hollow body': 'båtstilling',
  'kettlebell swing': 'kettlebell-sving',
  'kettlebell swings': 'kettlebell-sving',
  'pull-ups': 'kroppshevinger',
  'pull-up': 'kroppshevinger',
  'chin-ups': 'kroppshevinger med underhåndsgrep',
  'dips': 'dips',
  'dead bug': 'død flue',
  'russian twists': 'russisk vri',
  'russian twist': 'russisk vri',
  'plank jacks': 'planke med sprell',
  'wall sit': 'veggsitt',
  'crunches': 'mageløft',
  'crunch': 'mageløft',
  'bear crawl': 'bjørnegang',

  // Sammensatte ord som trenger fonetisk trykkhjelp i nettlesere
  'bjørnegang': 'bjørne gang',
  'flamingo-balanse': 'flamingo balanse',
  'kenguru-sprett': 'kenguru sprett',
  'katte-ku': 'katt og ku',
  'katt-ku': 'katt og ku',
  'skulder-dislocates': 'skulderrulling bakover',
  'dislocates': 'skulderrulling',
};

export function normalizeTextForSpeech(raw: string): string {
  if (!raw) return '';
  let text = raw;

  for (const [key, replacement] of Object.entries(PRONUNCIATION_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    text = text.replace(regex, replacement);
  }

  return text;
}

const FEMALE_VOICE_HINTS = [
  'iselin',
  'nora',
  'pernille',
  'hedda',
  'ingrid',
  'liv',
  'astrid',
  'bente',
  'hulda',
  'kari',
  'marit',
  'silje',
  'female',
  'woman',
  'kvinne',
  'kvinnelig',
];

// «google» sto her som kvinnelig hint. Leverandørnavnet sier ingenting om
// kjønn — «Google norsk» kan være hva som helst — og gjorde valget vilkårlig.

const MALE_VOICE_HINTS = [
  'jon',
  'henrik',
  'jonas',
  'stian',
  'male',
  'mann',
  'mannlig',
  'david',
  'george',
];

/**
 * Treffer et hint som eget ord.
 *
 * Ren substring-sjekk gjorde at «female» inneholdt «male»: en stemme som
 * heter «Female» ble klassifisert som mannlig i det nøytrale filteret.
 */
function matcherHint(navn: string, hints: string[]): boolean {
  const ord = navn.toLowerCase().split(/[^a-zà-ÿ]+/i).filter(Boolean);
  return hints.some((hint) => ord.includes(hint) || navn.toLowerCase().includes(` ${hint} `));
}

/**
 * Velger stemme etter én prioritet: NORSK UTTALE FØRST.
 *
 * En norsk instruksjon lest av en engelsk stemme er ubrukelig, uansett hvor
 * godt den ellers passer. Derfor vinner en mannlig norsk stemme over en
 * kvinnelig engelsk — og på en vanlig Windows-maskin er «Microsoft Jon» den
 * eneste norske som finnes.
 *
 * Ren funksjon slik at prioriteringen kan testes uten talesyntese.
 */
export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const norske = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('nb') ||
      v.lang.toLowerCase().startsWith('no') ||
      v.lang.toLowerCase().startsWith('nn')
  );

  if (norske.length > 0) {
    const kvinnelig = norske.find((v) => matcherHint(v.name, FEMALE_VOICE_HINTS));
    if (kvinnelig) return kvinnelig;

    const noytral = norske.find((v) => !matcherHint(v.name, MALE_VOICE_HINTS));
    if (noytral) return noytral;

    // Ingen kvinnelig eller nøytral norsk stemme: ta den norske uansett.
    return norske[0];
  }

  const kvinneligFallback = voices.find((v) => matcherHint(v.name, FEMALE_VOICE_HINTS));
  if (kvinneligFallback) return kvinneligFallback;

  return voices.find((v) => v.default) || voices[0] || null;
}

export interface VoiceInfo {
  name: string;
  lang: string;
  isNorwegian: boolean;
}

/**
 * Hva brukeren faktisk får.
 *
 * Her sto det tidligere «Astrid (Standard kvinnestemme)» når ingen stemme
 * fantes — en påstand om både navn og kjønn på noe vi ikke eier. Stemmene
 * kommer fra operativsystemet og varierer per enhet.
 */
export function describeVoice(v: SpeechSynthesisVoice | null): VoiceInfo {
  if (!v) {
    return { name: 'Ingen stemme tilgjengelig på enheten', lang: '', isNorwegian: false };
  }
  const isNorwegian =
    v.lang.toLowerCase().startsWith('nb') ||
    v.lang.toLowerCase().startsWith('no') ||
    v.lang.toLowerCase().startsWith('nn');
  return { name: v.name, lang: v.lang, isNorwegian };
}

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

    this.voice = pickVoice(this.synth.getVoices());
    return this.voice;
  }

  public getVoiceInfo(): VoiceInfo {
    return describeVoice(this.voice || this.loadVoice());
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
      const normalized = normalizeTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(normalized);

      if (activeVoice) {
        utterance.voice = activeVoice;
        utterance.lang = activeVoice.lang;
      } else {
        utterance.lang = 'nb-NO';
      }

      const voiceNameLower = (activeVoice?.name || '').toLowerCase();
      const isKnownMale = MALE_VOICE_HINTS.some((hint) => voiceNameLower.includes(hint));

      utterance.volume = 1.0;
      utterance.rate = rate;
      // Hvis enheten kun har en mannlig stemme (f.eks. kun Microsoft Jon installert),
      // heves pitch til 1.2 for å modulere mot en kvinnelig karakter (Astrid).
      utterance.pitch = isKnownMale ? 1.2 : 1.05;

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

  public announceWork(exerciseName?: string, tone: VoiceTone = 'rolig') {
    if (tone === 'lek') {
      if (exerciseName) {
        this.speak(`Og kjør på med ${exerciseName}!`);
      } else {
        this.speak('Tre, to, en – og kjør på!');
      }
    } else if (tone === 'gira') {
      if (exerciseName) {
        this.speak(`Let’s go! Fullt trøkk med ${exerciseName}!`);
      } else {
        this.speak('Let’s go! Fullt trøkk!');
      }
    } else if (tone === 'tørr') {
      if (exerciseName) {
        this.speak(`Start. ${exerciseName}.`);
      } else {
        this.speak('Start.');
      }
    } else {
      if (exerciseName) {
        this.speak(`Kjør! ${exerciseName}`);
      } else {
        this.speak('Kjør!');
      }
    }
  }

  public announceRest(nextExerciseName?: string, tone: VoiceTone = 'rolig') {
    if (tone === 'lek') {
      if (nextExerciseName) {
        this.speak(`Pause! Neste øvelse er ${nextExerciseName}.`);
      } else {
        this.speak('Pause! Pust som en løve!');
      }
    } else if (tone === 'gira') {
      if (nextExerciseName) {
        this.speak(`Pause! Hent pusten, neste er ${nextExerciseName}!`);
      } else {
        this.speak('Pause! Hent pusten!');
      }
    } else if (tone === 'tørr') {
      if (nextExerciseName) {
        this.speak(`Pause. Neste er ${nextExerciseName}.`);
      } else {
        this.speak('Pause.');
      }
    } else {
      if (nextExerciseName) {
        this.speak(`Pause. Neste er ${nextExerciseName}`);
      } else {
        this.speak('Pause');
      }
    }
  }

  public announcePrepare(exerciseName?: string, tone: VoiceTone = 'rolig') {
    if (tone === 'lek') {
      if (exerciseName) {
        this.speak(`Gjør deg klar til ${exerciseName}! Nå starter moroa!`);
      } else {
        this.speak('Er du klar? Nå setter vi i gang!');
      }
    } else if (tone === 'gira') {
      if (exerciseName) {
        this.speak(`Gjør deg klar til ${exerciseName}! Fullt fokus!`);
      } else {
        this.speak('Gjør deg klar! Nå gir vi alt!');
      }
    } else if (tone === 'tørr') {
      if (exerciseName) {
        this.speak(`Klargjøring. ${exerciseName}.`);
      } else {
        this.speak('Klargjøring.');
      }
    } else {
      if (exerciseName) {
        this.speak(`Gjør deg klar til ${exerciseName}`);
      } else {
        this.speak('Gjør deg klar');
      }
    }
  }

  public announceCountdown(second: number) {
    if (second >= 1 && second <= 3) {
      this.speak(second.toString());
    }
  }

  public announceComplete(tone: VoiceTone = 'rolig') {
    if (tone === 'lek') {
      this.speak('Hurra! Du klarte det! Kjempebra jobba!');
    } else if (tone === 'gira') {
      this.speak('BOM! Fullført! Rått levert!');
    } else if (tone === 'tørr') {
      this.speak('Ferdig. Økten er fullført.');
    } else {
      this.speak('Bra jobba! Økten er fullført!');
    }
  }
}

export const speechService = new SpeechService();

export function speakMessage(text: string, rate: number = 1.0) {
  speechService.speak(text, rate);
}


