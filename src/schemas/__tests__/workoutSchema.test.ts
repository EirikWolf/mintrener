import { describe, it, expect } from 'vitest';
import {
  WorkoutExerciseSchema,
  WorkoutTemplateSchema,
  InterruptedSessionSchema,
  CompletedWorkoutLogSchema,
} from '../workoutSchema';
import { WorkoutTemplate } from '../../types/workout';

const validWorkout: WorkoutTemplate = {
  id: 'delt-okt-1',
  name: 'Morgen Tabata',
  description: 'Rask morgenøkt',
  type: 'tabata',
  prepareDurationSeconds: 10,
  rounds: 2,
  roundRestDurationSeconds: 15,
  items: [
    {
      id: 'i1',
      exercise: { id: 'kneboy', name: 'Knebøy', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
  ],
};

describe('WorkoutTemplateSchema', () => {
  it('aksepterer en gyldig økt-mal', () => {
    const result = WorkoutTemplateSchema.safeParse(validWorkout);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Morgen Tabata');
      expect(result.data.items[0].exercise.name).toBe('Knebøy');
    }
  });

  it('aksepterer minimal øvelse uten kategori (samme form som B4-røykens payload)', () => {
    const smokeLike = {
      id: 'e2e-smoke-workout',
      name: 'B4 Røyktest',
      description: 'Playwright-røykflyt',
      type: 'custom',
      prepareDurationSeconds: 2,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        {
          id: 'e2e-i1',
          exercise: { id: 'e2e-e1', name: 'Røyk-knebøy' },
          workDurationSeconds: 3,
          restDurationSeconds: 1,
        },
      ],
    };
    expect(WorkoutTemplateSchema.safeParse(smokeLike).success).toBe(true);
  });

  it('aksepterer valgfrie felt (nameEn, voiceTone)', () => {
    const withOptionals = {
      ...validWorkout,
      voiceTone: 'gira',
      items: [
        {
          ...validWorkout.items[0],
          exercise: { ...validWorkout.items[0].exercise, nameEn: 'Squat' },
        },
      ],
    };
    expect(WorkoutTemplateSchema.safeParse(withOptionals).success).toBe(true);
  });

  it('aksepterer builder-økter med bibliotekets NORSKE kategorier i alle skjemaer (BLOCKER-regresjon: datatap)', () => {
    // WorkoutBuilderView/MicroWorkoutModal skriver ExerciseItem.kategori
    // (kroppsvekt/kettlebell/frivekt/mobilitet/kondisjon/annet) rett inn i
    // Exercise.category. Skjemaet MÅ tolerere disse — ellers forkastes ekte
    // maler ved lasting og tilbakeskrivingene sletter dem permanent.
    const norskeKategorier = ['kroppsvekt', 'frivekt', 'mobilitet', 'kondisjon', 'annet'];
    for (const kategori of norskeKategorier) {
      const exercise = { id: 'ex-1', name: 'Øvelse', category: kategori };
      expect(WorkoutExerciseSchema.safeParse(exercise).success).toBe(true);
    }

    const builderWorkout = {
      id: 'custom-1756400000000',
      name: 'Min bygde økt',
      description: '',
      type: 'custom',
      prepareDurationSeconds: 10,
      rounds: 3,
      roundRestDurationSeconds: 0,
      items: [
        {
          id: 'item-1',
          exercise: { id: 'kb-sving', name: 'Kettlebell-svinger', nameEn: 'KB Swings', category: 'frivekt' },
          workDurationSeconds: 30,
          restDurationSeconds: 15,
        },
        {
          id: 'item-2',
          exercise: { id: 'kneboy', name: 'Knebøy', category: 'kroppsvekt' },
          workDurationSeconds: 30,
          restDurationSeconds: 15,
        },
      ],
    };
    const templateResult = WorkoutTemplateSchema.safeParse(builderWorkout);
    expect(templateResult.success).toBe(true);
    if (templateResult.success) {
      // Kategorien skal bevares som metadata, ikke strippes
      expect(templateResult.data.items[0].exercise.category).toBe('frivekt');
    }

    expect(
      InterruptedSessionSchema.safeParse({
        workout: builderWorkout,
        phase: 'work',
        currentRound: 2,
        currentItemIndex: 1,
        totalElapsedSeconds: 95,
        savedAt: Date.now(),
      }).success
    ).toBe(true);
  });

  it('avviser fortsatt kategori som ikke er en streng', () => {
    const badExercise = { id: 'ex-1', name: 'Øvelse', category: { nested: true } };
    expect(WorkoutExerciseSchema.safeParse(badExercise).success).toBe(false);
  });

  it('avviser manglende navn', () => {
    const { name: _name, ...rest } = validWorkout;
    expect(WorkoutTemplateSchema.safeParse(rest).success).toBe(false);
  });

  it('avviser items som ikke er en liste', () => {
    expect(
      WorkoutTemplateSchema.safeParse({ ...validWorkout, items: 'ikke-en-liste' }).success
    ).toBe(false);
  });

  it('avviser negative varigheter', () => {
    expect(
      WorkoutTemplateSchema.safeParse({ ...validWorkout, prepareDurationSeconds: -5 }).success
    ).toBe(false);
    const badItem = {
      ...validWorkout,
      items: [{ ...validWorkout.items[0], workDurationSeconds: -1 }],
    };
    expect(WorkoutTemplateSchema.safeParse(badItem).success).toBe(false);
  });

  it('avviser null runder og absurde runde-antall (fiendtlig payload)', () => {
    expect(WorkoutTemplateSchema.safeParse({ ...validWorkout, rounds: 0 }).success).toBe(false);
    expect(
      WorkoutTemplateSchema.safeParse({ ...validWorkout, rounds: 1_000_000_000 }).success
    ).toBe(false);
  });

  it('avviser ukjent økt-type', () => {
    expect(
      WorkoutTemplateSchema.safeParse({ ...validWorkout, type: 'yoga' }).success
    ).toBe(false);
  });

  it('stripper ukjente felt slik at vilkårlige objekter ikke smittes inn i state', () => {
    const withExtra = { ...validWorkout, ondsinnetFelt: { nested: true } };
    const result = WorkoutTemplateSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('ondsinnetFelt' in result.data).toBe(false);
    }
  });
});

