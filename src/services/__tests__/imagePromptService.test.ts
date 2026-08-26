import { describe, it, expect } from 'vitest';
import { buildComfyPromptJob, exportAllExercisePromptJobs, ASTRID_FLUX_BASE_STYLE } from '../imagePromptService';
import { ExerciseItem } from '../../schemas/exerciseSchema';

const mockExercise: ExerciseItem = {
  id: 'knebøy-test',
  navn: { nb: 'Knebøy', en: 'Squats' },
  type: 'reps',
  kategori: 'kroppsvekt',
  muskler: { primær: ['lår'], sekundær: ['sete'] },
  utstyr: ['ingen'],
  nivå: 'nybegynner',
  instruks: { nb: ['Stå med føttene i skulderbredde', 'Bøy knærne dypt'] },
  vanligeFeil: { nb: ['Krum rygg'] },
  sensorProfil: 'knebøy',
  bildeVinkel: 'side',
  bildeStatus: 'mangler',
  bildePrompt: {
    '0': 'standing upright with athletic posture, hands clasped',
    '1': 'in a deep squat position, thighs parallel to floor',
  },
};

describe('ImagePromptService (Flux + Astrid LoRA)', () => {
  it('genererer gyldig ComfyUI prompt med kanonisk Astrid-stil', () => {
    const job = buildComfyPromptJob(mockExercise, 0);

    expect(job.exerciseId).toBe('knebøy-test');
    expect(job.phaseIndex).toBe(0);
    expect(job.positivePrompt).toContain(ASTRID_FLUX_BASE_STYLE);
    expect(job.positivePrompt).toContain('standing upright');
    expect(job.positivePrompt).toContain('charcoal modern seamless');
  });

  it('eksporterer alle faser for en liste med øvelser', () => {
    const jobs = exportAllExercisePromptJobs([mockExercise]);
    expect(jobs.length).toBe(2);
    expect(jobs[0].outputFilename).toBe('knebøy-test-0.png');
    expect(jobs[1].outputFilename).toBe('knebøy-test-1.png');
  });
});
