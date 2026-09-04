import { describe, it, expect } from 'vitest';
import { TimerEngine } from '../timerEngine';
import { WorkoutTemplate } from '../../types/workout';

describe('TimerEngine Benchmark – Klokkedrift & Ytelse under CPU-throttling (Revisjon C)', () => {
  const dummyWorkout: WorkoutTemplate = {
    id: 'benchmark-workout',
    name: 'Benchmark Workout',
    description: 'Benchmark test økt',
    type: 'custom',
    rounds: 2,
    prepareDurationSeconds: 5,
    roundRestDurationSeconds: 15,
    items: [
      {
        id: 'bench-item-1',
        exercise: { id: 'push-ups', name: 'Armhevinger', category: 'bodyweight' },
        workDurationSeconds: 30,
        restDurationSeconds: 10,
      },
      {
        id: 'bench-item-2',
        exercise: { id: 'kneboy', name: 'Knebøy', category: 'bodyweight' },
        workDurationSeconds: 30,
        restDurationSeconds: 10,
      },
    ],
  };

  it('akkumulerer null tidsdrift (< 50 ms) under uregelmessige ticks (50-250 ms jitter)', () => {
    let mockTime = 100000;
    const now = () => mockTime;
    const engine = new TimerEngine(dummyWorkout, now);

    engine.start();

    // Simuler 60 sekunders løp med variabel CPU-throttling og uregelmessige ticks
    const targetSimulatedSeconds = 60;
    const startTime = mockTime;
    let tickCount = 0;

    while ((mockTime - startTime) / 1000 < targetSimulatedSeconds) {
      // Variabel forsinkelse mellom 30ms og 250ms (simulerer bakgrunnstasking og mobil-throttling)
      const jitterMs = 30 + Math.floor(Math.sin(tickCount) * 100 + 110);
      mockTime += jitterMs;
      tickCount++;
      engine.tick();
    }

    const elapsedInEngine = engine.getExactTotalElapsedSeconds();
    const realWallElapsed = (mockTime - startTime) / 1000;

    // Motoren skal matche nøyaktig med veggklokkens nåværende tidsforløp (null akkumulert drift)
    const driftSeconds = Math.abs(elapsedInEngine - realWallElapsed);
    expect(driftSeconds).toBeLessThan(0.001); // 1 ms presisjon
  });

  it('gjenoppretter presis posisjon og fase etter dvale/bakgrunnsfrysing (Sleep catch-up)', () => {
    let mockTime = 500000;
    const now = () => mockTime;
    const engine = new TimerEngine(dummyWorkout, now);

    engine.start();
    engine.tick(); // Startet i prepare (5 sek)

    // Simuler at mobilen låses og ligger i lomma i 42 sekunder
    mockTime += 42000;
    engine.tick();

    const snapshot = engine.getSnapshot();
    // Tidsforløpet skal være nøyaktig 42 sekunder
    expect(snapshot.totalElapsedSeconds).toBeCloseTo(42, 1);

    // 5s prepare + 30s work (item 1) = 35s. 42s betyr at vi er 7 sekunder inn i rest (10s total)
    expect(snapshot.phase).toBe('rest');
    expect(snapshot.currentItemIndex).toBe(0);
    expect(snapshot.phaseRemainingSeconds).toBe(3); // 10s - 7s = 3s
  });
});
