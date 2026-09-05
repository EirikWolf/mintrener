import { WorkoutTemplate, IntervalItem } from '../types/workout';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  InjuryProfile,
  InjuryProfileSchema,
  PainPointId,
} from '../schemas/injuryProfileSchema';

export type { PainPointId, InjuryProfile };

export interface PainPointOption {
  id: PainPointId;
  label: string;
  description: string;
  icon: string;
}

/**
 * Henter brukerens lagrede skadeprofil fra localStorage.
 */
export function getInjuryProfile(): InjuryProfile {
  if (typeof window === 'undefined') {
    return { painPoints: [], updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INJURY_PROFILE);
    if (!raw) {
      return { painPoints: [], updatedAt: new Date().toISOString() };
    }
    const parsed = JSON.parse(raw);
    const result = InjuryProfileSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return { painPoints: [], updatedAt: new Date().toISOString() };
  } catch {
    return { painPoints: [], updatedAt: new Date().toISOString() };
  }
}

/**
 * Lagrer eller oppdaterer brukerens skadeprofil i localStorage.
 */
export function saveInjuryProfile(profile: Partial<InjuryProfile>): InjuryProfile {
  const current = getInjuryProfile();
  const updated: InjuryProfile = {
    painPoints: profile.painPoints ?? current.painPoints,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.INJURY_PROFILE, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('injury-profile-changed', { detail: updated }));
  }

  return updated;
}

/**
 * Sjekker om brukeren har aktive skadefiltre/smertepunkter lagret.
 */
export function hasActiveInjuryFilters(): boolean {
  return getInjuryProfile().painPoints.length > 0;
}

/**
 * Harmoniserer de to ordforrådene:
 * Oversetter typede PainPointId ('korsrygg' | 'skulder' | 'kne' | 'handledd' | 'nakke')
 * til AI-generatorens unngå-liste ('knær', 'hopp', 'skuldre', 'håndledd', 'korsrygg')
 * slik at generatoren aldri bommer på en lagret skadeprofil.
 */
export function translatePainPointsToAvoidList(painPoints: PainPointId[]): string[] {
  const avoidSet = new Set<string>();

  for (const point of painPoints) {
    switch (point) {
      case 'kne':
        avoidSet.add('knær');
        avoidSet.add('hopp');
        break;
      case 'skulder':
        avoidSet.add('skuldre');
        break;
      case 'handledd':
        avoidSet.add('håndledd');
        break;
      case 'korsrygg':
        avoidSet.add('korsrygg');
        break;
      case 'nakke':
        avoidSet.add('skuldre'); // Nakkeskånsomhet unngår tung overhead og nakkebelastning
        break;
    }
  }

  return Array.from(avoidSet);
}

export const PAIN_POINTS: PainPointOption[] = [
  {
    id: 'korsrygg',
    label: 'Korsrygg & Rygg',
    description: 'Erstatter tunge ryggbøy, hopp og eksplosiv vridning med stabiliserende bekkenhev og deadbug.',
    icon: '🪵',
  },
  {
    id: 'skulder',
    label: 'Skulder & Nakkefeste',
    description: 'Erstatter overhead-press, dips og tunge push-ups med bryståpnere og skrivebordspushups.',
    icon: '🦾',
  },
  {
    id: 'kne',
    label: 'Kne & Hopp',
    description: 'Erstatter dype knebøy, utfall og hopp med skånsomme seteløft, box squats og stående boksing.',
    icon: '🦵',
  },
  {
    id: 'handledd',
    label: 'Håndledd & Støtte',
    description: 'Erstatter håndflate-planker og gulv-pushups med underarmsplanke eller knyttneve-støtte.',
    icon: '🖐️',
  },
  {
    id: 'nakke',
    label: 'Nakke & Øvre rygg',
    description: 'Erstatter sit-ups og nakkespenninger med rolige skulderrull og kjerneaktivering uten nakkedrag.',
    icon: '🧣',
  },
];

interface ExerciseReplacementRule {
  conflictsWith: PainPointId[];
  alternativeId: string;
  alternativeName: string;
  reason: string;
}

