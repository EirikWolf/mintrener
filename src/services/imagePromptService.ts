import { ExerciseItem } from '../schemas/exerciseSchema';

export const SDXL_STYLE_PREFIX =
  'minimalist athletic fitness illustration, clean modern vector art style, dark theme slate background, emerald and cyan accents, athletic figure, precise exercise biomechanics, high contrast, clean line art';

export const SDXL_NEGATIVE_PROMPT =
  'photorealistic, messy, distorted anatomy, extra limbs, extra fingers, blurry, low quality, watermark, text, signature, bright white background, complex distracting environment';

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
 * Bygger en fullstendig ComfyUI prompt-jobb for en gitt øvelse og fase i henhold til Vedlegg A
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
  const positivePrompt = `${SDXL_STYLE_PREFIX}, ${viewAngle} view, ${specificAction}`;

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.navn.nb,
    phaseIndex,
    viewAngle,
    positivePrompt,
    negativePrompt: SDXL_NEGATIVE_PROMPT,
    outputFilename: `${exercise.id}-${phaseIndex}.webp`,
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
      // Standard: 2 faser (start og bunn/topp)
      jobs.push(buildComfyPromptJob(exercise, 0));
      jobs.push(buildComfyPromptJob(exercise, 1));
    }
  }

  return jobs;
}
