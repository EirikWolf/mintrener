import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  COACH_PERSONAS,
  getActiveCoachPersona,
  setActiveCoachPersona,
  playPersonaCue,
  playIntroThenExercise,
  getPersonaCueUrl,
  stopCurrentPersonaAudio
} from '../coachPersonaService';

describe('coachPersonaService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('contains the 5 defined personas', () => {
    expect(COACH_PERSONAS.length).toBe(5);
    const ids = COACH_PERSONAS.map(p => p.id);
    expect(ids).toContain('haugesund');
    expect(ids).toContain('romsdal');
    expect(ids).toContain('hardcore');
    expect(ids).toContain('boyband');
    expect(ids).toContain('standard');
  });

  it('defaults to standard if nothing is saved', () => {
    expect(getActiveCoachPersona()).toBe('standard');
  });

  it('saves and reads active persona correctly', () => {
    setActiveCoachPersona('hardcore');
    expect(getActiveCoachPersona()).toBe('hardcore');

    setActiveCoachPersona('romsdal');
    expect(getActiveCoachPersona()).toBe('romsdal');
  });

  it('returns false for standard persona cue without crashing', async () => {
    const res = await playPersonaCue('start_321', 'standard');
    expect(res).toBe(false);
  });

  it('stops current persona audio gracefully without error', () => {
    expect(() => stopCurrentPersonaAudio()).not.toThrow();
  });

  it('bygger cue-URL fra personaens cuesPath, og null for standard (uten cuesPath)', () => {
    expect(getPersonaCueUrl('intro', 'hardcore')).toBe('/audio/personas/hardcore/intro.mp3');
    expect(getPersonaCueUrl('start_321', 'romsdal')).toBe('/audio/personas/romsdal/start_321.mp3');
    expect(getPersonaCueUrl('intro', 'standard')).toBeNull();
  });

  it('playIntroThenExercise returnerer false for standard persona', async () => {
    setActiveCoachPersona('standard');
    await expect(playIntroThenExercise('kneboy')).resolves.toBe(false);
  });

  it('playIntroThenExercise returnerer false når bufferne ikke er dekodet (degradert sti)', async () => {
    setActiveCoachPersona('hardcore');
    // Ingen preload har skjedd i denne testen – motoren har tomt cache
    await expect(playIntroThenExercise('kneboy')).resolves.toBe(false);
  });
});
