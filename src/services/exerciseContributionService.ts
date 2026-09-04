import { ExerciseContribution, ExerciseContributionSchema } from '../schemas/exerciseSchema';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Henter alle innsendte bildebidrag (fra lokal lagring / cache).
 */
export function getExerciseContributions(exerciseId?: string): ExerciseContribution[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXERCISE_CONTRIBUTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid: ExerciseContribution[] = [];
    for (const item of parsed) {
      const res = ExerciseContributionSchema.safeParse(item);
      if (res.success) {
        if (!exerciseId || res.data.exerciseId === exerciseId) {
          valid.push(res.data);
        }
      }
    }
    return valid.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch {
    return [];
  }
}

/**
 * Lagrer et nytt bildebidrag fra en bruker.
 */
export function submitExerciseImageContribution(params: {
  exerciseId: string;
  phase: 0 | 1;
  imageDataUrl: string;
  notes?: string;
  userId?: string;
  userName?: string;
}): ExerciseContribution {
  const contributions = getExerciseContributions();

  const newContribution: ExerciseContribution = {
    id: `contrib-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    exerciseId: params.exerciseId,
    phase: params.phase,
    imageDataUrl: params.imageDataUrl,
    notes: params.notes,
    submittedByUid: params.userId,
    submittedByName: params.userName || 'Anonym bidragsyter',
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  const updated = [newContribution, ...contributions];
  localStorage.setItem(STORAGE_KEYS.EXERCISE_CONTRIBUTIONS, JSON.stringify(updated));
  window.dispatchEvent(new Event('exercise-contributions-changed'));

  return newContribution;
}

/**
 * Henter admin-godkjente standardbilder per øvelse og fase.
 * Returnerer en ordbok: { "push-ups-0": "data:image/...", "push-ups-1": "..." }
 */
export function getApprovedExerciseImages(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPROVED_EXERCISE_IMAGES);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Henter gjeldende bilde for en øvelse og fase (hvis et bilde er godkjent av admin).
 */
export function getApprovedExerciseImageUrl(exerciseId: string, phase: 0 | 1): string | null {
  const approved = getApprovedExerciseImages();
  const key = `${exerciseId}-${phase}`;
  return approved[key] || null;
}

/**
 * Admin-funksjon: Godkjenner et innsendt bilde og setter det som standard i løsningen.
 */
export function approveExerciseContribution(contributionId: string): boolean {
  const contributions = getExerciseContributions();
  const target = contributions.find((c) => c.id === contributionId);
  if (!target) return false;

  // 1. Oppdater bidragets status til approved
  const updatedContributions = contributions.map((c) =>
    c.id === contributionId ? { ...c, status: 'approved' as const } : c
  );
  localStorage.setItem(STORAGE_KEYS.EXERCISE_CONTRIBUTIONS, JSON.stringify(updatedContributions));

  // 2. Sett bildet som standard for den aktuelle øvelsen og fasen
  const approved = getApprovedExerciseImages();
  const key = `${target.exerciseId}-${target.phase}`;
  approved[key] = target.imageDataUrl;
  localStorage.setItem(STORAGE_KEYS.APPROVED_EXERCISE_IMAGES, JSON.stringify(approved));

  window.dispatchEvent(new Event('exercise-contributions-changed'));
  window.dispatchEvent(new Event('approved-images-changed'));
  return true;
}

/**
 * Admin-funksjon: Setter et bilde direkte som standard for en øvelsesfase (uten å gå via bidrag).
 */
export function setApprovedExerciseImage(exerciseId: string, phase: 0 | 1, imageDataUrl: string): void {
  const approved = getApprovedExerciseImages();
  const key = `${exerciseId}-${phase}`;
  approved[key] = imageDataUrl;
  localStorage.setItem(STORAGE_KEYS.APPROVED_EXERCISE_IMAGES, JSON.stringify(approved));
  window.dispatchEvent(new Event('approved-images-changed'));
}

/**
 * Admin-funksjon: Nullstiller en øvelsesfase til standard placeholder/original.
 */
export function removeApprovedExerciseImage(exerciseId: string, phase: 0 | 1): void {
  const approved = getApprovedExerciseImages();
  const key = `${exerciseId}-${phase}`;
  delete approved[key];
  localStorage.setItem(STORAGE_KEYS.APPROVED_EXERCISE_IMAGES, JSON.stringify(approved));
  window.dispatchEvent(new Event('approved-images-changed'));
}

/**
 * Admin-funksjon: Avviser et innsendt bilde.
 */
export function rejectExerciseContribution(contributionId: string): boolean {
  const contributions = getExerciseContributions();
  const target = contributions.find((c) => c.id === contributionId);
  if (!target) return false;

  const updatedContributions = contributions.map((c) =>
    c.id === contributionId ? { ...c, status: 'rejected' as const } : c
  );
  localStorage.setItem(STORAGE_KEYS.EXERCISE_CONTRIBUTIONS, JSON.stringify(updatedContributions));
  window.dispatchEvent(new Event('exercise-contributions-changed'));
  return true;
}

/**
 * Hjelpefunksjon: Komprimerer et valgt bilde til lettvektig WebP/JPEG dataUrl
 */
export async function compressImageFile(file: File, maxDimension = 1080, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          resolve(webpData);
        } catch {
          const jpegData = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegData);
        }
      };
      img.onerror = () => reject(new Error('Kunne ikke laste bildet'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Kunne ikke lese bildefilen'));
    reader.readAsDataURL(file);
  });
}
