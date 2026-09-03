import { describe, it, expect, beforeEach } from 'vitest';
import { shouldShowAccountPrompt, dismissAccountPrompt } from '../accountPromptService';

beforeEach(() => localStorage.clear());
describe('accountPromptService', () => {
  it('vises kun for anonym bruker og kun til avvist, per moment', () => {
    expect(shouldShowAccountPrompt('first_workout', { isLoggedIn: false })).toBe(true);
    expect(shouldShowAccountPrompt('first_workout', { isLoggedIn: true })).toBe(false);
    dismissAccountPrompt('first_workout');
    expect(shouldShowAccountPrompt('first_workout', { isLoggedIn: false })).toBe(false);
    expect(shouldShowAccountPrompt('week2', { isLoggedIn: false })).toBe(true); // uavhengige momenter
  });
});
