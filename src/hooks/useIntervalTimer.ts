import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkoutTemplate, TimerState, IntervalPhase } from '../types/workout';
import { audioService } from '../services/audioService';
import { wakeLockService } from '../services/wakeLockService';
import { vibrationService } from '../services/vibrationService';
import { speechService } from '../services/speechService';
import { motionTrackerService, MotionMetrics } from '../services/motionTrackerService';

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
    workout,
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
  stateRef.current.workout = workout;

  const animFrameRef = useRef<number | null>(null);

  // Beregn total estimert tid for hele økten (uten unødvendig pause etter aller siste øvelse)
  const calculateTotalWorkoutSeconds = useCallback(() => {
    if (workout.items.length === 0) return workout.prepareDurationSeconds;
    let sum = workout.prepareDurationSeconds;
    for (let r = 0; r < workout.rounds; r++) {
      for (let i = 0; i < workout.items.length; i++) {
        const item = workout.items[i];
        sum += item.workDurationSeconds;
        const isLastInWorkout = r === workout.rounds - 1 && i === workout.items.length - 1;
        if (!isLastInWorkout) {
          sum += item.restDurationSeconds;
        }
      }
      if (r < workout.rounds - 1) {
        sum += workout.roundRestDurationSeconds;
      }
    }
    return sum;
  }, [workout]);

  const totalWorkoutDuration = calculateTotalWorkoutSeconds();
  const totalRemainingSeconds = Math.max(0, totalWorkoutDuration - totalElapsed);

  // Sett opp en ny fase
  const setupPhase = useCallback(
    (newPhase: IntervalPhase, round: number, itemIdx: number) => {
      const w = stateRef.current.workout;
      let duration = 0;

      if (newPhase === 'prepare') {
        duration = w.prepareDurationSeconds;
        speechService.announcePrepare(w.items[0]?.exercise.name);
      } else if (newPhase === 'work') {
        duration = w.items[itemIdx]?.workDurationSeconds || 20;
        audioService.playWorkStart(stateRef.current.soundEnabled);
        vibrationService.workStart(stateRef.current.vibrateEnabled);
        speechService.announceWork(w.items[itemIdx]?.exercise.name);

        // Start bevegelsessporing
        motionTrackerService.start((m: MotionMetrics) => {
          setMotionReps(m.count);
        }, 'hopp');
      } else if (newPhase === 'rest') {
        duration = w.items[itemIdx]?.restDurationSeconds || 10;
        audioService.playRestStart(stateRef.current.soundEnabled);
        vibrationService.restStart(stateRef.current.vibrateEnabled);
        speechService.announceRest(w.items[itemIdx + 1]?.exercise.name);
        motionTrackerService.stop();
      } else if (newPhase === 'round_rest') {
        duration = w.roundRestDurationSeconds;
        audioService.playRestStart(stateRef.current.soundEnabled);
        vibrationService.restStart(stateRef.current.vibrateEnabled);
        speechService.announceRest(w.items[0]?.exercise.name);
        motionTrackerService.stop();
      } else if (newPhase === 'complete') {
        duration = 0;
        audioService.playWorkoutComplete(stateRef.current.soundEnabled);
        vibrationService.workoutComplete(stateRef.current.vibrateEnabled);
        speechService.announceComplete();
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
      stateRef.current.phaseStartTime = performance.now();
      stateRef.current.lastCountdownBeep = -1;

      if (newPhase === 'complete') {
        setStatus('completed');
        stateRef.current.status = 'completed';
      }
    },
    []
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

  // Hoved-timerloop basert på tidsstempler
  useEffect(() => {
    if (status !== 'running') {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let lastTick = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTick) / 1000;
      lastTick = now;

      const phaseElapsed = (now - stateRef.current.phaseStartTime) / 1000;
      const remaining = Math.max(0, stateRef.current.phaseDuration - phaseElapsed);

      setPhaseRemaining(remaining);
      setTotalElapsed((prev) => prev + deltaSec);

      // Sjekk for 3 - 2 - 1 nedtellingspip
      const wholeSecondsLeft = Math.ceil(remaining);
      if (
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
      }

      // Fortsett timer-loopen så lenge økten ikke er fullført
      if (stateRef.current.status !== 'completed') {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [status, advanceToNextPhase]);

  // Kontrollfunksjoner
  const startWorkout = useCallback(async () => {
    await audioService.unlockAudio();
    speechService.init();
    if (stateRef.current.wakeLockEnabled) {
      await wakeLockService.requestLock();
    }

    stateRef.current.phaseStartTime = performance.now();
    stateRef.current.workoutStartTime = performance.now();
    setStatus('running');
    if (phase === 'prepare' && phaseRemaining === workout.prepareDurationSeconds) {
      setupPhase('prepare', 1, 0);
    }
  }, [phase, phaseRemaining, workout, setupPhase]);

  const pauseWorkout = useCallback(() => {
    setStatus('paused');
    wakeLockService.releaseLock();
  }, []);

  const resumeWorkout = useCallback(async () => {
    await audioService.unlockAudio();
    speechService.init();
    if (stateRef.current.wakeLockEnabled) {
      await wakeLockService.requestLock();
    }

    // Juster phaseStartTime slik at resterende tid bevares nøyaktig
    const currentRemaining = stateRef.current.phaseRemaining;
    stateRef.current.phaseStartTime = performance.now() - (stateRef.current.phaseDuration - currentRemaining) * 1000;
    setStatus('running');
  }, []);

  const resetWorkout = useCallback(() => {
    setStatus('idle');
    wakeLockService.releaseLock();
    setupPhase('prepare', 1, 0);
    setTotalElapsed(0);
    setPhaseRemaining(workout.prepareDurationSeconds);
    setPhaseDuration(workout.prepareDurationSeconds);
  }, [workout, setupPhase]);

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
  const currentItem = workout.items[currentItemIndex] || workout.items[0];
  const nextItem =
    currentItemIndex + 1 < workout.items.length
      ? workout.items[currentItemIndex + 1]
      : currentRound < workout.rounds
      ? workout.items[0]
      : null;

  const currentExercise = currentItem ? currentItem.exercise : null;
  const nextExercise = nextItem ? nextItem.exercise : null;

  const phaseProgress = phaseDuration > 0 ? (phaseDuration - phaseRemaining) / phaseDuration : 1;

  const timerState: TimerState = {
    status,
    phase,
    currentRound,
    totalRounds: workout.rounds,
    currentItemIndex,
    totalItems: workout.items.length,
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
    skipNext,
    previous,
    toggleLock,
    toggleSound,
    toggleVibrate,
    toggleWakeLock,
    toggleSpeech,
  };
}
