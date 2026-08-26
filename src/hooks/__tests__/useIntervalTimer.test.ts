import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntervalTimer } from '../useIntervalTimer';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';
import { audioService } from '../../services/audioService';
import { wakeLockService } from '../../services/wakeLockService';

describe('useIntervalTimer Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialiserer Tabata-økt med riktige verdier (4:00 totaltid, 10s klargjøring)', () => {
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.phase).toBe('prepare');
    expect(result.current.state.phaseRemainingSeconds).toBe(10);
    // Tabata: 10s prepare + 7 * (20s + 10s) + 20s = 240s = 04:00
    expect(result.current.state.totalRemainingSeconds).toBe(240);
    expect(result.current.state.totalRounds).toBe(1);
    expect(result.current.state.totalItems).toBe(8);
  });

  it('starter økten, låser opp lyd og aktiverer Wake Lock', async () => {
    const unlockSpy = vi.spyOn(audioService, 'unlockAudio');
    const lockSpy = vi.spyOn(wakeLockService, 'requestLock');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });

    expect(result.current.state.status).toBe('running');
    expect(unlockSpy).toHaveBeenCalledTimes(1);
    expect(lockSpy).toHaveBeenCalledTimes(1);
  });

  it('pauser økten og slipper Wake Lock', async () => {
    const releaseSpy = vi.spyOn(wakeLockService, 'releaseLock');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });

    act(() => {
      result.current.pauseWorkout();
    });

    expect(result.current.state.status).toBe('paused');
    expect(releaseSpy).toHaveBeenCalledTimes(1);
  });

  it('hopper gjennom faser ved skipNext (prepare -> work 1 -> rest 1 -> work 2)', async () => {
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });

    // 1. Fra prepare til work (Knebøy)
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.state.phase).toBe('work');
    expect(result.current.state.currentItemIndex).toBe(0);
    expect(result.current.state.currentExercise?.name).toBe('Knebøy');
    expect(result.current.state.phaseTotalSeconds).toBe(20);

    // 2. Fra work til rest
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.phaseTotalSeconds).toBe(10);

    // 3. Fra rest til work (Push-ups)
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.state.phase).toBe('work');
    expect(result.current.state.currentItemIndex).toBe(1);
    expect(result.current.state.currentExercise?.name).toBe('Push-ups');
    expect(result.current.state.phaseTotalSeconds).toBe(20);
  });

  it('fullfører økten umiddelbart etter siste arbeidsintervall er over', async () => {
    const completeSpy = vi.spyOn(audioService, 'playWorkoutComplete');
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });

    // Hopp over prepare (1)
    act(() => {
      result.current.skipNext();
    });

    // 7 første øvelser (arbeid + hvile)
    for (let i = 0; i < 7; i++) {
      act(() => {
        result.current.skipNext(); // arbeid
      });
      act(() => {
        result.current.skipNext(); // hvile
      });
    }

    // 8. øvelse (siste arbeid)
    act(() => {
      result.current.skipNext();
    });

    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.phase).toBe('complete');
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });
});
