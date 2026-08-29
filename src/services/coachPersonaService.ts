import { audioBufferEngine } from './audioBufferEngine';
import personaAudioManifestJson from '../data/personaAudioManifest.json';

/**
 * Byggtids-generert persona-manifest (scripts/generate-audio-manifest.mjs,
 * B3 β5, spec § 5): { persona: { klippnøkkel: url } } der nøkkelen er filnavn
 * uten .mp3 ('halfway', 'go-2', 'exercise-kneboy', …). Manifestet speiler
 * filene som faktisk fantes ved bygg — mangler ble flagget som byggtidsadvarsel.
 */
const AUDIO_MANIFEST: Readonly<Record<string, Readonly<Record<string, string>>>> =
  personaAudioManifestJson;

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
    name: 'Jossa',
    dialectOrStyle: 'Haugalandet (haugalandsk)',
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
    dialectOrStyle: 'Romsdalen (romsdalsk)',
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

/**
 * B6.1 (revisjon § 3.3 nivå 1): persona-aksentfarge som CSS-variabel.
 * Avledet av personaens eksisterende `color`-felt (Tailwind-fargenavn) slik at
 * lydmanifest og visuell identitet deler én kilde. 400-nyansene er valgt fordi
 * de holder WCAG AA (>= 4.5:1, verifisert i personaAccent.test.ts) mot alle
 * tre fokusmodus-bakgrunnene (zinc-950 og fase-950-fargene med 80 % dekning).
 */
const ACCENT_BY_TAILWIND_COLOR: Record<string, string> = {
  emerald: '#34d399', // emerald-400
  blue: '#60a5fa', // blue-400
  rose: '#fb7185', // rose-400
  purple: '#c084fc', // purple-400
  zinc: '#a1a1aa', // zinc-400
};

/** Nøytral fallback (zinc-400) — speiler --persona-accent-defaulten i index.css. */
const ACCENT_FALLBACK = '#a1a1aa';

/** Aksentfargen (hex) for en persona; aktiv persona når id utelates. */
export function getPersonaAccentColor(id?: CoachPersonaId): string {
  const personaId = id || getActiveCoachPersona();
  const persona = COACH_PERSONAS.find((p) => p.id === personaId);
  return ACCENT_BY_TAILWIND_COLOR[persona?.color ?? ''] ?? ACCENT_FALLBACK;
}

/**
 * Setter --persona-accent på rot-elementet slik at fokusmodus-elementene
 * (rundelinje, fasebadge) plukker den opp via CSS. Kalles ved oppstart
 * (main.tsx) og ved hvert persona-valg (setActiveCoachPersona).
 */
export function applyPersonaAccent(id?: CoachPersonaId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--persona-accent', getPersonaAccentColor(id));
}

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
  // B6.1: aksentfargen følger persona-valget umiddelbart. Utenfor try-blokken
  // av samme grunn som eviksjonen under — riktig uansett localStorage-utfall.
  applyPersonaAccent(id);
  // BØR-2 (β6): et persona-bytte evikterer de ANDRE personaenes dekodede
  // buffere – 17–35 MB PCM per persona, så persona-shopping må ikke akkumulere.
  // Den valgte personaens buffere beholdes (re-valg = varm cache), og delte
  // studioklipp/countdown har manifest-nøkler utenfor persona-URL-settene og
  // røres derfor aldri. Kjøres uavhengig av localStorage-utfallet – å rydde
  // kalde buffere er riktig uansett om lagringen lyktes.
  const staleUrls = COACH_PERSONAS.filter((p) => p.id !== id).flatMap((p) =>
    getPersonaBufferUrls(p.id)
  );
  if (staleUrls.length > 0) {
    audioBufferEngine.evict(staleUrls);
  }
}

const cueAudioCache: Record<string, HTMLAudioElement> = {};

/**
 * ETT manifestoppslag for alle persona-klipp-URL-er i modulen (β5): personaen
 * finnes i manifestet → manifestet er AUTORITATIVT (mangler klippet der, fantes
 * ikke fila ved bygg — byggtidsadvarselen er alt gitt, og null ruter kallerne
 * til fallback-kjeden i stedet for et dødt 404-oppslag). Persona UTENFOR
 * manifestet (f.eks. dev før generatoren har kjørt) → dagens cuesPath-konvensjon.
 * Null for personaer uten cuesPath (standard = ren talesyntese).
 */
function lookupPersonaClipUrl(id: CoachPersonaId, clipName: string): string | null {
  const entries = AUDIO_MANIFEST[id];
  if (entries) {
    return entries[clipName] ?? null;
  }
  const persona = COACH_PERSONAS.find((p) => p.id === id);
  return persona?.cuesPath ? `${persona.cuesPath}/${clipName}.mp3` : null;
}

/**
 * Full URL til en persona-cue. Persona-cuer ligger utenfor audioManifest.json;
 * URL-en brukes derfor direkte som nøkkel i audioBufferEngine sitt cache.
 * Returnerer null for standard (ren talesyntese) og for klipp som manglet ved bygg.
 */
export function getPersonaCueUrl(cue: PersonaCueName, personaId?: CoachPersonaId): string | null {
  return lookupPersonaClipUrl(personaId || getActiveCoachPersona(), cue);
}

/**
 * Nøkkel (= URL) for et vilkårlig persona-klipp — cue-navn ('halfway',
 * 'bro-neste', 'go-2', …) ELLER øvelsesnøkkel ('exercise-<id>'). Samme oppslag
 * som getPersonaCueUrl, men uten PersonaCueName-begrensningen. Dette er
 * manifest-sømmen mot AudioDirector: oppslagskilden er det byggtids-genererte
 * personaAudioManifest.json (β5) — kallere skal aldri bygge persona-stier selv.
 */
