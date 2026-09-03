import { CONTEXT_PROFILES } from '../data/contextProfiles';

/**
 * Lydnivå — ett valg i stedet for to brytere.
 *
 * Appen hadde «Lydvarsler» og «Talecoach» som uavhengige brytere. Det gir fire
 * kombinasjoner, hvorav brukeren i praksis forstod to: alt på, eller alt av.
 *
 * Tilbakemeldingen fra en arbeidsplass var presis: noen vil ha stillhet, andre
 * vil ha diskrete pip som markerer start og slutt på en øvelse, og noen vil ha
 * treneren. Det midterste nivået var teknisk mulig hele tiden — lyd på, tale av
 * — men det het ingenting, og ingen fant det.
 *
 * Nivåene er derfor en NAVNGIVING av eksisterende oppførsel, ikke ny lyd-logikk:
 * `soundEnabled` gater fase-pipene i audioService, `speechEnabled` gater
 * talekjeden i resolveAnnouncementPlan. Motoren er urørt.
 */

export type SoundLevel = 'stille' | 'signal' | 'trener';

interface SoundLevelInfo {
  id: SoundLevel;
  label: string;
  description: string;
}

/** Rekkefølge: fra minst til mest lyd. Brukes direkte av velgeren i innstillinger. */
export const SOUND_LEVELS: SoundLevelInfo[] = [
  {
    id: 'stille',
    label: 'Stille',
    description: 'Ingen lyd. Telefonen vibrerer ved faseskifte hvis vibrasjon er på.',
  },
  {
    id: 'signal',
    label: 'Signal',
    description: 'Diskrete pip ved start og slutt av hver øvelse. Ingen stemme.',
  },
  {
    id: 'trener',
    label: 'Trener',
    description: 'Treneren teller ned, sier hva som kommer og heier deg gjennom.',
  },
];

interface SoundFlags {
  soundEnabled: boolean;
  speechEnabled: boolean;
}

/**
 * Hvilket nivå bryterne står på nå.
 *
 * Merk kombinasjonen lyd av + tale på: den var nåbar med de gamle uavhengige
 * bryterne og ga stemme uten pip. Den leses som `stille`, og talekjeden gates
 * nå også på lyd — «av» skal bety av.
 */
export function soundLevelFromFlags({ soundEnabled, speechEnabled }: SoundFlags): SoundLevel {
  if (!soundEnabled) return 'stille';
  return speechEnabled ? 'trener' : 'signal';
}

/** Bryterne som utgjør et nivå. */
export function flagsForSoundLevel(level: SoundLevel): SoundFlags {
  switch (level) {
    case 'stille':
      return { soundEnabled: false, speechEnabled: false };
    case 'signal':
      return { soundEnabled: true, speechEnabled: false };
    case 'trener':
      return { soundEnabled: true, speechEnabled: true };
  }
}

/**
 * Profilenes forslag, mest dempet vinner.
 *
 * Rangeringen er ikke symmetrisk: den som ønsker stillhet taper lite på et pip,
 * mens den som sitter i et åpent kontorlandskap ikke kan slå av en stemme som
 * allerede har snakket. Ved uenighet velger vi derfor det mest dempede.
 *
 * Dette er et FORSLAG. Har brukeren valgt selv, gjelder brukerens valg — se
 * SOUND_LEVEL_CHOSEN i storageKeys.
 */
export function defaultSoundLevelForProfiles(profileIds: string[]): SoundLevel {
  const rank: Record<SoundLevel, number> = { stille: 0, signal: 1, trener: 2 };

  const foreslåtte = profileIds
    .map((id) => CONTEXT_PROFILES.find((p) => p.id === id)?.defaultSoundLevel)
    .filter((n): n is SoundLevel => n !== undefined);

  if (foreslåtte.length === 0) return 'trener';

  return foreslåtte.reduce((mestDempet, kandidat) =>
    rank[kandidat] < rank[mestDempet] ? kandidat : mestDempet
  );
}
