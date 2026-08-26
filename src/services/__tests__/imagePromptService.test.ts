import { describe, it, expect } from 'vitest';
import {
  buildComfyPromptJob,
  exportAllExercisePromptJobs,
  SDXL_STYLE_PREFIX,
  SDXL_NEGATIVE_PROMPT,
} from '../imagePromptService';
import { ExerciseItem } from '../../schemas/exerciseSchema';

describe('Image Prompt Service (Vedlegg A)', () => {
  const sampleExercise: ExerciseItem = {
    id: 'kettlebell-swing',
    navn: { nb: 'Kettlebell-swing', en: 'Kettlebell Swing' },
    type: 'reps',
    kategori: 'kettlebell',
    muskler: { primær: ['sete'], sekundær: ['rygg'] },
    utstyr: ['kettlebell'],
    nivå: 'middels',
    instruks: { nb: ['Trinn 1', 'Trinn 2', 'Trinn 3'] },
    vanligeFeil: { nb: ['Feil 1'] },
    sensorProfil: 'swing',
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  };

  it('genererer en komplett prompt-jobb med stilprefix og negativ prompt', () => {
    const job = buildComfyPromptJob(sampleExercise, 0);

    expect(job.exerciseId).toBe('kettlebell-swing');
    expect(job.outputFilename).toBe('kettlebell-swing-0.webp');
    expect(job.positivePrompt).toContain(SDXL_STYLE_PREFIX);
    expect(job.positivePrompt).toContain('side view');
    expect(job.negativePrompt).toBe(SDXL_NEGATIVE_PROMPT);
  });

  it('eksporterer jobber for en hel liste med øvelser', () => {
    const jobs = exportAllExercisePromptJobs([sampleExercise]);
    expect(jobs.length).toBeGreaterThanOrEqual(2);
    expect(jobs[0].outputFilename).toBe('kettlebell-swing-0.webp');
    expect(jobs[1].outputFilename).toBe('kettlebell-swing-1.webp');
  });
});
