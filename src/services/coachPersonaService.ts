export type CoachPersonaId = 'standard' | 'haugesund' | 'romsdal' | 'hardcore' | 'boyband';

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

export function preloadPersonaAudio(personaId?: CoachPersonaId): void {
  if (typeof Audio === 'undefined') return;
  const id = personaId || getActiveCoachPersona();
  const persona = COACH_PERSONAS.find((p) => p.id === id);
  if (!persona || !persona.cuesPath) return;

  const cues: Array<'intro' | 'start_321' | 'halfway' | 'last5' | 'finish'> = [
    'intro',
    'start_321',
    'halfway',
    'last5',
    'finish',
  ];

  cues.forEach((cue) => {
    const url = `${persona.cuesPath}/${cue}.mp3`;
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

export function stopCurrentPersonaAudio(): void {
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
  cue: 'intro' | 'start_321' | 'halfway' | 'last5' | 'finish',
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

  try {
    if (typeof Audio === 'undefined') return false;
    stopCurrentPersonaAudio();
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
