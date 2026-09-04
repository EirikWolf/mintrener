import { describe, it, expect } from 'vitest';
import { isCuratorEnabled, isExerciseImagesEnabled } from '../featureFlags';

/**
 * Bildekuratoren er et internt QA-verktøy og skal ikke være tilgjengelig for
 * sluttbrukere (revisjon A/B). Innlogging er ikke en tilstrekkelig port —
 * appen er åpen for alle med Google-konto.
 */
describe('isCuratorEnabled', () => {
  it('er permanent deaktivert', () => {
    expect(isCuratorEnabled({ DEV: false })).toBe(false);
    expect(isCuratorEnabled({})).toBe(false);
    expect(isCuratorEnabled({ DEV: true, VITE_ENABLE_EXERCISE_IMAGES: 'true' })).toBe(false);
    expect(isCuratorEnabled({ DEV: true })).toBe(false);
    expect(
      isCuratorEnabled({
        DEV: false,
        VITE_ENABLE_CURATOR: 'true',
        VITE_ENABLE_EXERCISE_IMAGES: 'true',
      })
    ).toBe(false);
  });
});

describe('isExerciseImagesEnabled', () => {
  it('er standard AV uten eksplisitt miljøvariabel', () => {
    expect(isExerciseImagesEnabled({})).toBe(false);
  });

  it('er PÅ kun når VITE_ENABLE_EXERCISE_IMAGES er nøyaktig true', () => {
    expect(isExerciseImagesEnabled({ VITE_ENABLE_EXERCISE_IMAGES: 'true' })).toBe(true);
    expect(isExerciseImagesEnabled({ VITE_ENABLE_EXERCISE_IMAGES: 'false' })).toBe(false);
    expect(isExerciseImagesEnabled({ VITE_ENABLE_EXERCISE_IMAGES: '1' })).toBe(false);
  });
});
