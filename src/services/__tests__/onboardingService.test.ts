import { describe, it, expect, beforeEach } from 'vitest';
import { shouldShowOnboarding, markOnboardingDone } from '../onboardingService';
import { WORKOUT_HISTORY_KEY } from '../workoutHistoryStorage';

beforeEach(() => localStorage.clear());

describe('onboardingService', () => {
  it('trigges kun for helt ferske brukere', () => {
    expect(shouldShowOnboarding()).toBe(true);
    localStorage.setItem('mintrener_coach_persona', 'standard');
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('lagret historikk alene undertrykker flyten (eksisterende bruker)', () => {
    localStorage.setItem(WORKOUT_HISTORY_KEY, '[]');
    expect(shouldShowOnboarding()).toBe(false);
  });

  it('markOnboardingDone er varig', () => {
    markOnboardingDone();
    expect(shouldShowOnboarding()).toBe(false);
    const raw = localStorage.getItem('mintrener_onboarding_v1');
    expect(raw).not.toBeNull();
    expect(typeof JSON.parse(raw as string).completedAt).toBe('string');
  });
});
