import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { WorkoutTemplate } from '../types/workout';
import { TimerEngine } from '../services/timerEngine';
import { createAudioDirector, AudioDirectorHandle } from '../services/audioDirector';
import { createVibrationSubscriber } from '../services/vibrationSubscriber';
import { createPersistenceSubscriber } from '../services/persistenceSubscriber';
import { createMediaSessionSubscriber } from '../services/mediaSessionSubscriber';
import { createTicker } from '../services/tickerService';
import { audioService } from '../services/audioService';
import { wakeLockService } from '../services/wakeLockService';
import { speechService } from '../services/speechService';
import { flagsForSoundLevel, type SoundLevel } from '../services/soundLevelService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { audioClipService } from '../services/audioClipService';
import { InterruptedSession } from '../services/sessionRecoveryService';
import { perfMonitorService } from '../services/perfMonitorService';
import { recordPerfTelemetry } from '../services/telemetryService';
import { preloadPersonaAudio } from '../services/coachPersonaService';

interface UseIntervalTimerProps {
  workout: WorkoutTemplate;
}

/**
 * Tynt React-bind over TimerEngine (B3 spec § 3, plan Task α5). Fasemaskinen,
 * cue-gatingen og render-gatingen (A3) bor i motoren; lyd/vibrasjon/persistens/
 * MediaSession bor i abonnentene (α4). Hooken eier KUN det som krever
 * nettleser-/React-kontekst: ticker + visibilitychange, async-oppstarten
 * (unlockAudio/speech-init/preloads), wake lock og perf-rapportering.
 * Offentlig API er identisk med før uttrekket.
 */
