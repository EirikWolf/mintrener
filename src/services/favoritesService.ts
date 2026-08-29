import { z } from 'zod';

const FAVORITES_STORAGE_KEY = 'mintrener_favorite_program_ids';

const FavoriteIdsSchema = z.array(z.string());

export const DEFAULT_FAVORITE_IDS = [
  'tabata-classic',
  'kettlebell-express',
  'morning-mobility',
  'prog-kontor-1',
];

export function getFavoriteProgramIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      // Skjemavalidering (revisjon § 2.4): korrupt lagring → trygg default
      const result = FavoriteIdsSchema.safeParse(JSON.parse(raw));
      if (result.success && result.data.length > 0) {
        return result.data;
      }
      if (!result.success) {
        console.warn('Favoritter i localStorage besto ikke skjemavalidering — bruker standard.');
      }
    }
  } catch (err) {
    console.warn('Kunne ikke lese favoritter fra localStorage:', err);
  }
  return DEFAULT_FAVORITE_IDS;
}

export function toggleFavoriteProgramId(id: string): string[] {
  const current = getFavoriteProgramIds();
  let updated: string[];
  if (current.includes(id)) {
    updated = current.filter((x) => x !== id);
  } else {
    updated = [...current, id];
  }
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}
