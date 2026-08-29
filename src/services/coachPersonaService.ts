import { audioBufferEngine } from './audioBufferEngine';

export type CoachPersonaId = 'standard' | 'haugesund' | 'romsdal' | 'hardcore' | 'boyband';

export type PersonaCueName = 'intro' | 'start_321' | 'halfway' | 'last5' | 'finish';

const PERSONA_CUES: PersonaCueName[] = ['intro', 'start_321', 'halfway', 'last5', 'finish'];

export interface CoachPersona {
  id: CoachPersonaId;
  name: string;
  dialectOrStyle: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  badge: string;
  previewUrl?: string;
  cuesPath?: string;
}

export const COACH_PERSONAS: CoachPersona[] = [
  {
    id: 'haugesund',
    name: 'Jostein',
    dialectOrStyle: 'Haugesund / Haugalandsk',
    tagline: '«Gje gass nå! Trø te!»',
    description: 'Rått tempo, jovial vestlandsenergi og ingen vits å spare på kreftene.',
    icon: '⚓',
    color: 'emerald',
    badge: 'Vestlandsk',
    previewUrl: '/audio/personas/haugesund_preview.mp3',
    cuesPath: '/audio/personas/haugesund',
  },
  {
    id: 'romsdal',
    name: 'Ola',
    dialectOrStyle: 'Romsdalen / Molde',
    tagline: '«No e det bære å gønne på!»',
    description: 'Fjellstø romsdalsk treningsglede som holder trykket og humøret oppe.',
    icon: '🏔️',
    color: 'blue',
    badge: 'Møredialekt',
    previewUrl: '/audio/personas/romsdal_preview.mp3',
    cuesPath: '/audio/personas/romsdal',
  },
  {
    id: 'hardcore',
    name: 'Axel',
    dialectOrStyle: 'Metalcore & Post-Hardcore',
    tagline: '«PUSH THROUGH THE PAIN! NO EXCUSES!»',
    description: 'Ronnie Radke / Falling in Reverse-intensitet med tunge rop og maksimal tenning.',
    icon: '⚡',
    color: 'rose',
    badge: 'Ekstrem',
    previewUrl: '/audio/personas/hardcore_preview.mp3',
    cuesPath: '/audio/personas/hardcore',
  },
  {
    id: 'boyband',
    name: 'Robin',
    dialectOrStyle: '90s Boyband Pop Harmonies',
    tagline: '«Tre, to, en, kjør på nå! Ooh yeah»',
    description: 'Fløyelsmyke pop-harmonier og lidenskapelig oppmuntring.',
    icon: '🎤',
    color: 'purple',
    badge: 'Pop-harmonier',
    previewUrl: '/audio/personas/boyband_preview.mp3',
    cuesPath: '/audio/personas/boyband',
  },
  {
    id: 'standard',
    name: 'Astrid (Standard)',
    dialectOrStyle: 'Standard Norsk (Syntetisk)',
    tagline: '«Klar, ferdig, gå!»',
    description: 'Klassisk rolig og tydelig stemmeveiledning rett i nettleseren.',
    icon: '🧘',
    color: 'zinc',
    badge: 'Klassisk',
  },
];

const STORAGE_KEY = 'mintrener_coach_persona';
let activeAudioElement: HTMLAudioElement | null = null;

export function getActiveCoachPersona(): CoachPersonaId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && COACH_PERSONAS.some(p => p.id === saved)) {
      return saved as CoachPersonaId;
    }
  } catch (err) {
    console.warn('Kunne ikke lese lagret trenerstemme:', err);
  }
  return 'standard';
}

export function setActiveCoachPersona(id: CoachPersonaId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent('coach-persona-changed', { detail: { personaId: id } }));
  } catch (err) {
    console.warn('Kunne ikke lagre trenerstemme:', err);
  }
}

const cueAudioCache: Record<string, HTMLAudioElement> = {};

