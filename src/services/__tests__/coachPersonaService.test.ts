import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  COACH_PERSONAS,
  getActiveCoachPersona,
  setActiveCoachPersona,
  playPersonaCue,
  playIntroThenExercise,
  getPersonaCueUrl,
  getPersonaClipKey,
  stopCurrentPersonaAudio,
  stopAudiblePersonaAudio
} from '../coachPersonaService';
import { audioBufferEngine } from '../audioBufferEngine';
import { audioService } from '../audioService';
import { audioDuckingService } from '../audioDuckingService';

describe('coachPersonaService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('contains the 5 defined personas', () => {
    expect(COACH_PERSONAS.length).toBe(5);
    const ids = COACH_PERSONAS.map(p => p.id);
    expect(ids).toContain('haugesund');
    expect(ids).toContain('romsdal');
    expect(ids).toContain('hardcore');
    expect(ids).toContain('boyband');
    expect(ids).toContain('standard');
  });

  it('defaults to standard if nothing is saved', () => {
    expect(getActiveCoachPersona()).toBe('standard');
  });

  it('saves and reads active persona correctly', () => {
    setActiveCoachPersona('hardcore');
    expect(getActiveCoachPersona()).toBe('hardcore');

    setActiveCoachPersona('romsdal');
    expect(getActiveCoachPersona()).toBe('romsdal');
  });

  it('returns false for standard persona cue without crashing', async () => {
    const res = await playPersonaCue('start_321', 'standard');
    expect(res).toBe(false);
  });

  it('stops current persona audio gracefully without error', () => {
    expect(() => stopCurrentPersonaAudio()).not.toThrow();
  });

  it('bygger cue-URL fra personaens cuesPath, og null for standard (uten cuesPath)', () => {
    expect(getPersonaCueUrl('intro', 'hardcore')).toBe('/audio/personas/hardcore/intro.mp3');
    expect(getPersonaCueUrl('start_321', 'romsdal')).toBe('/audio/personas/romsdal/start_321.mp3');
    expect(getPersonaCueUrl('intro', 'standard')).toBeNull();
  });

  it('playIntroThenExercise returnerer false for standard persona', async () => {
    setActiveCoachPersona('standard');
    await expect(playIntroThenExercise('kneboy')).resolves.toBe(false);
  });

  it('playIntroThenExercise returnerer false når bufferne ikke er dekodet (degradert sti)', async () => {
    setActiveCoachPersona('hardcore');
    // Ingen preload har skjedd i denne testen – motoren har tomt cache
    await expect(playIntroThenExercise('kneboy')).resolves.toBe(false);
  });

  // β3: manifest-sømmen. getPersonaClipKey er ENESTE sted som bygger persona-
  // klippnøkler (cue ELLER 'exercise-<id>'); β5 bytter oppslagskilden til
  // generert manifest uten at kallerne (Directoren) endres.
  it('getPersonaClipKey bygger nøkkel etter cuesPath-konvensjonen for cue OG øvelses-id', () => {
    setActiveCoachPersona('hardcore');
    expect(getPersonaClipKey('bro-neste')).toBe('/audio/personas/hardcore/bro-neste.mp3');
    expect(getPersonaClipKey('go-2')).toBe('/audio/personas/hardcore/go-2.mp3');
    expect(getPersonaClipKey('exercise-kneboy')).toBe('/audio/personas/hardcore/exercise-kneboy.mp3');
    expect(getPersonaClipKey('start_321', 'romsdal')).toBe('/audio/personas/romsdal/start_321.mp3');
  });

  it('getPersonaClipKey returnerer null for standard (ingen cuesPath)', () => {
    setActiveCoachPersona('standard');
    expect(getPersonaClipKey('bro-neste')).toBeNull();
    expect(getPersonaClipKey('bro-neste', 'standard')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Planrettelse 3 (B3 β3): splittet stopp-semantikk. Reaktive persona-cues skal
// kun stoppe HØRBAR tale (HTMLAudio-elementet + hørbare bufferkjeder) — full
// audioBufferEngine.stop() er forbeholdt pause/reset-stiene (Directorens
// workout:paused/reset). Uten splitten kansellerte hver reaktive cue (f.eks.
// halfway) Directorens skedulerte lookahead-ankre (last5/start_321/go).
// ---------------------------------------------------------------------------
describe('coachPersonaService – Planrettelse 3 (audible-only stopp for reaktive cues)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('playPersonaCue (bufret sti) stopper kun hørbar lyd — stopAudible, aldri full stop()', async () => {
    vi.spyOn(audioBufferEngine, 'has').mockReturnValue(true);
    vi.spyOn(audioBufferEngine, 'playSequence').mockResolvedValue(true);
    const stopAudibleSpy = vi.spyOn(audioBufferEngine, 'stopAudible').mockImplementation(() => {});
    const stopSpy = vi.spyOn(audioBufferEngine, 'stop').mockImplementation(() => {});

    await expect(playPersonaCue('halfway', 'hardcore')).resolves.toBe(true);

    expect(stopAudibleSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).not.toHaveBeenCalled();
  });

  it('playIntroThenExercise stopper kun hørbar lyd — stopAudible, aldri full stop()', async () => {
    setActiveCoachPersona('hardcore');
    vi.spyOn(audioBufferEngine, 'has').mockReturnValue(true);
    vi.spyOn(audioBufferEngine, 'playSequence').mockResolvedValue(true);
    const stopAudibleSpy = vi.spyOn(audioBufferEngine, 'stopAudible').mockImplementation(() => {});
    const stopSpy = vi.spyOn(audioBufferEngine, 'stop').mockImplementation(() => {});

    await expect(playIntroThenExercise('kneboy')).resolves.toBe(true);

    expect(stopAudibleSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).not.toHaveBeenCalled();
  });

  it('stopCurrentPersonaAudio gjør fortsatt FULL stopp (pause/reset-stien)', () => {
    const stopSpy = vi.spyOn(audioBufferEngine, 'stop').mockImplementation(() => {});

    stopCurrentPersonaAudio();

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('stopAudiblePersonaAudio kaller audioBufferEngine.stopAudible (aldri stop)', () => {
    const stopAudibleSpy = vi.spyOn(audioBufferEngine, 'stopAudible').mockImplementation(() => {});
    const stopSpy = vi.spyOn(audioBufferEngine, 'stop').mockImplementation(() => {});

    stopAudiblePersonaAudio();

    expect(stopAudibleSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).not.toHaveBeenCalled();
  });

  it('plan-testen: halfway-cue mens last5 er skedulert → last5 overlever (integrasjon mot ekte motor)', async () => {
    // Ekte audioBufferEngine (singleton) + mocket AudioContext ved grensen —
    // samme mønster som audioBufferEngine-suiten.
    const HC = '/audio/personas/hardcore';
    interface MockSource {
      buffer: unknown;
      onended: (() => void) | null;
      connect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }
    const sources: MockSource[] = [];
    const ctx = {
      currentTime: 10,
      state: 'running',
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn(async () => ({ duration: 1.0 })),
      createBufferSource: vi.fn((): MockSource => {
        const s: MockSource = { buffer: null, onended: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        sources.push(s);
        return s;
      }),
      createGain: vi.fn(() => ({
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          setValueCurveAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
    };
    vi.spyOn(audioService, 'getContext').mockReturnValue(ctx as unknown as AudioContext);
    vi.spyOn(audioDuckingService, 'startDucking').mockImplementation(() => {});
    vi.spyOn(audioDuckingService, 'stopDucking').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => ({}) }))
    );

    await audioBufferEngine.preload([`${HC}/halfway.mp3`, `${HC}/last5.mp3`]);
    audioBufferEngine.setTimeBridge(1000); // offset = 10 - 1 = 9

    // Directorens lookahead: last5 skedulert 5 s frem (toAudioTime(15000) = 24)
    const last5 = audioBufferEngine.scheduleSequence([`${HC}/last5.mp3`], { startAt: 15000 });
    expect(sources).toHaveLength(1);

    // Reaktiv halfway-cue via persona-tjenesten
    await expect(playPersonaCue('halfway', 'hardcore')).resolves.toBe(true);

    // halfway spiller (ny kilde) — og den skedulerte last5-kjeden er URØRT
    expect(sources).toHaveLength(2);
    expect(sources[0].stop).not.toHaveBeenCalled();

    // Opprydding: fullt stopp løser den skedulerte kjeden
    audioBufferEngine.stop();
    await expect(last5).resolves.toBe(true);
  });
});
