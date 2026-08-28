/**
 * Internationalization (i18n) Service
 * Støtter Bokmål (nb), Nynorsk (nn) og Engelsk (en).
 */

export type SupportedLanguage = 'nb' | 'nn' | 'en';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'nb', name: 'Norsk (Bokmål)', flag: '🇳🇴' },
  { code: 'nn', name: 'Norsk (Nynorsk)', flag: '🇳🇴' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

const I18N_STORAGE_KEY = 'mintrener_preferred_language_v1';

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  nb: {
    'app.title': 'Min Trener',
    'app.subtitle': 'Enkel, ren og reklamefri intervalltrening',
    'phase.prepare': 'Klargjøring',
    'phase.work': 'Jobb',
    'phase.rest': 'Pause',
    'phase.complete': 'Fullført',
    'button.start': 'Start',
    'button.pause': 'Pause',
    'button.resume': 'Fortsett',
    'button.skip': 'Hopp over',
    'button.reset': 'Nullstill',
    'nav.timer': 'Timer',
    'nav.programs': 'Programmer',
    'nav.challenges': 'Utfordringer',
    'nav.skills': 'Ferdigheter',
    'nav.strength': 'Styrke',
    'nav.settings': 'Innstillinger',
    'settings.language': 'Språk',
    'settings.profiles': 'Kontekstprofiler',
    'settings.sound': 'Lyd & Stemme',
    'challenge.title': 'Utfordringer',
    'challenge.start': 'Start dagens økt',
    'challenge.calendar': 'Legg i kalender',
  },
  nn: {
    'app.title': 'Min Trenar',
    'app.subtitle': 'Enkel, rein og reklamefri intervalltrening',
    'phase.prepare': 'Gjer deg klar',
    'phase.work': 'Arbeid',
    'phase.rest': 'Pause',
    'phase.complete': 'Fullført',
    'button.start': 'Start',
    'button.pause': 'Pause',
    'button.resume': 'Hald fram',
    'button.skip': 'Hopp over',
    'button.reset': 'Nullstill',
    'nav.timer': 'Timer',
    'nav.programs': 'Program',
    'nav.challenges': 'Utfordringar',
    'nav.skills': 'Ferdigheiter',
    'nav.strength': 'Styrke',
    'nav.settings': 'Innstillingar',
    'settings.language': 'Språk',
    'settings.profiles': 'Kontekstprofilar',
    'settings.sound': 'Lyd & Røyst',
    'challenge.title': 'Utfordringar',
    'challenge.start': 'Start dagens økt',
    'challenge.calendar': 'Legg i kalender',
  },
  en: {
    'app.title': 'My Trainer',
    'app.subtitle': 'Simple, clean and ad-free interval training',
    'phase.prepare': 'Get Ready',
    'phase.work': 'Work',
    'phase.rest': 'Rest',
    'phase.complete': 'Completed',
    'button.start': 'Start',
    'button.pause': 'Pause',
    'button.resume': 'Resume',
    'button.skip': 'Skip',
    'button.reset': 'Reset',
    'nav.timer': 'Timer',
    'nav.programs': 'Programs',
    'nav.challenges': 'Challenges',
    'nav.skills': 'Skills',
    'nav.strength': 'Strength',
    'nav.settings': 'Settings',
    'settings.language': 'Language',
    'settings.profiles': 'Context Profiles',
    'settings.sound': 'Sound & Voice',
    'challenge.title': 'Challenges',
    'challenge.start': 'Start Daily Workout',
    'challenge.calendar': 'Add to Calendar',
  },
};

export function getCurrentLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(I18N_STORAGE_KEY) as SupportedLanguage;
    if (saved && ['nb', 'nn', 'en'].includes(saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Feil ved lesing av språk:', e);
  }
  return 'nb';
}

export function setLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(I18N_STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lang } }));
    }
  } catch (e) {
    console.error('Feil ved lagring av språk:', e);
  }
}

// Synkroniser initial lang-attributt
if (typeof document !== 'undefined') {
  document.documentElement.lang = getCurrentLanguage();
}

export function t(key: string, fallback?: string): string {
  const lang = getCurrentLanguage();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.nb;
  return dict[key] || fallback || key;
}
