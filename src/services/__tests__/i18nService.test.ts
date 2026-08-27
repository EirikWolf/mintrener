import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCurrentLanguage,
  setLanguage,
  t,
  SUPPORTED_LANGUAGES,
} from '../i18nService';

describe('i18nService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('standard språk er norsk bokmål (nb)', () => {
    expect(getCurrentLanguage()).toBe('nb');
    expect(t('phase.work')).toBe('Jobb');
  });

  it('bytter språk til engelsk (en) og henter riktige oversettelser', () => {
    setLanguage('en');
    expect(getCurrentLanguage()).toBe('en');
    expect(t('phase.work')).toBe('Work');
    expect(t('phase.prepare')).toBe('Get Ready');
    expect(t('app.title')).toBe('My Trainer');
  });

  it('bytter språk til nynorsk (nn) og henter riktige oversettelser', () => {
    setLanguage('nn');
    expect(getCurrentLanguage()).toBe('nn');
    expect(t('phase.work')).toBe('Arbeid');
    expect(t('phase.prepare')).toBe('Gjer deg klar');
    expect(t('button.resume')).toBe('Hald fram');
  });

  it('har definert minst 3 språk', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(3);
  });
});
