import { describe, it, expect } from 'vitest';
import { computeStreakDays } from '../streakService';
import { toLocalDateString } from '../weekUtils';

const localDate = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toLocalDateString(d);
};

describe('computeStreakDays', () => {
  it('returnerer 0 for tom liste', () => {
    expect(computeStreakDays([])).toBe(0);
  });

  it('håndterer økter logget rett etter lokal midnatt korrekt uten UTC-forskyvning', () => {
    // Simulér en økt logget kl. 00:15 lokal tid i dag og i går
    const today = new Date();
    today.setHours(0, 15, 0, 0);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 45, 0, 0);

    const dates = [toLocalDateString(today), toLocalDateString(yesterday)];
    expect(computeStreakDays(dates)).toBe(2);
  });

  it('returnerer 0 hvis siste økt er eldre enn i går', () => {
    expect(computeStreakDays([localDate(3), localDate(4)])).toBe(0);
  });

  it('teller konsekutive dager fram til i dag', () => {
    expect(computeStreakDays([localDate(0), localDate(1), localDate(2)])).toBe(3);
  });

  it('teller konsekutive dager som starter i går (i dag ikke trent ennå)', () => {
    expect(computeStreakDays([localDate(1), localDate(2), localDate(3)])).toBe(3);
  });

  it('stopper streaken ved et hull i datoene', () => {
    expect(computeStreakDays([localDate(0), localDate(1), localDate(3), localDate(4)])).toBe(2);
  });

  it('håndterer duplikate datoer (flere økter samme dag) uten å telle dem dobbelt', () => {
    expect(computeStreakDays([localDate(0), localDate(0), localDate(1)])).toBe(2);
  });

  it('gir streak på 1 hvis kun i dag er trent', () => {
    expect(computeStreakDays([localDate(0)])).toBe(1);
  });
});
