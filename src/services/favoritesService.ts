const FAVORITES_STORAGE_KEY = 'mintrener_favorite_program_ids';

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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
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