// Kartotek over øvelseserstatninger ved smerte/skade
const REPLACEMENT_RULES: Record<string, ExerciseReplacementRule> = {
  // Kne-belastninger
  'knebøy': {
    conflictsWith: ['kne'],
    alternativeId: 'glute-bridge-bekkenhev',
    alternativeName: 'Seteløft / Glute Bridge',
    reason: 'Skåner kneleddet mens setemuskler og bakside lår styrkes.',
  },
  'hoppende-kneboy': {
    conflictsWith: ['kne', 'korsrygg'],
    alternativeId: 'glute-bridge-bekkenhev',
    alternativeName: 'Rolig Seteløft',
    reason: 'Fjerner støtbelastning fra hopp og landinger.',
  },
  'froskehopp': {
    conflictsWith: ['kne', 'korsrygg'],
    alternativeId: 'glute-bridge-bekkenhev',
    alternativeName: 'Seteløft / Bekkenhev',
    reason: 'Eliminerer dype knevinkler og eksplosive hopp.',
  },
  'utfall-forover': {
    conflictsWith: ['kne'],
    alternativeId: 'sidehev-ben-gluteus',
    alternativeName: 'Stående Sideløft (Gluteus)',
    reason: 'Styrker hoftestabilisatorer uten bøystress på knærne.',
  },
  'jumping-jacks': {
    conflictsWith: ['kne', 'korsrygg'],
    alternativeId: 'raske-bokseslag',
    alternativeName: 'Skyggeboksing (Stående puls)',
    reason: 'Holder pulsen oppe uten støt mot gulvet.',
  },
  'mountain-climbers': {
    conflictsWith: ['kne', 'handledd', 'korsrygg'],
    alternativeId: 'staende-kneloft-rolig',
    alternativeName: 'Rolige stående kneløft',
    reason: 'Fjerner trykk på håndledd og akselerasjon over kneledd.',
  },

  // Skulder-belastninger
  'push-ups': {
    conflictsWith: ['skulder', 'handledd'],
    alternativeId: 'desk-pushups-stol',
    alternativeName: 'Skrå Push-ups mot vegg/pult',
    reason: 'Reduserer belastningen på skuldre og retter ut håndleddsvinkelen.',
  },
  'burpees': {
    conflictsWith: ['skulder', 'handledd', 'kne', 'korsrygg'],
    alternativeId: 'raske-bokseslag',
    alternativeName: 'Skyggeboksing',
    reason: 'Gir god kondisjonseffekt uten gulvkontakt eller skulderstøt.',
  },
  'dips-stol': {
    conflictsWith: ['skulder'],
    alternativeId: 'brystapner-i-dorapning',
    alternativeName: 'Bryståpner & Skulderstrekk',
    reason: 'Unngår ekstrem internrotasjon og strekk i fremre skulderkapsel.',
  },

  // Korsrygg- & Rygg-belastninger
  'rygghev-superman': {
    conflictsWith: ['korsrygg', 'nakke'],
    alternativeId: 'kattekua',
    alternativeName: 'Katt-Ku Ryggmobilitet',
    reason: 'Myker opp ryggraden med skånsom bevegelse uten hyperekstensjon.',
  },
  'crunch-mageboy': {
    conflictsWith: ['korsrygg', 'nakke'],
    alternativeId: 'deadbug-magemobilitet',
    alternativeName: 'Deadbug Kjerneøvelse',
    reason: 'Aktiverer dype magemuskler med flat korsrygg mot underlaget.',
  },
  'planke': {
    conflictsWith: ['handledd', 'korsrygg'],
    alternativeId: 'deadbug-magemobilitet',
    alternativeName: 'Deadbug (Kjernestabilitet)',
    reason: 'Sikrer kjerneaktivering uten svai i korsrygg eller trykk på håndledd.',
  },
  'bjørnegang': {
    conflictsWith: ['handledd', 'skulder', 'kne'],
    alternativeId: 'staende-kneloft-rolig',
    alternativeName: 'Rolige stående kneløft',
    reason: 'Skåner håndledd og knær.',
  },
};

/**
 * Finner et skånsomt alternativ for en gitt øvelse basert på aktive smertepunkter
 */
export function findAlternativeExercise(
  exerciseId: string,
  painPoints: PainPointId[]
): { alternativeId: string; alternativeName: string; reason: string } | null {
  const normId = exerciseId.toLowerCase().trim();
  const rule = REPLACEMENT_RULES[normId];

  if (!rule) return null;

  const hasConflict = rule.conflictsWith.some((p) => painPoints.includes(p));
  if (!hasConflict) return null;

  return {
    alternativeId: rule.alternativeId,
    alternativeName: rule.alternativeName,
    reason: rule.reason,
  };
}

/**
 * Tilpasser en hel treningsøkt automatisk for valgte smertepunkter
 */
export function adaptWorkoutForPain(
  workout: WorkoutTemplate,
  activePainPoints: PainPointId[]
): {
  adaptedWorkout: WorkoutTemplate;
  modifiedCount: number;
  replacements: Array<{ original: string; replacement: string; reason: string }>;
} {
  if (activePainPoints.length === 0) {
    return {
      adaptedWorkout: workout,
      modifiedCount: 0,
      replacements: [],
    };
  }

  const replacements: Array<{ original: string; replacement: string; reason: string }> = [];

  const adaptedItems: IntervalItem[] = workout.items.map((item) => {
    const alt = findAlternativeExercise(item.exercise.id, activePainPoints);

    if (alt) {
      replacements.push({
        original: item.exercise.name,
        replacement: alt.alternativeName,
        reason: alt.reason,
      });

      return {
        ...item,
        exercise: {
          ...item.exercise,
          id: alt.alternativeId,
          name: alt.alternativeName,
        },
      };
    }

    return item;
  });

  const adaptedWorkout: WorkoutTemplate = {
    ...workout,
    name: replacements.length > 0 ? `${workout.name} (Skånsom)` : workout.name,
    items: adaptedItems,
  };

  return {
    adaptedWorkout,
    modifiedCount: replacements.length,
    replacements,
  };
}
