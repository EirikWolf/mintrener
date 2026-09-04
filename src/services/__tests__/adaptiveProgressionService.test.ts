import { describe, it, expect } from 'vitest';
import { checkAdaptiveProgression } from '../adaptiveProgressionService';
import { WorkoutTemplate } from '../../types/workout';
import { CompletedWorkoutLog } from '../../types/models';

const sampleWorkout: WorkoutTemplate = {
  id: 'tabata-1',
  name: 'Klassisk Tabata',
  description: 'Test tabata',
  type: 'tabata',
  prepareDurationSeconds: 10,
  rounds: 1,
  roundRestDurationSeconds: 0,
  items: [
    {
      id: 'i1',
      exercise: { id: 'kneboy', name: 'Knebøy', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
  ],
};

describe('Adaptive Progression Service', () => {
  it('foreslår nivåoppgradering ved 2 "for_lett" på rad', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 1000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_lett',
      },
      {
        id: 'l2',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 200000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_lett',
      },
    ];

    const suggestion = checkAdaptiveProgression(sampleWorkout, history);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.type).toBe('increase');
    // Siden hviletid på sampleWorkout er 10s (<= 20s), skal vi øke arbeidstid (+5s), og beholde hviletid intakt (10s)
    expect(suggestion?.adaptedWorkout.items[0].workDurationSeconds).toBe(25);
    expect(suggestion?.adaptedWorkout.items[0].restDurationSeconds).toBe(10);
  });

  it('foreslår justering nedover ved 2 "for_tungt" på rad', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 1000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_tungt',
      },
      {
        id: 'l2',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 200000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_tungt',
      },
    ];

    const suggestion = checkAdaptiveProgression(sampleWorkout, history);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.type).toBe('decrease');
    expect(suggestion?.adaptedWorkout.items[0].workDurationSeconds).toBe(15);
    expect(suggestion?.adaptedWorkout.items[0].restDurationSeconds).toBe(15);
  });

  it('foreslår Deload ved 3 "for_tungt" på rad eller ufullstendige runder', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 1000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_tungt',
      },
      {
        id: 'l2',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 100000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_tungt',
      },
      {
        id: 'l3',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date(Date.now() - 200000).toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'for_tungt',
      },
    ];

    const suggestion = checkAdaptiveProgression(sampleWorkout, history);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.type).toBe('deload');
    expect(suggestion?.title).toContain('Deload');
    // 20s arbeid redusert med 40 % -> 12s
    expect(suggestion?.adaptedWorkout.items[0].workDurationSeconds).toBe(12);
  });

  it('gir null hvis mindre enn 2 logger eller blandet vurdering', () => {
    const history: CompletedWorkoutLog[] = [
      {
        id: 'l1',
        userId: 'u1',
        workoutId: 'tabata-1',
        workoutName: 'Klassisk Tabata',
        workoutType: 'tabata',
        completedAt: new Date().toISOString(),
        durationSeconds: 240,
        roundsCompleted: 1,
        totalRounds: 1,
        difficultyRating: 'passe',
      },
    ];

    expect(checkAdaptiveProgression(sampleWorkout, history)).toBeNull();
  });

  describe('Moonshot 4: Skadefilter-beskyttelse i progresjonsmotoren', () => {
    it('øker aldri arbeidstid når brukeren har aktive skadefiltre, men kutter pause til gulv 15s', () => {
      const history: CompletedWorkoutLog[] = [
        {
          id: 'l1',
          userId: 'u1',
          workoutId: 'tabata-long-rest',
          workoutName: 'Tabata Pause',
          workoutType: 'tabata',
          completedAt: new Date(Date.now() - 1000).toISOString(),
          durationSeconds: 240,
          roundsCompleted: 1,
          totalRounds: 1,
          difficultyRating: 'for_lett',
        },
        {
          id: 'l2',
          userId: 'u1',
          workoutId: 'tabata-long-rest',
          workoutName: 'Tabata Pause',
          workoutType: 'tabata',
          completedAt: new Date(Date.now() - 200000).toISOString(),
          durationSeconds: 240,
          roundsCompleted: 1,
          totalRounds: 1,
          difficultyRating: 'for_lett',
        },
      ];

      const workoutWithRest: WorkoutTemplate = {
        ...sampleWorkout,
        id: 'tabata-long-rest',
        name: 'Tabata Pause',
        items: [
          {
            id: 'i1',
            exercise: { id: 'glute-bridge', name: 'Seteløft', category: 'bodyweight' },
            workDurationSeconds: 20,
            restDurationSeconds: 25,
          },
        ],
      };

      const suggestion = checkAdaptiveProgression(workoutWithRest, history, { hasActiveInjuryFilters: true });
      expect(suggestion).not.toBeNull();
      expect(suggestion?.type).toBe('increase');
      expect(suggestion?.adaptedWorkout.name).toContain('Skånsom +1');
      // Arbeidstid skal IKKE røres ved skaderegime!
      expect(suggestion?.adaptedWorkout.items[0].workDurationSeconds).toBe(20);
      // Hviletid kuttes med 2 sekunder
      expect(suggestion?.adaptedWorkout.items[0].restDurationSeconds).toBe(23);
    });

    it('gir null og overbelaster ikke hvis hviletid allerede er på gulvet 15s under skadefilter', () => {
      const history: CompletedWorkoutLog[] = [
        {
          id: 'l1',
          userId: 'u1',
          workoutId: 'tabata-floor',
          workoutName: 'Tabata Gulv',
          workoutType: 'tabata',
          completedAt: new Date(Date.now() - 1000).toISOString(),
          durationSeconds: 240,
          roundsCompleted: 1,
          totalRounds: 1,
          difficultyRating: 'for_lett',
        },
        {
          id: 'l2',
          userId: 'u1',
          workoutId: 'tabata-floor',
          workoutName: 'Tabata Gulv',
          workoutType: 'tabata',
          completedAt: new Date(Date.now() - 200000).toISOString(),
          durationSeconds: 240,
          roundsCompleted: 1,
          totalRounds: 1,
          difficultyRating: 'for_lett',
        },
      ];

      const workoutAtFloor: WorkoutTemplate = {
        ...sampleWorkout,
        id: 'tabata-floor',
        name: 'Tabata Gulv',
        items: [
          {
            id: 'i1',
            exercise: { id: 'glute-bridge', name: 'Seteløft', category: 'bodyweight' },
            workDurationSeconds: 20,
            restDurationSeconds: 15,
          },
        ],
      };

      // Ved skadefilter og allerede 15s hvile skal ingenting presses videre
      expect(checkAdaptiveProgression(workoutAtFloor, history, { hasActiveInjuryFilters: true })).toBeNull();
    });
  });
});
