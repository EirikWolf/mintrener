// B3 Task β5: coachPersonaService konsumerer det genererte persona-manifestet.
// Manifestet mockes med AVVIKENDE URL-er (".v2"-suffiks/CDN-sti) slik at testene
// beviser at oppslagene faktisk går via manifestet og ikke bare tilfeldigvis
// treffer cuesPath-konvensjonen (som gir identiske URL-er i det ekte manifestet).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPersonaCueUrl,
  getPersonaClipKey,
  preloadPersonaAudio,
  playPersonaCue,
  playIntroThenExercise,
  setActiveCoachPersona,
} from '../coachPersonaService';
import { audioBufferEngine } from '../audioBufferEngine';

// Kun hardcore i mock-manifestet: boyband tester fallbacken til cuesPath.
vi.mock('../../data/personaAudioManifest.json', () => ({
  default: {
    hardcore: {
      intro: '/cdn/hc/intro.v2.mp3',
      start_321: '/cdn/hc/start_321.v2.mp3',
      halfway: '/cdn/hc/halfway.v2.mp3',
      last5: '/cdn/hc/last5.v2.mp3',
      finish: '/cdn/hc/finish.v2.mp3',
      'go-2': '/cdn/hc/go-2.v2.mp3',
      'bro-neste': '/cdn/hc/bro-neste.v2.mp3',
      'exercise-kneboy': '/cdn/hc/exercise-kneboy.v2.mp3',
    },
  },
}));

