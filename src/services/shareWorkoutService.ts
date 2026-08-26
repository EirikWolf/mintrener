import { WorkoutTemplate } from '../types/workout';

/**
 * Genererer en kompakt, delbar URL med øktens data innebygd i lenken
 */
export function generateShareUrl(workout: WorkoutTemplate): string {
  try {
    const minified = {
      id: `shared-${Date.now()}`,
      name: workout.name,
      description: workout.description || '',
      type: workout.type,
      prepareDurationSeconds: workout.prepareDurationSeconds,
      rounds: workout.rounds,
      roundRestDurationSeconds: workout.roundRestDurationSeconds,
      items: workout.items.map((i) => ({
        id: i.id,
        exercise: {
          id: i.exercise.id,
          name: i.exercise.name,
          nameEn: i.exercise.nameEn,
          category: i.exercise.category,
        },
        workDurationSeconds: i.workDurationSeconds,
        restDurationSeconds: i.restDurationSeconds,
      })),
    };

    const json = JSON.stringify(minified);
    // Base64 encoding kompatibel med UTF-8
    const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('w', base64);
    return url.toString();
  } catch (err) {
    console.error('Feil ved generering av delelenke:', err);
    return window.location.href;
  }
}

/**
 * Deler økt via systemets delemeny (mobil) eller kopierer lenke til utklippstavle
 */
export async function shareWorkout(workout: WorkoutTemplate): Promise<{ shared: boolean; copied: boolean }> {
  const url = generateShareUrl(workout);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Bli med på en økt: ${workout.name}`,
        text: `Prøv denne treningsøkten i Min Trener: ${workout.name}! Ingen innlogging nødvendig.`,
        url,
      });
      return { shared: true, copied: false };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, copied: false };
      }
    }
  }

  // Fallback til utklippstavle
  try {
    await navigator.clipboard.writeText(url);
    return { shared: false, copied: true };
  } catch (err) {
    console.warn('Kunne ikke kopiere til utklippstavle:', err);
    return { shared: false, copied: false };
  }
}

/**
 * Leser og dekoder en delt økt fra URL-parametere ved app-oppstart
 */
export function getSharedWorkoutFromUrl(): WorkoutTemplate | null {
  try {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('w');
    if (!encoded) return null;

    // Dekod base64 UTF-8
    const json = decodeURIComponent(
      Array.prototype.map
        .call(atob(encoded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const workout: WorkoutTemplate = JSON.parse(json);
    if (!workout.name || !Array.isArray(workout.items)) {
      return null;
    }

    // Rens URL uten å reloade siden
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('w');
    window.history.replaceState({}, document.title, cleanUrl.toString());

    return workout;
  } catch (err) {
    console.warn('Kunne ikke dekode delt økt fra URL:', err);
    return null;
  }
}