/**
 * Full URL til en persona-cue. Persona-cuer ligger utenfor audioManifest.json;
 * URL-en brukes derfor direkte som nøkkel i audioBufferEngine sitt cache.
 * Returnerer null for personaer uten cuesPath (standard = ren talesyntese).
 */
export function getPersonaCueUrl(cue: PersonaCueName, personaId?: CoachPersonaId): string | null {
  const id = personaId || getActiveCoachPersona();
  const persona = COACH_PERSONAS.find((p) => p.id === id);
  return persona?.cuesPath ? `${persona.cuesPath}/${cue}.mp3` : null;
}

/**
 * Nøkkel (= URL) for et vilkårlig persona-klipp — cue-navn ('halfway',
 * 'bro-neste', 'go-2', …) ELLER øvelsesnøkkel ('exercise-<id>'). Følger dagens
 * cuesPath-konvensjon: /audio/personas/<persona>/<navn>.mp3 — samme oppslag
 * som getPersonaCueUrl, men uten PersonaCueName-begrensningen (go- og bro-
 * cuene er nye i β). Dette er manifest-SØMMEN: β5 bytter oppslagskilden til det
 * genererte personaAudioManifest.json uten at kallerne (AudioDirector) endres —
 * kallere skal aldri bygge persona-stier selv. Null for personaer uten
 * cuesPath (standard = ren talesyntese).
 *
 * NB til β5: sømmen er hele MODULEN, ikke bare denne funksjonen —
 * getPersonaCueUrl, playPersonaCue og preloadPersonaAudio bygger også
 * cuesPath-URLer internt og må bytte til manifestoppslaget samtidig.
 */
export function getPersonaClipKey(
  cueOrExerciseId: string,
  personaId?: CoachPersonaId
): string | null {
  const id = personaId || getActiveCoachPersona();
  const persona = COACH_PERSONAS.find((p) => p.id === id);
  return persona?.cuesPath ? `${persona.cuesPath}/${cueOrExerciseId}.mp3` : null;
}

export function preloadPersonaAudio(personaId?: CoachPersonaId): void {
  if (typeof Audio === 'undefined') return;
  const id = personaId || getActiveCoachPersona();
  const persona = COACH_PERSONAS.find((p) => p.id === id);
  if (!persona || !persona.cuesPath) return;

  const cueUrls = PERSONA_CUES.map((cue) => `${persona.cuesPath}/${cue}.mp3`);

  // Varm buffer-motoren (primærstien) – dekodede AudioBuffere gir latensfri,
  // sample-nøyaktig avspilling og mulighet for kjeding (intro + øvelsesnavn)
  void audioBufferEngine.preload(cueUrls);

  cueUrls.forEach((url) => {
    if (!cueAudioCache[url]) {
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        cueAudioCache[url] = audio;
      } catch {
        // Ignorer i miljøer uten lydstøtte
      }
    }
  });
}

/** Pauser og nullstiller et aktivt HTMLAudio-spor (delt av begge stopp-variantene). */
function stopActiveAudioElement(): void {
  try {
    if (activeAudioElement) {
      if (typeof activeAudioElement.pause === 'function') {
        activeAudioElement.pause();
      }
      activeAudioElement.currentTime = 0;
      activeAudioElement = null;
    }
  } catch {
    activeAudioElement = null;
  }
}

/**
 * FULL stopp: hørbar tale fades ut OG skedulerte lookahead-kjeder kanselleres.
 * Forbeholdt pause/reset-stiene (Directorens workout:paused/workout:reset) og
 * forhåndsvisningen i innstillingene — der skal ALT planlagt bort.
 */
export function stopCurrentPersonaAudio(): void {
  // Buffer-kjeder fades ut i motoren (ingen harde kutt midt i et ord)
  audioBufferEngine.stop();
  stopActiveAudioElement();
}

