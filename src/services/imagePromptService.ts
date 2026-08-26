import { ExerciseItem } from '../schemas/exerciseSchema';

/**
 * Kanonisk stilmal for Min Trener (Flux.1 Dev + Astrid LoRA)
 * Kombinerer atletisk form, bevegelse og svetteglans med et varmt, motiverende smil og treningsglede!
 */
export const ASTRID_FLUX_BASE_STYLE =
  'ASTRID, a woman, full body shot from head to feet completely visible within frame, wide angle view, no cropping, dynamic athletic fitness photography of an athletic woman actively exercising with physical exertion, light sweat sheen on sun-tanned skin, golden tan, engaged core, tense flexed muscles, warm confident encouraging smile, radiant positive workout energy, joy of training';

export const ASTRID_FLUX_OUTFIT_STYLE =
  'in a bright modern gym, wearing a charcoal modern seamless cropped racerback sports bra and matching high-waist ribbed leggings, black training shoes, natural athletic lighting, sharp focus';

export interface ComfyPromptJob {
  exerciseId: string;
  exerciseName: string;
  phaseIndex: number;
  viewAngle: 'front' | 'side' | 'skrå';
  positivePrompt: string;
  negativePrompt: string;
  outputFilename: string;
}

/**
 * Bygger en fullstendig ComfyUI prompt-jobb for en gitt øvelse og fase
 */
export function buildComfyPromptJob(
  exercise: ExerciseItem,
  phaseIndex: number
): ComfyPromptJob {
  const phaseKey = phaseIndex.toString();
  const specificAction =
    exercise.bildePrompt && exercise.bildePrompt[phaseKey]
      ? exercise.bildePrompt[phaseKey]
      : `${exercise.navn.en || exercise.navn.nb} execution step ${phaseIndex + 1}`;

  const viewAngle = exercise.bildeVinkel || 'side';
  const positivePrompt = `${ASTRID_FLUX_BASE_STYLE}, ${specificAction}, ${ASTRID_FLUX_OUTFIT_STYLE}, ${viewAngle} view`;

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.navn.nb,
    phaseIndex,
    viewAngle,
    positivePrompt,
    negativePrompt: '',
    outputFilename: `${exercise.id}-${phaseIndex}.png`,
  };
}

/**
 * Eksporterer prompt-jobber for alle øvelser i biblioteket
 */
export function exportAllExercisePromptJobs(
  exercises: ExerciseItem[]
): ComfyPromptJob[] {
  const jobs: ComfyPromptJob[] = [];

  for (const exercise of exercises) {
    if (exercise.bildePrompt) {
      const keys = Object.keys(exercise.bildePrompt);
      for (let i = 0; i < keys.length; i++) {
        jobs.push(buildComfyPromptJob(exercise, i));
      }
    } else {
      jobs.push(buildComfyPromptJob(exercise, 0));
      jobs.push(buildComfyPromptJob(exercise, 1));
    }
  }

  return jobs;
}
