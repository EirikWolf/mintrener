// Oppgave B (live timing-funn B, kaldstart): i aller første klargjøring rakk
// ikke persona-preloaden å dekode bufferne før planLookahead kjørte —
// scheduleSequence svarte false (ucachet) og intro/go degraderte til pip i
// fase 1. Hooken skal derfor re-planlegge inneværende fases lookahead via
// Directorens replanCurrentPhase() når preload-promiset løses.
//
// Egen fil med vilje: fasit-filen useIntervalTimer.test.ts (23 tester) skal
// stå uendret. NB: ingen vi.restoreAllMocks() i afterEach — samme singleton-
// forbehold som fasit-filen dokumenterer (mock-implementasjonene fra
// src/test/setup.ts deles på tvers av testene).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntervalTimer } from '../useIntervalTimer';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';
import { audioBufferEngine } from '../../services/audioBufferEngine';
import { audioClipService } from '../../services/audioClipService';
import * as coachPersonaService from '../../services/coachPersonaService';

// telemetryService importerer ../firebase (kaster uten .env.local ved modul-
// load) — mock hele modulen, samme mønster som fasit-filen.
vi.mock('../../services/telemetryService', () => ({
  recordPerfTelemetry: vi.fn().mockResolvedValue(undefined),
}));

const HC = '/audio/personas/hardcore';

describe('useIntervalTimer – replan når persona-preload fullfører (kaldstart, funn B)', () => {
  let resolvePreload: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    coachPersonaService.setActiveCoachPersona('hardcore');
    // Kontrollerbart preload-promise: testene bestemmer NÅR dekodingen «blir ferdig»
    vi.spyOn(coachPersonaService, 'preloadPersonaAudio').mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePreload = resolve;
      })
    );
    vi.spyOn(audioClipService, 'preloadClips').mockImplementation(() => {});
    vi.spyOn(coachPersonaService, 'playIntroThenExercise').mockResolvedValue(true);
    // Kaldstart-tilstanden: ingenting cachet ennå → lookahead svarer false
    vi.spyOn(audioBufferEngine, 'scheduleSequence').mockResolvedValue(false);
    vi.spyOn(audioBufferEngine, 'cancelScheduled').mockImplementation(() => {});
    vi.spyOn(audioBufferEngine, 'setTimeBridge').mockImplementation(() => {});
  });

  afterEach(() => {
    coachPersonaService.setActiveCoachPersona('standard');
    localStorage.clear();
  });

  it('preload som fullfører ETTER fasestart re-planlegger fase 1 sin lookahead', async () => {
    const scheduleSpy = vi.mocked(audioBufferEngine.scheduleSequence);
    const cancelSpy = vi.mocked(audioBufferEngine.cancelScheduled);

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });

    // Kaldstart: fase 1 (prepare) sin lookahead ble utstedt, men feilet (false)
    expect(scheduleSpy).toHaveBeenCalledWith([`${HC}/start_321.mp3`], {
      endAt: expect.any(Number),
    });
    const originalDeadline = (
      scheduleSpy.mock.calls.find(([keys]) => keys[0] === `${HC}/start_321.mp3`)?.[1] as {
        endAt: number;
      }
    ).endAt;
    scheduleSpy.mockClear();
    cancelSpy.mockClear();
    scheduleSpy.mockResolvedValue(true); // bufferne er nå dekodet

    await act(async () => {
      resolvePreload();
    });

    // Replan: kanseller først (aldri dobbel-skedulering), re-utsted mot samme frist
    expect(cancelSpy).toHaveBeenCalled();
    expect(scheduleSpy).toHaveBeenCalledWith([`${HC}/start_321.mp3`], {
      endAt: originalDeadline,
    });
    expect(scheduleSpy).toHaveBeenCalledWith([`${HC}/go-1.mp3`], {
      startAt: originalDeadline,
    });
  });

  it('preload som fullfører etter reset re-planlegger ingenting (status-guard)', async () => {
    const scheduleSpy = vi.mocked(audioBufferEngine.scheduleSequence);
    const cancelSpy = vi.mocked(audioBufferEngine.cancelScheduled);

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });
    act(() => {
      result.current.resetWorkout();
    });
    scheduleSpy.mockClear();
    cancelSpy.mockClear();

    await act(async () => {
      resolvePreload();
    });

    expect(cancelSpy).not.toHaveBeenCalled();
    expect(scheduleSpy).not.toHaveBeenCalled();
  });
});
