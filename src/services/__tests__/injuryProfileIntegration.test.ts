import { describe, it, expect, beforeEach } from 'vitest';
import {
  getInjuryProfile,
  saveInjuryProfile,
  hasActiveInjuryFilters,
  translatePainPointsToAvoidList,
} from '../injuryAlternativeService';
import { generateCustomAiWorkout } from '../aiWorkoutGeneratorService';
import { checkAdaptiveProgression } from '../adaptiveProgressionService';
import { WorkoutTemplate } from '../../types/workout';
import { CompletedWorkoutLog } from '../../types/models';

describe('Oppgave 1 — Persistert skadeprofil og integrasjon (TDD)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Persistert skadeprofil', () => {
    it('starter med tom profil og hasActiveInjuryFilters = false', () => {
      expect(getInjuryProfile()).toEqual({ painPoints: [], updatedAt: expect.any(String) });
      expect(hasActiveInjuryFilters()).toBe(false);
    });

    it('lagrer og henter skadeprofil og setter hasActiveInjuryFilters = true', () => {
      saveInjuryProfile({ painPoints: ['korsrygg', 'kne'] });
      const profile = getInjuryProfile();
      expect(profile.painPoints).toEqual(['korsrygg', 'kne']);
      expect(hasActiveInjuryFilters()).toBe(true);
    });
  });

  describe('2. Harmonisering av ordforråd', () => {
    it('oversetter typede PainPointId til generatorens unngå-liste inkludert synonymer', () => {
      const avoid = translatePainPointsToAvoidList(['kne', 'korsrygg', 'skulder', 'handledd', 'nakke']);
      expect(avoid).toContain('knær');
      expect(avoid).toContain('hopp');
      expect(avoid).toContain('korsrygg');
      expect(avoid).toContain('skuldre');
      expect(avoid).toContain('håndledd');
    });

    it('beviser at "kne" i profilen faktisk fjerner knebøy/kneboy fra AI-generatoren', () => {
      saveInjuryProfile({ painPoints: ['kne'] });
      const avoidList = translatePainPointsToAvoidList(getInjuryProfile().painPoints);

      const workout = generateCustomAiWorkout({
        durationMinutes: 10,
        focus: 'helkropp',
        avoidInjuries: avoidList,
      });

      workout.items.forEach((item) => {
        expect(item.exercise.id).not.toContain('kneboy');
        expect(item.exercise.id).not.toContain('squat');
        expect(item.exercise.id).not.toContain('burpee');
        expect(item.exercise.id).not.toContain('hopp');
      });
    });
  });

  describe('3. Ende-til-ende adaptiv progresjon med persistert skadeprofil', () => {
    it('leser automatisk lagret skadeprofil med "korsrygg", logger to "for_lett", og øker aldri workDurationSeconds', () => {
      saveInjuryProfile({ painPoints: ['korsrygg'] });
      expect(hasActiveInjuryFilters()).toBe(true);

      const sampleWorkout: WorkoutTemplate = {
        id: 'rygg-tabata',
        name: 'Kjerne & Rygg',
        description: 'Testøkt',
        type: 'tabata',
        prepareDurationSeconds: 10,
        rounds: 1,
        roundRestDurationSeconds: 0,
        items: [
          {
            id: 'i1',
            exercise: { id: 'planke', name: 'Planke', category: 'bodyweight' },
            workDurationSeconds: 20,
            restDurationSeconds: 25,
          },
        ],
      };

      const history: CompletedWorkoutLog[] = [
        {
          id: 'l1',
          userId: 'u1',
          workoutId: 'rygg-tabata',
          workoutName: 'Kjerne & Rygg',
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
          workoutId: 'rygg-tabata',
          workoutName: 'Kjerne & Rygg',
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
      expect(suggestion?.adaptedWorkout.items[0].workDurationSeconds).toBe(20);
      expect(suggestion?.adaptedWorkout.items[0].restDurationSeconds).toBe(23);
    });
  });
});
