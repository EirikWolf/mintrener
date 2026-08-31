import { describe, it, expect } from 'vitest';
import {
  SOUND_LEVELS,
  flagsForSoundLevel,
  soundLevelFromFlags,
  defaultSoundLevelForProfiles,
} from '../soundLevelService';

/**
 * Lydnivå: stille, signal, trener.
 *
 * Appen hadde to uavhengige brytere — «Lydvarsler» og «Talecoach» — og fire
 * mulige kombinasjoner, hvorav brukeren bare forstod to. Tilbakemeldingen fra
 * arbeidsplassen var konkret: noen vil ha stillhet, andre vil ha diskrete pip
 * som markerer start og slutt, og noen vil ha treneren.
 *
 * Nivået «signal» var teknisk mulig hele tiden (lyd på, tale av), men det het
 * ingenting, og ingen fant det. To brytere som må stå i riktig kombinasjon er
 * ikke et valg — det er en gåte.
 *
 * Kombinasjonen «lyd av, tale på» var dessuten inkonsistent: pipene forsvant,
 * men stemmen ble igjen. Den mappes til `stille`, og talen gates nå også på
 * lyd — «av» skal bety av.
 */

describe('soundLevelService — nivået utledes av bryterne', () => {
  it('leser trener når både lyd og tale er på', () => {
    expect(soundLevelFromFlags({ soundEnabled: true, speechEnabled: true })).toBe('trener');
  });

  it('leser signal når lyden er på og talen av', () => {
    expect(soundLevelFromFlags({ soundEnabled: true, speechEnabled: false })).toBe('signal');
  });

  it('leser stille når lyden er av', () => {
    expect(soundLevelFromFlags({ soundEnabled: false, speechEnabled: false })).toBe('stille');
  });

  it('leser stille også når talen står igjen på — lyd av betyr av', () => {
    // Nåbar med de gamle uavhengige bryterne. Uten denne linjen ville
    // «Stille» vist seg på skjermen mens stemmen fortsatte å snakke.
    expect(soundLevelFromFlags({ soundEnabled: false, speechEnabled: true })).toBe('stille');
  });
});

describe('soundLevelService — nivået settes tilbake til bryterne', () => {
  it('slår av alt i stille', () => {
    expect(flagsForSoundLevel('stille')).toEqual({ soundEnabled: false, speechEnabled: false });
  });

  it('beholder pipene, men ikke stemmen, i signal', () => {
    expect(flagsForSoundLevel('signal')).toEqual({ soundEnabled: true, speechEnabled: false });
  });

  it('slår på alt i trener', () => {
    expect(flagsForSoundLevel('trener')).toEqual({ soundEnabled: true, speechEnabled: true });
  });

  it('er rundtur-stabil for alle tre nivåene', () => {
    for (const nivå of SOUND_LEVELS.map((n) => n.id)) {
      expect(soundLevelFromFlags(flagsForSoundLevel(nivå))).toBe(nivå);
    }
  });
});

describe('soundLevelService — profilen foreslår, brukeren bestemmer', () => {
  it('foreslår signal på kontoret — et åpent landskap tåler ikke en stemme', () => {
    expect(defaultSoundLevelForProfiles(['kontor'])).toBe('signal');
  });

  it('foreslår signal for kor og musikere — de trenger stillhet mellom øvelsene', () => {
    expect(defaultSoundLevelForProfiles(['kor'])).toBe('signal');
  });

  it('foreslår trener for barn', () => {
    expect(defaultSoundLevelForProfiles(['barn'])).toBe('trener');
  });

  it('foreslår trener når ingen profil er valgt', () => {
    expect(defaultSoundLevelForProfiles([])).toBe('trener');
  });

  it('velger det mest dempede når profilene er uenige', () => {
    // Kontor + barn: den som trenger stillhet taper ingenting på et pip,
    // men den som trenger stemme får den ikke tilbake i et åpent landskap.
    expect(defaultSoundLevelForProfiles(['kontor', 'barn'])).toBe('signal');
  });

  it('overser ukjente profil-id-er i stedet for å kræsje', () => {
    expect(defaultSoundLevelForProfiles(['finnes-ikke'])).toBe('trener');
  });
});

describe('soundLevelService — nivåene er beskrevet for brukeren', () => {
  it('har tre nivåer i rekkefølge fra stille til mest lyd', () => {
    expect(SOUND_LEVELS.map((n) => n.id)).toEqual(['stille', 'signal', 'trener']);
  });

  it('gir hvert nivå en etikett og en forklaring på norsk', () => {
    for (const nivå of SOUND_LEVELS) {
      expect(nivå.label.length).toBeGreaterThan(0);
      expect(nivå.description.length).toBeGreaterThan(0);
    }
  });
});
