// PORTINGSREGEL fra useIntervalTimer.test.ts (fasiten for bit-identisk adferd):
//  renderHook(() => useIntervalTimer({workout}))  →  let t = 0; const engine = new TimerEngine(workout, () => t);
//  act(() => result.current.startWorkout())       →  engine.start();
//  vi.advanceTimersByTime(100) + perf-spy         →  t += 100; engine.tick();   (ingen fake timers!)
//  result.current.state                            →  engine.getSnapshot()
//  lyd-spionene                                    →  hendelses-opptak: const events: EngineEvent[] = [];
//                                                     engine.subscribeEvents(e => events.push(e));
import { describe, it, expect } from 'vitest';
import { TimerEngine } from '../timerEngine';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';

describe('TimerEngine – init (karakterisering)', () => {
  it('initialiserer Tabata med riktige verdier', () => {
    const engine = new TimerEngine(TABATA_WORKOUT, () => 0);
    const s = engine.getSnapshot();
    expect(s.status).toBe('idle');
    expect(s.phase).toBe('prepare');
    expect(s.phaseRemainingSeconds).toBe(10);
    expect(s.totalRemainingSeconds).toBe(240);
    expect(s.totalItems).toBe(8);
  });
});
