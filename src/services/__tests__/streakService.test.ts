import { describe, it, expect } from 'vitest';
import { computeStreakDays } from '../streakService';

const isoDate = (daysAgo: number): string => {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
};

describe('computeStreakDays', () => {
  it('returnerer 0 for tom liste', () => {
    expect(computeStreakDays([])).toBe(0);
  });

  it('returnerer 0 hvis siste økt er eldre enn i går', () => {
    expect(computeStreakDays([isoDate(3), isoDate(4)])).toBe(0);
  });

  it('teller konsekutive dager fram til i dag', () => {
    expect(computeStreakDays([isoDate(0), isoDate(1), isoDate(2)])).toBe(3);
  });

  it('teller konsekutive dager som starter i går (i dag ikke trent ennå)', () => {
    expect(computeStreakDays([isoDate(1), isoDate(2), isoDate(3)])).toBe(3);
  });

  it('stopper streaken ved et hull i datoene', () => {
    expect(computeStreakDays([isoDate(0), isoDate(1), isoDate(3), isoDate(4)])).toBe(2);
  });

  it('håndterer duplikate datoer (flere økter samme dag) uten å telle dem dobbelt', () => {
    expect(computeStreakDays([isoDate(0), isoDate(0), isoDate(1)])).toBe(2);
  });

  it('gir streak på 1 hvis kun i dag er trent', () => {
    expect(computeStreakDays([isoDate(0)])).toBe(1);
  });
});