/**
 * Planrettelse 3: stopper kun HØRBAR persona-lyd (HTMLAudio-elementet +
 * hørbare bufferkjeder). Directorens skedulerte lookahead-ankre
 * (start_321/go/last5) overlever — en reaktiv cue (halfway, intro-kjeden,
 * degradert intro) skal aldri kansellere planlagt grenselyd. Brukes av de
 * reaktive cue-stiene under; full stopCurrentPersonaAudio() er forbeholdt
 * pause/reset.
 */
export function stopAudiblePersonaAudio(): void {
  audioBufferEngine.stopAudible();
  stopActiveAudioElement();
}

export async function playPersonaPreview(id: CoachPersonaId): Promise<HTMLAudioElement | null> {
  stopCurrentPersonaAudio();

  const persona = COACH_PERSONAS.find(p => p.id === id);
  if (!persona || !persona.previewUrl) {
    return null;
  }

  try {
    if (typeof Audio === 'undefined') return null;
    let audio = cueAudioCache[persona.previewUrl];
    if (!audio) {
      audio = new Audio(persona.previewUrl);
      audio.preload = 'auto';
      cueAudioCache[persona.previewUrl] = audio;
    }
    audio.currentTime = 0;
    activeAudioElement = audio;
    audio.volume = 1.0;
    if (typeof audio.play === 'function') {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    }
    return audio;
  } catch (err) {
    console.warn('Feil ved avspilling av stemmeforhåndsvisning:', err);
    return null;
  }
}

export async function playPersonaCue(
  cue: PersonaCueName,
  personaIdOverride?: CoachPersonaId
): Promise<boolean> {
  const activeId = personaIdOverride || getActiveCoachPersona();
  if (activeId === 'standard') {
    return false; // Fallback til Web Speech TTS
  }

  const persona = COACH_PERSONAS.find(p => p.id === activeId);
  if (!persona || !persona.cuesPath) {
    return false;
  }

  const cueUrl = `${persona.cuesPath}/${cue}.mp3`;

  // Buffer-motoren først: dekodet cue starter uten HTMLAudio-latens.
  // Fyr-og-glem – kalleren trenger bare å vite at cuen faktisk startet.
  if (audioBufferEngine.has(cueUrl)) {
    // Audible-only (Planrettelse 3): en reaktiv cue skal ikke drepe skedulert lookahead
    stopAudiblePersonaAudio();
    void audioBufferEngine.playSequence([cueUrl]).catch(() => {});
    return true;
  }

  try {
    if (typeof Audio === 'undefined') return false;
    stopAudiblePersonaAudio();
    let audio = cueAudioCache[cueUrl];
    if (!audio) {
      audio = new Audio(cueUrl);
      audio.preload = 'auto';
      cueAudioCache[cueUrl] = audio;
    }
    audio.currentTime = 0;
    activeAudioElement = audio;
    audio.volume = 1.0;
    if (typeof audio.play === 'function') {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Spiller personaens intro og øvelsesannonseringen som ÉN sample-nøyaktig
 * bufferkjede – erstatter den gamle sekvenseringen som GJETTET introens
 * varighet med setTimeout(2300). Returnerer false (uten å spille noe) når
 * personaen er standard eller bufferne ikke er dekodet ennå, slik at kalleren
 * kan bruke sin degraderte fallback-sti.
 */
export async function playIntroThenExercise(exerciseId: string): Promise<boolean> {
  if (getActiveCoachPersona() === 'standard') return false;

  const introUrl = getPersonaCueUrl('intro');
  const exerciseKey = 'exercise-' + exerciseId;
  if (!introUrl || !audioBufferEngine.has(introUrl) || !audioBufferEngine.has(exerciseKey)) {
    return false;
  }

  // Audible-only (Planrettelse 3): prepare-lookaheaden (start_321/go) er
  // typisk allerede skedulert når intro-kjeden starter — den skal overleve.
  stopAudiblePersonaAudio();
  void audioBufferEngine.playSequence([introUrl, exerciseKey]).catch(() => {});
  return true;
}
