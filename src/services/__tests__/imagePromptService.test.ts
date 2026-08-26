import { describe, it, expect } from 'vitest';
import { buildComfyPromptJob, exportAllExercisePromptJobs, ASTRID_FLUX_BASE_STYLE } from '../imagePromptService';
import { ExerciseItem } from '../../schemas/exerciseSchema';

const mockExercise: ExerciseItem = {
  id: 'kneboy',
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
    '0': 'actively locking in an athletic squat stance, feet planted wide, engaged quads and glutes, hands raised in ready position, focused breath',
    '1': 'captured mid-rep in the lowest point of a deep powerful squat, thighs parallel to ground, intense muscular tension in legs and glutes, torso upright, powerful dynamic exertion',
  },
};

describe('ImagePromptService (Flux + Astrid LoRA)', () => {
  it('genererer gyldig ComfyUI prompt med dynamisk bevegelse og svetteglans', () => {
    const job = buildComfyPromptJob(mockExercise, 0);

    expect(job.exerciseId).toBe('kneboy');
    expect(job.phaseIndex).toBe(0);
    expect(job.positivePrompt).toContain(ASTRID_FLUX_BASE_STYLE);
    expect(job.positivePrompt).toContain('actively locking in');
    expect(job.positivePrompt).toContain('light sweat sheen');
    expect(job.positivePrompt).toContain('tense flexed muscles');
  });

  it('eksporterer alle faser for en liste med øvelser', () => {
    const jobs = exportAllExercisePromptJobs([mockExercise]);
    expect(jobs.length).toBe(2);
    expect(jobs[0].outputFilename).toBe('kneboy-0.png');
    expect(jobs[1].outputFilename).toBe('kneboy-1.png');
  });
});
