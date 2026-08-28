import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  COACH_PERSONAS,
  getActiveCoachPersona,
  setActiveCoachPersona,
  playPersonaCue,
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
});
