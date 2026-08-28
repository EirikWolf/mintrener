import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkoutTemplate, TimerState, IntervalPhase } from '../types/workout';
import { audioService } from '../services/audioService';
import { wakeLockService } from '../services/wakeLockService';
import { vibrationService } from '../services/vibrationService';
import { speechService } from '../services/speechService';
import { audioClipService } from '../services/audioClipService';
import { motionTrackerService, MotionMetrics } from '../services/motionTrackerService';
import { saveInterruptedSession, clearInterruptedSession, InterruptedSession } from '../services/sessionRecoveryService';
import {
  playPersonaCue,
  getActiveCoachPersona,
  stopCurrentPersonaAudio,
  preloadPersonaAudio
} from '../services/coachPersonaService';

interface UseIntervalTimerProps {
  workout: WorkoutTemplate;
}

export function useIntervalTimer({ workout }: UseIntervalTimerProps) {
  const [status, setStatus] = useState<TimerState['status']>('idle');
  const [phase, setPhase] = useState<IntervalPhase>('prepare');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentItemIndex, setCurrentItemIndex] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);
  const [wakeLockEnabled, setWakeLockEnabled] = useState<boolean>(true);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const [motionReps, setMotionReps] = useState<number>(0);

  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate>(workout);

  // Millisekund-presisjon tidsstempler
  const [phaseRemaining, setPhaseRemaining] = useState<number>(workout.prepareDurationSeconds);
  const [phaseDuration, setPhaseDuration] = useState<number>(workout.prepareDurationSeconds);
  const [totalElapsed, setTotalElapsed] = useState<number>(0);

  // Refs for loop og tidsstyring uten stale closures
  const stateRef = useRef({
    status,
    phase,
    currentRound,
    currentItemIndex,
    phaseDuration,
    phaseRemaining,
    totalElapsed,
    soundEnabled,
    vibrateEnabled,
    wakeLockEnabled,
    speechEnabled,
    phaseStartTime: 0,
    workoutStartTime: 0,
    lastCountdownBeep: -1,
    firedCues: new Set<string>(),
    workout: activeWorkout,
  });

  stateRef.current.status = status;
  stateRef.current.phase = phase;
  stateRef.current.currentRound = currentRound;
  stateRef.current.currentItemIndex = currentItemIndex;
  stateRef.current.phaseDuration = phaseDuration;
  stateRef.current.phaseRemaining = phaseRemaining;
  stateRef.current.totalElapsed = totalElapsed;
  stateRef.current.soundEnabled = soundEnabled;
  stateRef.current.vibrateEnabled = vibrateEnabled;
  stateRef.current.wakeLockEnabled = wakeLockEnabled;
  stateRef.current.speechEnabled = speechEnabled;
  stateRef.current.workout = activeWorkout;

  // Beregn total estimert tid for hele økten (uten unødvendig pause etter aller siste øvelse)
  const calculateTotalWorkoutSeconds = useCallback(() => {
    const items = activeWorkout?.items || [];
    const rounds = activeWorkout?.rounds || 1;
    const prepareDuration = activeWorkout?.prepareDurationSeconds || 5;
    if (items.length === 0) return prepareDuration;
    let sum = prepareDuration;
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        sum += item.workDurationSeconds;
        const isLastInWorkout = r === rounds - 1 && i === items.length - 1;
        if (!isLastInWorkout) {
          sum += item.restDurationSeconds;
        }
      }
      if (r < rounds - 1) {
        sum += activeWorkout?.roundRestDurationSeconds || 0;
      }
    }
    return sum;
  }, [activeWorkout]);

  const totalWorkoutDuration = calculateTotalWorkoutSeconds();
  const totalRemainingSeconds = Math.max(0, totalWorkoutDuration - totalElapsed);

  // Synkroniser kun når workout-propen faktisk endrer seg i idle-status
  const prevWorkoutRef = useRef(workout);
  useEffect(() => {
    if (prevWorkoutRef.current !== workout) {
      prevWorkoutRef.current = workout;
      setActiveWorkout(workout);
      if (status === 'idle') {
        stateRef.current.workout = workout;
        setPhaseDuration(workout.prepareDurationSeconds);
        setPhaseRemaining(workout.prepareDurationSeconds);
        setCurrentRound(1);
        setCurrentItemIndex(0);
        setPhase('prepare');
        setTotalElapsed(0);
      }
    }
  }, [workout, status]);

  // Sett opp en ny fase
  const setupPhase = useCallback(
    (
      newPhase: IntervalPhase,
      round: number,
      itemIdx: number,
      silent: boolean = false,
      targetWorkout?: WorkoutTemplate
    ) => {
      const isValidTarget = Boolean(targetWorkout && typeof targetWorkout === 'object' && Array.isArray(targetWorkout.items));
      const w = isValidTarget ? (targetWorkout as WorkoutTemplate) : (stateRef.current.workout?.items ? stateRef.current.workout : workout);
      const items = w?.items || [];
      const tone = w?.voiceTone || 'rolig';
      let duration = 0;

      stateRef.current.firedCues = new Set<string>();
      const persona = getActiveCoachPersona();

      if (newPhase === 'prepare') {
        duration = w?.prepareDurationSeconds || 5;
        if (!silent && stateRef.current.speechEnabled) {
          if (persona !== 'standard') {
            playPersonaCue('intro');
            if (duration >= 6) {
              const firstEx = items[0]?.exercise;
              setTimeout(() => {
                if (stateRef.current.phase === 'prepare' && stateRef.current.status === 'running') {
                  if (firstEx) audioClipService.playClipOrFallback('exercise_' + firstEx.id, firstEx.name);
                }
              }, 2300);
            }
          } else {
            speechService.announcePrepare(items[0]?.exercise?.name, tone);
          }
        }
      } else if (newPhase === 'work') {
        duration = items[itemIdx]?.workDurationSeconds || 20;
        if (!silent) {
          if (persona === 'standard') {
            audioService.playWorkStart(stateRef.current.soundEnabled);
            if (stateRef.current.speechEnabled) {
              speechService.announceWork(items[itemIdx]?.exercise?.name, tone);
            }
          }
          vibrationService.workStart(stateRef.current.vibrateEnabled);
        }

        // Start bevegelsessporing
        motionTrackerService.start((m: MotionMetrics) => {
          setMotionReps(m.count);
        }, 'hopp');
      } else if (newPhase === 'rest') {
        duration = items[itemIdx]?.restDurationSeconds || 10;
        if (!silent) {
          audioService.playRestStart(stateRef.current.soundEnabled);
          vibrationService.restStart(stateRef.current.vibrateEnabled);
          if (stateRef.current.speechEnabled) {
            const nextEx = items[itemIdx + 1]?.exercise;
            if (persona === 'standard') {
              speechService.announceRest(nextEx?.name, tone);
            } else if (nextEx) {
              audioClipService.playClipOrFallback('exercise_' + nextEx.id, 'Neste: ' + nextEx.name);
            }
          }
        }
        motionTrackerService.stop();
      } else if (newPhase === 'round_rest') {
        duration = w?.roundRestDurationSeconds || 30;
        if (!silent) {
          audioService.playRestStart(stateRef.current.soundEnabled);
          vibrationService.restStart(stateRef.current.vibrateEnabled);
          if (stateRef.current.speechEnabled) {
            const nextEx = items[0]?.exercise;
            if (persona === 'standard') {
              speechService.announceRest(nextEx?.name, tone);
            } else if (nextEx) {
              audioClipService.playClipOrFallback('exercise_' + nextEx.id, 'Neste: ' + nextEx.name);
            }
          }
        }
        motionTrackerService.stop();
      } else if (newPhase === 'complete') {
        duration = 0;
        if (!silent) {
          if (persona !== 'standard') {
            playPersonaCue('finish');
          } else {
            audioService.playWorkoutComplete(stateRef.current.soundEnabled);
            if (stateRef.current.speechEnabled) {
              speechService.announceComplete(tone);
            }
          }
          vibrationService.workoutComplete(stateRef.current.vibrateEnabled);
        }
        motionTrackerService.stop();
        wakeLockService.releaseLock();
      }

      setPhase(newPhase);
      setCurrentRound(round);
      setCurrentItemIndex(itemIdx);
      setPhaseDuration(duration);
      setPhaseRemaining(duration);

      stateRef.current.phase = newPhase;
      stateRef.current.currentRound = round;
      stateRef.current.currentItemIndex = itemIdx;
      stateRef.current.phaseDuration = duration;
      stateRef.current.phaseRemaining = duration;
      stateRef.current.phaseStartTime = Date.now();
      stateRef.current.lastCountdownBeep = -1;

      if (newPhase === 'complete') {
        setStatus('completed');
        stateRef.current.status = 'completed';
        clearInterruptedSession();
      }
    },
    [workout]
  );

  // Gå til neste logiske fase
  const advanceToNextPhase = useCallback(() => {
    const { phase: currentPhase, currentRound: r, currentItemIndex: idx, workout: w } = stateRef.current;

    if (currentPhase === 'prepare') {
      setupPhase('work', 1, 0);
    } else if (currentPhase === 'work') {
      const isLastItem = idx + 1 >= w.items.length;
      const isLastRound = r >= w.rounds;

      // Hvis dette var siste øvelse i siste runde, fullfør økten umiddelbart
      if (isLastItem && isLastRound) {
        setupPhase('complete', r, idx);
      } else {
        const item = w.items[idx];
        if (item && item.restDurationSeconds > 0) {
          setupPhase('rest', r, idx);
        } else {
          // Hopp direkte til neste øvelse hvis 0 sekunders pause
          if (idx + 1 < w.items.length) {
            setupPhase('work', r, idx + 1);
          } else if (r < w.rounds) {
            if (w.roundRestDurationSeconds > 0) {
              setupPhase('round_rest', r, 0);
            } else {
              setupPhase('work', r + 1, 0);
            }
          }
        }
      }
    } else if (currentPhase === 'rest') {
      if (idx + 1 < w.items.length) {
        setupPhase('work', r, idx + 1);
      } else if (r < w.rounds) {
        if (w.roundRestDurationSeconds > 0) {
          setupPhase('round_rest', r, 0);
        } else {
          setupPhase('work', r + 1, 0);
        }
      } else {
        setupPhase('complete', r, idx);
      }
    } else if (currentPhase === 'round_rest') {
      setupPhase('work', r + 1, 0);
    }
  }, [setupPhase]);

  // Hopp over eller gå tilbake manuelt
  const skipNext = useCallback(() => {
    if (status === 'completed') return;
    advanceToNextPhase();
  }, [status, advanceToNextPhase]);

  const previous = useCallback(() => {
    if (status === 'completed' || status === 'idle') return;
    const { phase: currentPhase, currentRound: r, currentItemIndex: idx, workout: w } = stateRef.current;

    if (currentPhase === 'work') {
      if (idx > 0) {
        setupPhase('work', r, idx - 1);
      } else if (r > 1) {
        setupPhase('work', r - 1, w.items.length - 1);
      } else {
        setupPhase('prepare', 1, 0);
      }
    } else if (currentPhase === 'rest') {
      setupPhase('work', r, idx);
    } else if (currentPhase === 'round_rest') {
      setupPhase('work', r, w.items.length - 1);
    }
  }, [status, setupPhase]);

  // Hoved-timerloop basert på deterministiske tidsstempler (kjører i bakgrunn)
  useEffect(() => {
    if (status !== 'running') {
      return;
    }

    const tick = () => {
      const now = Date.now();
      const phaseElapsed = (now - stateRef.current.phaseStartTime) / 1000;
      const remaining = Math.max(0, stateRef.current.phaseDuration - phaseElapsed);

      setPhaseRemaining(remaining);
      const totalElapsedSec = (now - stateRef.current.workoutStartTime) / 1000;
      setTotalElapsed(Math.max(0, totalElapsedSec));

      const wholeSecondsLeft = Math.ceil(remaining);
      const persona = getActiveCoachPersona();
      const phaseElapsedSec = Math.floor(phaseElapsed);
      const halfwaySec = Math.floor(stateRef.current.phaseDuration / 2);

      // 3 - 2 - 1 Nedtelling fra treneren under prepare, rest og round_rest (starter 3.5s før arbeid)
      if (
        persona !== 'standard' &&
        (stateRef.current.phase === 'prepare' || stateRef.current.phase === 'rest' || stateRef.current.phase === 'round_rest') &&
        remaining <= 3.5 &&
        !stateRef.current.firedCues.has('start_321') &&
        stateRef.current.speechEnabled
      ) {
        stateRef.current.firedCues.add('start_321');
        playPersonaCue('start_321');
      }

      // Halvveis persona-cue
      if (
        persona !== 'standard' &&
        stateRef.current.phase === 'work' &&
        stateRef.current.phaseDuration >= 15 &&
        phaseElapsedSec === halfwaySec &&
        !stateRef.current.firedCues.has('halfway') &&
        stateRef.current.speechEnabled
      ) {
        stateRef.current.firedCues.add('halfway');
        playPersonaCue('halfway');
      }

      // Sjekk for elektronisk 3 - 2 - 1 nedtellingspip (kun i standard-modus for å unngå kollisjon med stemmen)
      if (
        persona === 'standard' &&
        wholeSecondsLeft <= 3 &&
        wholeSecondsLeft >= 1 &&
        wholeSecondsLeft !== stateRef.current.lastCountdownBeep &&
        stateRef.current.phaseDuration >= 4
      ) {
        stateRef.current.lastCountdownBeep = wholeSecondsLeft;
        audioService.playCountdownBeep(stateRef.current.soundEnabled);
        vibrationService.countdown(stateRef.current.vibrateEnabled);
      }

      // Hvis fasen er utløpt, gå automatisk videre til neste fase
      if (remaining <= 0) {
        advanceToNextPhase();
      } else if (stateRef.current.status === 'running' && wholeSecondsLeft % 2 === 0) {
        saveInterruptedSession({
          workout: stateRef.current.workout,
          phase: stateRef.current.phase,
          currentRound: stateRef.current.currentRound,
          currentItemIndex: stateRef.current.currentItemIndex,
          totalElapsedSeconds: Math.floor(stateRef.current.totalElapsed),
        });
      }
    };

    // 100ms interval for responsiv oppdatering
    const intervalId = window.setInterval(tick, 100);

    // Visibility-opphenting når skjermen vekkes fra dvale
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && stateRef.current.status === 'running') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, advanceToNextPhase]);

  // Kontrollfunksjoner
  const startWorkout = useCallback(
    async (explicitWorkout?: WorkoutTemplate | unknown) => {
      const isValidTarget = Boolean(
        explicitWorkout &&
        typeof explicitWorkout === 'object' &&
        'items' in explicitWorkout &&
        Array.isArray((explicitWorkout as WorkoutTemplate).items)
      );
      const targetWorkout = isValidTarget ? (explicitWorkout as WorkoutTemplate) : stateRef.current.workout;
      stateRef.current.workout = targetWorkout;
      setActiveWorkout(targetWorkout);

      preloadPersonaAudio();
      await audioService.unlockAudio();
      speechService.init();
      if (stateRef.current.wakeLockEnabled) {
        await wakeLockService.requestLock();
      }

      stateRef.current.phaseStartTime = Date.now();
      stateRef.current.workoutStartTime = Date.now();
      stateRef.current.status = 'running';
      setStatus('running');

      setupPhase('prepare', 1, 0, false, targetWorkout);
    },
    [setupPhase]
  );

  const pauseWorkout = useCallback(() => {
    setStatus('paused');
    stopCurrentPersonaAudio();
    wakeLockService.releaseLock();
    saveInterruptedSession({
      workout: stateRef.current.workout,
      phase: stateRef.current.phase,
      currentRound: stateRef.current.currentRound,
      currentItemIndex: stateRef.current.currentItemIndex,
      totalElapsedSeconds: Math.floor(stateRef.current.totalElapsed),
    });
  }, []);

  const resumeWorkout = useCallback(async () => {
    await audioService.unlockAudio();
    speechService.init();
    if (stateRef.current.wakeLockEnabled) {
      await wakeLockService.requestLock();
    }

    // Juster phaseStartTime slik at resterende tid bevares nøyaktig
    const currentRemaining = stateRef.current.phaseRemaining;
    stateRef.current.phaseStartTime = Date.now() - (stateRef.current.phaseDuration - currentRemaining) * 1000;
    setStatus('running');
  }, []);

  const resetWorkout = useCallback(() => {
    setStatus('idle');
    stopCurrentPersonaAudio();
    wakeLockService.releaseLock();
    clearInterruptedSession();
    setupPhase('prepare', 1, 0, true); // silent reset!
    setTotalElapsed(0);
    setPhaseRemaining(stateRef.current.workout?.prepareDurationSeconds || 5);
    setPhaseDuration(stateRef.current.workout?.prepareDurationSeconds || 5);
  }, [setupPhase]);

  const restoreSession = useCallback((session: InterruptedSession) => {
    setupPhase(session.phase, session.currentRound, session.currentItemIndex);
    setTotalElapsed(session.totalElapsedSeconds);
    setStatus('paused');
  }, [setupPhase]);

  const toggleLock = useCallback(() => {
    setIsLocked((prev) => !prev);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const toggleVibrate = useCallback(() => {
    setVibrateEnabled((prev) => !prev);
  }, []);

  const toggleWakeLock = useCallback(() => {
    setWakeLockEnabled((prev) => {
      const next = !prev;
      if (!next) {
        wakeLockService.releaseLock();
      } else if (stateRef.current.status === 'running') {
        wakeLockService.requestLock();
      }
      return next;
    });
  }, []);

  // Nåværende og neste øvelse
  const workoutItems = activeWorkout?.items || [];
  const currentItem = workoutItems[currentItemIndex] || workoutItems[0];
  const nextItem =
    currentItemIndex + 1 < workoutItems.length
      ? workoutItems[currentItemIndex + 1]
      : currentRound < (activeWorkout?.rounds || 1)
      ? workoutItems[0]
      : null;

  const currentExercise = currentItem ? currentItem.exercise : null;
  const nextExercise = nextItem ? nextItem.exercise : null;

  const phaseProgress = phaseDuration > 0 ? (phaseDuration - phaseRemaining) / phaseDuration : 1;

  const timerState: TimerState = {
    status,
    phase,
    currentRound,
    totalRounds: activeWorkout?.rounds || 1,
    currentItemIndex,
    totalItems: workoutItems.length,
    currentExercise,
    nextExercise,
    phaseRemainingSeconds: Math.ceil(phaseRemaining),
    phaseTotalSeconds: phaseDuration,
    phaseProgress,
    totalRemainingSeconds: Math.ceil(totalRemainingSeconds),
    totalElapsedSeconds: Math.floor(totalElapsed),
    isLocked,
    soundEnabled,
    vibrateEnabled,
    wakeLockEnabled,
    speechEnabled,
    motionReps,
  };

  const toggleSpeech = useCallback(() => {
    setSpeechEnabled((prev) => {
      const next = !prev;
      speechService.setEnabled(next);
      return next;
    });
  }, []);

  return {
    state: timerState,
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
  };
}
