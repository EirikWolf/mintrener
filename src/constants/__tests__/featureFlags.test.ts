import { describe, it, expect } from 'vitest';
import { isCuratorEnabled } from '../featureFlags';

/**
 * Bildekuratoren er et internt QA-verktøy og skal ikke være tilgjengelig for
 * sluttbrukere (revisjon A/B). Innlogging er ikke en tilstrekkelig port —
 * appen er åpen for alle med Google-konto.
 */
describe('isCuratorEnabled', () => {
  it('er AV i et produksjonsbygg uten eksplisitt flagg', () => {
    expect(isCuratorEnabled({ DEV: false })).toBe(false);
    expect(isCuratorEnabled({})).toBe(false);
  });

  it('er PÅ i utvikling', () => {
    expect(isCuratorEnabled({ DEV: true })).toBe(true);
  });

  it('kan slås på eksplisitt i et produksjonsbygg', () => {
    expect(isCuratorEnabled({ DEV: false, VITE_ENABLE_CURATOR: 'true' })).toBe(true);
  });

  it('godtar bare strengen «true» — ikke vilkårlige verdier', () => {
    expect(isCuratorEnabled({ DEV: false, VITE_ENABLE_CURATOR: 'false' })).toBe(false);
    expect(isCuratorEnabled({ DEV: false, VITE_ENABLE_CURATOR: '1' })).toBe(false);
    expect(isCuratorEnabled({ DEV: false, VITE_ENABLE_CURATOR: '' })).toBe(false);
  });
});