describe('InterruptedSessionSchema', () => {
  const validSession = {
    workout: validWorkout,
    phase: 'work',
    currentRound: 1,
    currentItemIndex: 0,
    totalElapsedSeconds: 65,
    savedAt: Date.now(),
  };

  it('aksepterer en gyldig avbrutt økt', () => {
    expect(InterruptedSessionSchema.safeParse(validSession).success).toBe(true);
  });

  it('avviser ugyldig fase', () => {
    expect(
      InterruptedSessionSchema.safeParse({ ...validSession, phase: 'yoga' }).success
    ).toBe(false);
  });

  it('avviser manglende savedAt', () => {
    const { savedAt: _savedAt, ...rest } = validSession;
    expect(InterruptedSessionSchema.safeParse(rest).success).toBe(false);
  });
});

describe('CompletedWorkoutLogSchema', () => {
  const validLog = {
    id: 'log-1',
    userId: 'anonymous',
    workoutId: 'w1',
    workoutName: 'Tabata',
    workoutType: 'tabata',
    durationSeconds: 245.5, // kan være brøkdel (fra timerens totalElapsedSeconds)
    roundsCompleted: 2,
    totalRounds: 2,
    completedAt: '2026-08-29T10:00:00.000Z',
  };

  it('aksepterer en gyldig historikk-logg (inkl. brøkdels-sekunder)', () => {
    expect(CompletedWorkoutLogSchema.safeParse(validLog).success).toBe(true);
  });

  it('aksepterer valgfri difficultyRating', () => {
    expect(
      CompletedWorkoutLogSchema.safeParse({ ...validLog, difficultyRating: 'passe' }).success
    ).toBe(true);
    expect(
      CompletedWorkoutLogSchema.safeParse({ ...validLog, difficultyRating: 'umulig' }).success
    ).toBe(false);
  });

  it('avviser logg uten completedAt', () => {
    const { completedAt: _c, ...rest } = validLog;
    expect(CompletedWorkoutLogSchema.safeParse(rest).success).toBe(false);
  });
});
