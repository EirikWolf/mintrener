import { TimerState } from '../types/workout';
import { EngineEvent } from '../types/engineEvents';
import { updateMediaSession, clearMediaSession } from './mediaSessionService';

interface MediaSessionSubscriberEngine {
  subscribeEvents(handler: (e: EngineEvent) => void): () => void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): TimerState;
  pause(): void;
  resume(): void;
  skipNext(): void;
  previous(): void;
}

function phaseName(phase: TimerState['phase']): string {
  return phase === 'work' ? 'Jobb' : phase === 'rest' ? 'Pause' : 'Klargjøring';
}

/**
 * Porter av MediaSession-effekten i TimerDisplay.tsx (B3 spec § 4/α4):
 * updateMediaSession ved running/paused, clearMediaSession ellers.
 * TimerState har ingen workout-referanse (kun engine-intern activeWorkout),
 * så albumtittelens workout-navn hentes fra hendelseskanalen i stedet for
 * snapshotet: workout:started (start/skip/resume) OG workout:restored
 * (restore() — planrettelse etter α4-rapportens mappinggap, se timerEngine.ts
 * sin restore()) dekker til sammen alle stier som setter en aktiv økt.
 */
export function createMediaSessionSubscriber(engine: MediaSessionSubscriberEngine): () => void {
  let workoutName = '';
  // Speiler den porterte effektens avhengighetsliste (status/phase/exercise/
  // workoutName/round/totalRounds) — engine.subscribe varsler på ALLE
  // rendringsverdige snapshot-felter (f.eks. hvert hele sekund), så uten
  // denne diffen ville vi kalt updateMediaSession langt oftere enn effekten
  // gjorde. Ufarlig i seg selv (idempotent), men ikke bit-identisk kall-takt.
  let lastKey: string | null = null;

  const unsubEvents = engine.subscribeEvents((event) => {
    if (event.type === 'workout:started' || event.type === 'workout:restored') {
      workoutName = event.workout.name;
    }
  });

  const apply = () => {
    const s = engine.getSnapshot();
    if (s.status === 'running' || s.status === 'paused') {
      const key = JSON.stringify([s.status, s.phase, s.currentExercise?.id, workoutName, s.currentRound, s.totalRounds]);
      if (key === lastKey) return;
      lastKey = key;
      const exerciseTitle = s.currentExercise?.name || workoutName;
      updateMediaSession({
        title: exerciseTitle,
        artist: `Min Trener • ${phaseName(s.phase)}`,
        album: `${workoutName} • Runde ${s.currentRound}/${s.totalRounds}`,
        artworkUrl: s.currentExercise ? `/images/exercises/${s.currentExercise.id}-0.png` : undefined,
        onPlay: () => engine.resume(),
        onPause: () => engine.pause(),
        onNext: () => engine.skipNext(),
        onPrevious: () => engine.previous(),
      });
    } else {
      if (lastKey === 'CLEARED') return;
      lastKey = 'CLEARED';
      clearMediaSession();
    }
  };

  // Kjør umiddelbart ved oppkobling, som den porterte effekten gjorde ved mount.
  apply();
  const unsubSnapshot = engine.subscribe(apply);

  return () => {
    unsubEvents();
    unsubSnapshot();
  };
}