describe('coachPersonaService – manifestoppslag (β5)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('getPersonaClipKey slår opp i manifestet, ikke cuesPath-konvensjonen', () => {
    expect(getPersonaClipKey('go-2', 'hardcore')).toBe('/cdn/hc/go-2.v2.mp3');
    expect(getPersonaClipKey('exercise-kneboy', 'hardcore')).toBe(
      '/cdn/hc/exercise-kneboy.v2.mp3'
    );
  });

  it('getPersonaCueUrl går via samme manifestoppslag', () => {
    expect(getPersonaCueUrl('intro', 'hardcore')).toBe('/cdn/hc/intro.v2.mp3');
  });

  it('persona i manifestet men klipp mangler → null (manifestet er autoritativt)', () => {
    // Fila fantes ikke ved bygg (byggtidsadvarsel gitt) — null ruter kallerne
    // (Directorens has()-sjekker/fallback-kjede) forbi et dødt 404-oppslag.
    expect(getPersonaClipKey('go-1', 'hardcore')).toBeNull();
    expect(getPersonaClipKey('bro-resync', 'hardcore')).toBeNull();
  });

  it('persona UTENFOR manifestet faller tilbake til cuesPath-konvensjonen', () => {
    expect(getPersonaClipKey('go-2', 'boyband')).toBe('/audio/personas/boyband/go-2.mp3');
    expect(getPersonaCueUrl('intro', 'boyband')).toBe('/audio/personas/boyband/intro.mp3');
  });

  it('standard (uten cuesPath og utenfor manifestet) gir fortsatt null', () => {
    expect(getPersonaClipKey('go-2', 'standard')).toBeNull();
    expect(getPersonaCueUrl('intro', 'standard')).toBeNull();
  });

  it('preloadPersonaAudio varmer HELE manifest-settet for personaen i buffer-motoren', () => {
    // Det er dette som aktiverer Directorens «dormant-but-ready» persona-
    // klipp-kjeder: has()-sjekkene (go/bro/exercise-klipp) krever dekodede buffere.
    const preloadSpy = vi.spyOn(audioBufferEngine, 'preload').mockResolvedValue(undefined);

    preloadPersonaAudio('hardcore');

    expect(preloadSpy).toHaveBeenCalledTimes(1);
    const keys = preloadSpy.mock.calls[0][0];
    expect([...keys].sort()).toEqual(
      [
        '/cdn/hc/intro.v2.mp3',
        '/cdn/hc/start_321.v2.mp3',
        '/cdn/hc/halfway.v2.mp3',
        '/cdn/hc/last5.v2.mp3',
        '/cdn/hc/finish.v2.mp3',
        '/cdn/hc/go-2.v2.mp3',
        '/cdn/hc/bro-neste.v2.mp3',
        '/cdn/hc/exercise-kneboy.v2.mp3',
      ].sort()
    );
  });

  it('preloadPersonaAudio uten manifest-oppføring preloader kjerne-cuene etter konvensjonen', () => {
    const preloadSpy = vi.spyOn(audioBufferEngine, 'preload').mockResolvedValue(undefined);

    preloadPersonaAudio('boyband');

    expect(preloadSpy).toHaveBeenCalledTimes(1);
    const keys = preloadSpy.mock.calls[0][0];
    expect(keys).toContain('/audio/personas/boyband/intro.mp3');
    expect(keys).toContain('/audio/personas/boyband/start_321.mp3');
  });

  it('preloadPersonaAudio for standard preloader ingenting', () => {
    const preloadSpy = vi.spyOn(audioBufferEngine, 'preload').mockResolvedValue(undefined);

    preloadPersonaAudio('standard');

    expect(preloadSpy).not.toHaveBeenCalled();
  });

  it('setActiveCoachPersona evikterer de ANDRE personaenes buffere, aldri den valgtes (BØR-2, β6)', () => {
    const evictSpy = vi.spyOn(audioBufferEngine, 'evict').mockImplementation(() => {});

    setActiveCoachPersona('hardcore');

    expect(evictSpy).toHaveBeenCalledTimes(1);
    const keys = evictSpy.mock.calls[0][0];
    // Personaene utenfor mock-manifestet evikteres etter cuesPath-konvensjonen —
    // samme URL-sett som preloadPersonaAudio varmer (settene MÅ speile hverandre)
    expect(keys).toContain('/audio/personas/boyband/intro.mp3');
    expect(keys).toContain('/audio/personas/boyband/start_321.mp3');
    expect(keys).toContain('/audio/personas/boyband/finish.mp3');
    // Den valgte personaens buffere beholdes (re-valg = varm cache)
    expect(keys.some((k) => k.startsWith('/cdn/hc/'))).toBe(false);
    // Kun persona-URL-er — delte studioklipp/countdown har manifest-nøkler uten
    // ledende skråstrek og skal aldri evikteres ved persona-bytte
    expect(keys.every((k) => k.startsWith('/'))).toBe(true);
  });

  it('setActiveCoachPersona("standard") evikterer alle persona-buffere (ren talesyntese)', () => {
    const evictSpy = vi.spyOn(audioBufferEngine, 'evict').mockImplementation(() => {});

    setActiveCoachPersona('standard');

    const keys = evictSpy.mock.calls[0][0];
    // Manifest-personaen evikteres via manifest-URL-ene sine …
    expect(keys).toContain('/cdn/hc/intro.v2.mp3');
    expect(keys).toContain('/cdn/hc/exercise-kneboy.v2.mp3');
    // … og konvensjons-personaen via cuesPath-settet
    expect(keys).toContain('/audio/personas/boyband/intro.mp3');
  });

  it('playPersonaCue spiller manifest-URL-en (bufret sti)', async () => {
    const hasSpy = vi.spyOn(audioBufferEngine, 'has').mockReturnValue(true);
    const playSpy = vi.spyOn(audioBufferEngine, 'playSequence').mockResolvedValue(true);
    vi.spyOn(audioBufferEngine, 'stopAudible').mockImplementation(() => {});

    await expect(playPersonaCue('halfway', 'hardcore')).resolves.toBe(true);

    expect(hasSpy).toHaveBeenCalledWith('/cdn/hc/halfway.v2.mp3');
    expect(playSpy).toHaveBeenCalledWith(['/cdn/hc/halfway.v2.mp3']);
  });

  it('playIntroThenExercise foretrekker personaens øvelsesklipp over studioklippet (spec § 4)', async () => {
    setActiveCoachPersona('hardcore');
    vi.spyOn(audioBufferEngine, 'has').mockReturnValue(true);
    const playSpy = vi.spyOn(audioBufferEngine, 'playSequence').mockResolvedValue(true);
    vi.spyOn(audioBufferEngine, 'stopAudible').mockImplementation(() => {});

    await expect(playIntroThenExercise('kneboy')).resolves.toBe(true);

    // Prioritetskjeden (persona-klipp → studioklipp): persona-klippet er cachet
    // → kjeden bruker det, ikke det generiske 'exercise-kneboy'-studioklippet.
    expect(playSpy).toHaveBeenCalledWith(['/cdn/hc/intro.v2.mp3', '/cdn/hc/exercise-kneboy.v2.mp3']);
  });

  it('playIntroThenExercise faller tilbake til studioklippet når persona-klippet ikke er cachet', async () => {
    setActiveCoachPersona('hardcore');
    // intro cachet, persona-øvelsesklippet IKKE cachet, studioklippet cachet
    vi.spyOn(audioBufferEngine, 'has').mockImplementation(
      (key: string) => key !== '/cdn/hc/exercise-kneboy.v2.mp3'
    );
    const playSpy = vi.spyOn(audioBufferEngine, 'playSequence').mockResolvedValue(true);
    vi.spyOn(audioBufferEngine, 'stopAudible').mockImplementation(() => {});

    await expect(playIntroThenExercise('kneboy')).resolves.toBe(true);

    expect(playSpy).toHaveBeenCalledWith(['/cdn/hc/intro.v2.mp3', 'exercise-kneboy']);
  });
});