export function useIntervalTimer({ workout }: UseIntervalTimerProps) {
  // Én motorinstans per hook-montering. getSnapshot/subscribe er konstruktør-
  // bundet i motoren, så referansene er trygge å sende ubundet til React.
  const engineRef = useRef<TimerEngine | null>(null);
  if (!engineRef.current) engineRef.current = new TimerEngine(workout);
  const engine = engineRef.current;

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  // Speil av motorens interne activeWorkout (snapshotet bærer ingen workout-
  // referanse): trengs som fallback når startWorkout() kalles uten argument —
  // preloadClips må vite HVILKEN økt som starter før motoren får start()-kallet.
  // Oppdateres på nøyaktig de samme stiene som motoren bytter activeWorkout
  // (konstruktør, idle-prop-sync, start), så speilet driver aldri fra motoren.
  const activeWorkoutRef = useRef(workout);

  // Idle-sync av workout-propen — samme semantikk som før (motoren ignorerer
  // bytte utenfor idle, coherent-by-design; se timerEngine.setWorkout).
  useEffect(() => {
    if (engine.getSnapshot().status === 'idle') {
      activeWorkoutRef.current = workout;
    }
    engine.setWorkout(workout);
  }, [workout, engine]);

  // Låseskjerm-kontrollene (V1, PR-α-review): play/pause fra MediaSession må gå
  // via HOOKENS resumeWorkout/pauseWorkout (audio-unlock/speech-init/wake lock)
  // — ikke rene engine-kall. Abonnent-effekten monteres før callbackene er
  // garantert stabile, så abonnenten leser ferskeste versjon via ref ved
  // invokasjon i stedet for å fange en potensielt foreldet closure.
  const mediaControlsRef = useRef<{ pause: () => void; resume: () => Promise<void> }>({
    pause: () => {},
    resume: async () => {},
  });

  // Abonnentene kobles fra FØRSTE commit — altså før noe startWorkout-kall kan
  // skje (callbacks er ubrukelige før render). Viktig: MediaSession-abonnenten
  // fanger øktnavnet fra workout:started/restored — en sent koblet abonnent
  // ville mistet det.
  // Directorens handle holdes i ref: startWorkout trenger replanCurrentPhase
  // (kaldstart-replan, Oppgave B) etter at preload-promiset løses — lenge etter
  // at abonnent-effekten monterte den.
  const audioDirectorRef = useRef<AudioDirectorHandle | null>(null);

  useEffect(() => {
    // β4: AudioDirector er ENESTE lydabonnent (spec § 4) — erstatter
    // LegacyAudioAdapter fra α4. Kobles som resten FØR noe start()-kall kan
    // skje, så workout:started (tidsbro-målingen) aldri går tapt.
    const audioDirector = createAudioDirector(engine);
    audioDirectorRef.current = audioDirector;
    const subs = [
      audioDirector.unsubscribe,
      createVibrationSubscriber(engine),
      createPersistenceSubscriber(engine),
      createMediaSessionSubscriber(engine, {
        onPlay: () => void mediaControlsRef.current.resume(),
        onPause: () => mediaControlsRef.current.pause(),
      }),
    ];
    return () => {
      audioDirectorRef.current = null;
      subs.forEach((unsubscribe) => unsubscribe());
    };
  }, [engine]);

  // Ticker (worker-metronom med setInterval-fallback) + visibility-opphenting.
  // Drift-sjekken (A6) bor inni engine.tick() selv, og tick() gater internt på
  // status — et rent tick()-kall her er alt som trengs på begge stiene.
  useEffect(() => {
    if (state.status !== 'running') return;
    const ticker = createTicker(() => engine.tick());
    ticker.start();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') engine.tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      ticker.stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [state.status, engine]);

  // Fullførings-sideeffektene fra hookens gamle setupPhase('complete'):
  // wake lock slippes, og perf-målingen startet i startWorkout brakketteres og
  // rapporteres fire-and-forget (A5, audit § 9.4/§ 7.3) — telemetri skal aldri
  // blokkere eller forsinke fullførings-UI-en.
  useEffect(() => {
    if (state.status !== 'completed') return;
    wakeLockService.releaseLock();
    const perfReport = perfMonitorService.stopWorkoutMonitoring();
    if (perfReport) {
      void recordPerfTelemetry(perfReport);
    }
  }, [state.status]);

  const startWorkout = useCallback(
    async (explicitWorkout?: WorkoutTemplate | unknown) => {
      // Samme defensive validering som før — UI-lag kan sende hendelsesobjekter.
      const isValidTarget = Boolean(
        explicitWorkout &&
        typeof explicitWorkout === 'object' &&
        'items' in explicitWorkout &&
        Array.isArray((explicitWorkout as WorkoutTemplate).items)
      );
      const targetWorkout = isValidTarget ? (explicitWorkout as WorkoutTemplate) : activeWorkoutRef.current;
      activeWorkoutRef.current = targetWorkout;

      // A5: brakketterer denne ene økten for ytelsesmåling — se fullførings-
      // effekten over og resetWorkout (avbrudd = forkastet rapport).
      perfMonitorService.startWorkoutMonitoring();
      const personaPreload = preloadPersonaAudio();
      // Forhåndslast øktens øvelsesannonseringer så første avspilling ikke
      // betaler nettverks- og dekodekostnaden midt i en faseovergang.
      audioClipService.preloadClips(
        (targetWorkout?.items || []).map((it) => 'exercise-' + it.exercise.id)
      );
      await audioService.unlockAudio();
      speechService.init();
      if (engine.getSnapshot().wakeLockEnabled) {
        await wakeLockService.requestLock();
      }
      engine.start(targetWorkout);
      // Kaldstart-replan (Oppgave B, live timing-funn B): rekker ikke preloaden
      // å dekode bufferne før første fases planLookahead, degraderer fase 1 til
      // pip — re-planlegg inneværende fases lookahead når dekodingen fullfører.
      // Registreres ETTER engine.start så replan aldri kan løpe før økten er i
      // gang; Directoren guarder selv på status/aktiv fase (no-op etter reset).
      // Promise.resolve-innpakningen tåler at testdobler mocker preloaden uten
      // returverdi; promiset rejecter aldri (preload-kontrakten).
      void Promise.resolve(personaPreload).then(() =>
        audioDirectorRef.current?.replanCurrentPhase()
      );
    },
    [engine]
  );

  const pauseWorkout = useCallback(() => {
    engine.pause();
    wakeLockService.releaseLock();
  }, [engine]);

  const resumeWorkout = useCallback(async () => {
    await audioService.unlockAudio();
    speechService.init();
    if (engine.getSnapshot().wakeLockEnabled) {
      await wakeLockService.requestLock();
    }
    engine.resume();
  }, [engine]);

  // Hold ref-en fersk hvert render — invokasjoner skjer alltid etter commit.
  mediaControlsRef.current = { pause: pauseWorkout, resume: resumeWorkout };

  const resetWorkout = useCallback(() => {
    // A5: reset er en avbrutt økt — stopp målingen, men forkast rapporten
    // bevisst (ingen recordPerfTelemetry). Trygt no-op hvis økten allerede ble
    // fullført (fullførings-effekten stoppet den) eller aldri startet.
    perfMonitorService.stopWorkoutMonitoring();
    engine.reset();
    // Speil motorens M1-adferd: reset() tar et ventende workout-bytte fra
    // propen (setWorkout utenfor idle lagret det kun) — workout-dep'en holder
    // closuren fersk, akkurat som gamle hookens resetWorkout([setupPhase →
    // workout])-kjede gjorde.
    activeWorkoutRef.current = workout;
    wakeLockService.releaseLock();
  }, [engine, workout]);

  const restoreSession = useCallback((session: InterruptedSession) => {
    engine.restore(session);
  }, [engine]);

  const skipNext = useCallback(() => engine.skipNext(), [engine]);
  const previous = useCallback(() => engine.previous(), [engine]);

  const toggleLock = useCallback(() => {
    engine.setLocked(!engine.getSnapshot().isLocked);
  }, [engine]);

  const toggleSound = useCallback(() => {
    engine.setSoundEnabled(!engine.getSnapshot().soundEnabled);
  }, [engine]);

  const toggleVibrate = useCallback(() => {
    engine.setVibrateEnabled(!engine.getSnapshot().vibrateEnabled);
  }, [engine]);

  const toggleWakeLock = useCallback(() => {
    const snap = engine.getSnapshot();
    const next = !snap.wakeLockEnabled;
    engine.setWakeLockEnabled(next);
    // Service-sideeffekten eies av hooken (motoren holder kun flagget): slipp
    // låsen umiddelbart ved av-skru; be om ny kun når en økt faktisk kjører.
    if (!next) {
      wakeLockService.releaseLock();
    } else if (snap.status === 'running') {
      wakeLockService.requestLock();
    }
  }, [engine]);

  // Setter begge bryterne i ett grep. Nivåene er navngitte kombinasjoner —
  // se soundLevelService for hvorfor to uavhengige brytere ikke var et valg.
  const setSoundLevel = useCallback(
    (level: SoundLevel, { erBrukerensValg = true } = {}) => {
      if (erBrukerensValg) {
        localStorage.setItem(STORAGE_KEYS.SOUND_LEVEL_CHOSEN, 'true');
      }
      const { soundEnabled, speechEnabled } = flagsForSoundLevel(level);
      engine.setSoundEnabled(soundEnabled);
      engine.setSpeechEnabled(speechEnabled);
      speechService.setEnabled(speechEnabled);
    },
    [engine]
  );

  const toggleSpeech = useCallback(() => {
    const next = !engine.getSnapshot().speechEnabled;
    engine.setSpeechEnabled(next);
    speechService.setEnabled(next);
  }, [engine]);

  const setCountdownDurationSeconds = useCallback(
    (seconds: 3 | 5) => {
      engine.setCountdownDurationSeconds(seconds);
    },
    [engine]
  );

  const setCountdownAudioStyle = useCallback(
    (style: 'beep' | 'buzzer') => {
      engine.setCountdownAudioStyle(style);
    },
    [engine]
  );

  return {
    state,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    resetWorkout,
    restoreSession,
    skipNext,
    previous,
    toggleLock,
    toggleSound,
    toggleVibrate,
    toggleWakeLock,
    toggleSpeech,
    setSoundLevel,
    setCountdownDurationSeconds,
    setCountdownAudioStyle,
  };
}