export function getPersonaClipKey(
  cueOrExerciseId: string,
  personaId?: CoachPersonaId
): string | null {
  return lookupPersonaClipUrl(personaId || getActiveCoachPersona(), cueOrExerciseId);
}

/**
 * Alle buffer-nøkler (URL-er) et persona-valg varmer: hele manifest-settet,
 * ellers kjerne-cuene etter cuesPath-konvensjonen. Delt av preloadPersonaAudio
 * (varming) og setActiveCoachPersona (eviksjon ved bytte, BØR-2/β6) — settene
 * MÅ speile hverandre, ellers lekker bytte-eviksjonen buffere.
 */
function getPersonaBufferUrls(id: CoachPersonaId): string[] {
  const entries = AUDIO_MANIFEST[id];
  if (entries) return Object.values(entries);
  const persona = COACH_PERSONAS.find((p) => p.id === id);
  return persona?.cuesPath ? PERSONA_CUES.map((cue) => `${persona.cuesPath}/${cue}.mp3`) : [];
}

/**
 * Returnerer buffer-dekodingens promise (Oppgave B): hooken bruker det til å
 * re-planlegge Directorens lookahead når en KALDSTART-preload fullfører etter
 * at første fase alt har startet. Promiset rejecter aldri (audioBufferEngine.
 * preload logger og hopper over feil), så kallere trenger ingen .catch.
 * Returtypen inkluderer void slik at fire-and-forget-kallere (og testdobler
 * som mocker uten returverdi) forblir gyldige — hooken pakker svaret i
 * Promise.resolve før .then.
 */
export function preloadPersonaAudio(personaId?: CoachPersonaId): Promise<void> | void {
  const id = personaId || getActiveCoachPersona();

  // HELE manifest-settet varmes i buffer-motoren (β5): det er dette som
  // aktiverer Directorens persona-klipp-kjeder — has()-sjekkene for go-/bro-/
  // exercise-klippene krever dekodede buffere, ellers degraderer alt til
  // studio/TTS. Utenfor manifestet: kjerne-cuene etter cuesPath-konvensjonen
  // (samme sett som før β5).
  const bufferUrls = getPersonaBufferUrls(id);
  if (bufferUrls.length === 0) return Promise.resolve();

  // Dekodede AudioBuffere gir latensfri, sample-nøyaktig avspilling og kjeding
  const decoded = audioBufferEngine.preload(bufferUrls);

  // HTMLAudio-varming KUN for de reaktive kjerne-cuene: de er eneste klipp med
  // degradert HTMLAudio-fallback (playPersonaCue) — 37 Audio-elementer per
  // persona ville vært unødig ressursbruk uten noen avspillingssti.
  if (typeof Audio !== 'undefined') {
    PERSONA_CUES.forEach((cue) => {
      const url = lookupPersonaClipUrl(id, cue);
      if (url && !cueAudioCache[url]) {
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
  return decoded;
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

  // Manifestoppslag (β5): null = standard-persona ELLER klipp som manglet ved
  // bygg — begge ruter til kallerens TTS-fallback i stedet for et 404-oppslag.
  const cueUrl = getPersonaCueUrl(cue, activeId);
  if (!cueUrl) {
    return false;
  }

  // Buffer-motoren først: dekodet cue starter uten HTMLAudio-latens.
  // Fyr-og-glem – kalleren trenger bare å vite at cuen faktisk startet.
  if (audioBufferEngine.has(cueUrl)) {
    // Audible-only (Planrettelse 3): en reaktiv cue skal ikke drepe skedulert lookahead.
    // playSequence rejecter aldri (kontraktsfestet) — ingen redundant .catch.
    stopAudiblePersonaAudio();
    void audioBufferEngine.playSequence([cueUrl]);
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
 * Prepare-kjedens nøkler etter spec § 4 — ÉN definisjon (BØR-2, andre review).
 * Med manifest-preloaden (β5) er personaens egne øvelsesklipp normalt cachet:
 * da skal personaens stemme lese navnet, ikke det generiske studioklippet.
 * null = kjeden kan ikke spilles som buffer (intro mangler, eller et ledd er
 * ikke dekodet) → kalleren tar sin degraderte sti.
 *
 * TO kallsteder, samme utledning: playIntroThenExercise (avspilling) og
 * audioDirector.derivePrepareChain (hodrommet lookaheaden beskytter og Ø4-
 * degraderingen). Tidligere var dette to uavhengige kopier — driftet de fra
 * hverandre, ville hodrommet vært regnet fra andre klipp enn de som spilles.
 */
export function resolveIntroExerciseKeys(
  exerciseId: string
): { introKey: string; nameKey: string } | null {
  const introUrl = getPersonaCueUrl('intro');
  const personaExerciseKey = getPersonaClipKey('exercise-' + exerciseId);
  const exerciseKey =
    personaExerciseKey && audioBufferEngine.has(personaExerciseKey)
      ? personaExerciseKey
      : 'exercise-' + exerciseId;
  if (!introUrl || !audioBufferEngine.has(introUrl) || !audioBufferEngine.has(exerciseKey)) {
    return null;
  }
  return { introKey: introUrl, nameKey: exerciseKey };
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

  const keys = resolveIntroExerciseKeys(exerciseId);
  if (keys === null) return false;

  // Audible-only (Planrettelse 3): prepare-lookaheaden (start_321/go) er
  // typisk allerede skedulert når intro-kjeden starter — den skal overleve.
  stopAudiblePersonaAudio();
  void audioBufferEngine.playSequence([keys.introKey, keys.nameKey]);
  return true;
}
