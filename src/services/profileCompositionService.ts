import {
  ContextProfile,
  ContextProfileId,
  UserProfilesState,
  UserProfilesStateSchema,
} from '../schemas/profileSchema';
import { CONTEXT_PROFILES, DEFAULT_USER_PROFILES_STATE } from '../data/profiles';
import { ExerciseItem } from '../schemas/exerciseSchema';

const USER_PROFILES_STORAGE_KEY = 'mintrener_user_profiles_v1';

/**
 * Henter brukers profil-tilstand fra LocalStorage med fallback til standardverdi
 */
export function getUserProfilesState(): UserProfilesState {
  try {
    const raw = localStorage.getItem(USER_PROFILES_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PROFILES_STATE;
    const parsed = JSON.parse(raw);
    const validated = UserProfilesStateSchema.safeParse(parsed);
    if (validated.success) return validated.data;
    return DEFAULT_USER_PROFILES_STATE;
  } catch (e) {
    console.error('Feil ved lesing av userProfilesState:', e);
    return DEFAULT_USER_PROFILES_STATE;
  }
}

/**
 * Lagrer brukers profil-tilstand
 */
export function saveUserProfilesState(state: UserProfilesState): void {
  try {
    localStorage.setItem(USER_PROFILES_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('user-profiles-changed', { detail: state }));
  } catch (e) {
    console.error('Feil ved lagring av userProfilesState:', e);
  }
}

/**
 * Henter de faktiske ContextProfile-objektene for brukerens valgte profiler
 */
export function getActiveContextProfiles(state: UserProfilesState = getUserProfilesState()): ContextProfile[] {
  return state.profiles
    .map((id) => CONTEXT_PROFILES[id])
    .filter((p): p is ContextProfile => !!p);
}

/**
 * 1. Katalog - standardfilter: Union av contextFilter fra valgte profiler
 */
export function getComposedContextFilter(profiles: ContextProfile[]): string[] {
  if (!profiles.length) return ['kontor'];
  const set = new Set<string>();
  for (const p of profiles) {
    for (const tag of p.contextFilter) {
      set.add(tag);
    }
  }
  return Array.from(set);
}

/**
 * 2. Tekstskala: Mest tilgjengelig vinner globalt (maks tekstskala)
 */
export function getComposedTextScale(profiles: ContextProfile[]): number {
  if (!profiles.length) return 1.0;
  return Math.max(...profiles.map((p) => p.textScale || 1.0));
}

/**
 * 3. Redusert bevegelse (reduceMotion): Sant hvis noen profil ber om det
 */
export function getComposedReduceMotion(profiles: ContextProfile[]): boolean {
  return profiles.some((p) => p.reduceMotion === true);
}

/**
 * 4. Skjul-lister (hide): Snitt (et element skjules bare hvis ALLE valgte profiler skjuler det)
 */
export function getComposedHideList(profiles: ContextProfile[]): string[] {
  if (!profiles.length) return [];
  if (profiles.length === 1) return [...profiles[0].hide];

  // Finn felles elementer i hide for alle profiler
  return profiles[0].hide.filter((item) =>
    profiles.every((p) => p.hide.includes(item))
  );
}

/**
 * 5. Funksjoner løftet fram fra "Mer" (promote): Union av profilenes promote-liste
 */
export function getComposedPromotedFeatures(profiles: ContextProfile[]): string[] {
  const set = new Set<string>();
  for (const p of profiles) {
    for (const feat of p.promote) {
      set.add(feat);
    }
  }
  return Array.from(set);
}

/**
 * 6. Hjem - Hurtigrader: Én rad per valgt profil, med primaryProfile øverst
 */
export function getComposedQuickRows(
  profiles: ContextProfile[],
  primaryProfileId: ContextProfileId
): Array<{ profile: ContextProfile; items: string[] }> {
  if (!profiles.length) return [];

  // Sorter slik at primærprofilen kommer først
  const sorted = [...profiles].sort((a, b) => {
    if (a.id === primaryProfileId) return -1;
    if (b.id === primaryProfileId) return 1;
    return 0;
  });

  return sorted.map((profile) => ({
    profile,
    items: profile.quickRow,
  }));
}

/**
 * 7. Øvelsesoppløsning etter profilregler (Vedlegg C.8):
 * Sjekker om øvelsen har et passende alternativ (f.eks. 'seated', 'noFloor', 'quiet')
 * definert i profilens resolve-liste.
 */
export function resolveExerciseForProfile(
  exercise: ExerciseItem,
  profile: ContextProfile,
  library: ExerciseItem[]
): ExerciseItem {
  if (!exercise.alternatives || !profile.resolve?.length) {
    return exercise;
  }

  // Gå igjennom profilens resolve-preferanser i rekkefølge
  for (const resolveKey of profile.resolve) {
    const altId = (exercise.alternatives as Record<string, string | undefined>)[resolveKey];
    if (altId) {
      const altExercise = library.find((e) => e.id === altId);
      if (altExercise) {
        return altExercise;
      }
    }
  }

  return exercise;
}
