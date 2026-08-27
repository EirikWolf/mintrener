import { describe, it, expect, beforeEach } from 'vitest';
import {
  getComposedContextFilter,
  getComposedTextScale,
  getComposedReduceMotion,
  getComposedHideList,
  getComposedPromotedFeatures,
  getComposedQuickRows,
  resolveExerciseForProfile,
  getUserProfilesState,
  saveUserProfilesState,
} from '../profileCompositionService';
import { CONTEXT_PROFILES } from '../../data/profiles';
import { ExerciseItem } from '../../schemas/exerciseSchema';

describe('profileCompositionService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lager union av contextFilter', () => {
    const filter = getComposedContextFilter([CONTEXT_PROFILES.kontor, CONTEXT_PROFILES.barn]);
    expect(filter).toContain('kontor');
    expect(filter).toContain('micro');
    expect(filter).toContain('barn');
    expect(filter).toContain('lek');
  });

  it('velger mest tilgjengelig tekstskala (maks verdi)', () => {
    const scale = getComposedTextScale([CONTEXT_PROFILES.kontor, CONTEXT_PROFILES.senior]);
    // kontor: 1.0, senior: 1.6 -> 1.6
    expect(scale).toBe(1.6);
  });

  it('setter reduceMotion til true hvis minst én profil krever det', () => {
    expect(getComposedReduceMotion([CONTEXT_PROFILES.kontor, CONTEXT_PROFILES.barn])).toBe(false);
    expect(getComposedReduceMotion([CONTEXT_PROFILES.kontor, CONTEXT_PROFILES.senior])).toBe(true);
  });

  it('tar snittet av hide-lister (skjuler kun hvis alle valgte profiler skjuler det)', () => {
    // barn skjuler: ['difficultyFeedback', 'records', 'leaderboard']
    // senior skjuler: ['difficultyFeedback', 'records', 'leaderboard']
    // kontor skjuler: []
    const barnAndSenior = getComposedHideList([CONTEXT_PROFILES.barn, CONTEXT_PROFILES.senior]);
    expect(barnAndSenior).toContain('records');

    const barnAndKontor = getComposedHideList([CONTEXT_PROFILES.barn, CONTEXT_PROFILES.kontor]);
    // Siden kontor ikke skjuler records, skal snittet være tomt
    expect(barnAndKontor).toEqual([]);
  });

  it('lager union av promoted features', () => {
    const promoted = getComposedPromotedFeatures([CONTEXT_PROFILES.kontor, CONTEXT_PROFILES.idrettslag]);
    expect(promoted).toContain('micro');
    expect(promoted).toContain('gps');
    expect(promoted).toContain('lead');
  });

  it('sorterer hurtigrader med primærprofil øverst', () => {
    const rows = getComposedQuickRows(
      [CONTEXT_PROFILES.barn, CONTEXT_PROFILES.kontor],
      'kontor'
    );
    expect(rows[0].profile.id).toBe('kontor');
    expect(rows[1].profile.id).toBe('barn');
  });

  it('oppløser øvelsesalternativer (resolve) etter profilregler', () => {
    const baseExercise: ExerciseItem = {
      id: 'push-ups',
      navn: { nb: 'Armhevinger' },
      type: 'reps',
      kategori: 'kroppsvekt',
      muskler: { primær: ['bryst'], sekundær: [] },
      utstyr: ['ingen'],
      nivå: 'nybegynner',
      instruks: { nb: ['Punkt 1', 'Punkt 2'] },
      vanligeFeil: { nb: [] },
      sensorProfil: 'ingen',
      bildeVinkel: 'side',
      bildeStatus: 'mangler',
      alternatives: {
        quiet: 'quiet-push-up',
        seated: 'seated-press',
      },
    };

    const quietPushUp: ExerciseItem = {
      id: 'quiet-push-up',
      navn: { nb: 'Stille armheving' },
      type: 'reps',
      kategori: 'kroppsvekt',
      muskler: { primær: ['bryst'], sekundær: [] },
      utstyr: ['ingen'],
      nivå: 'nybegynner',
      instruks: { nb: ['Rolig bevegelse', 'Press'] },
      vanligeFeil: { nb: [] },
      sensorProfil: 'ingen',
      bildeVinkel: 'side',
      bildeStatus: 'mangler',
    };

    const library = [baseExercise, quietPushUp];

    // For kontor (som har resolve: ['quiet']):
    const resolvedKontor = resolveExerciseForProfile(baseExercise, CONTEXT_PROFILES.kontor, library);
    expect(resolvedKontor.id).toBe('quiet-push-up');

    // For barn (som ikke har resolve for quiet):
    const resolvedBarn = resolveExerciseForProfile(baseExercise, CONTEXT_PROFILES.barn, library);
    expect(resolvedBarn.id).toBe('push-ups');
  });

  it('lagrer og henter UserProfilesState i localStorage', () => {
    saveUserProfilesState({
      profiles: ['kontor', 'barn'],
      primaryProfile: 'kontor',
      hasCompletedOnboarding: true,
    });

    const state = getUserProfilesState();
    expect(state.hasCompletedOnboarding).toBe(true);
    expect(state.profiles).toEqual(['kontor', 'barn']);
  });
});
