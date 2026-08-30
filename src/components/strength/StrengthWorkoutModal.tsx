import React, { useState, useEffect, useRef } from 'react';
import { StrengthProgramTemplate, StrengthSetLog } from '../../schemas/strengthSchema';
import { EXERCISE_LIBRARY } from '../../data/exercises';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';
import {
  getLatestExerciseLog,
  saveExerciseSetsLog,
  calculateDoubleProgression,
  DoubleProgressionResult,
} from '../../services/strengthProgressionService';
import { audioService } from '../../services/audioService';
import {
  Dumbbell,
  Check,
  X,
  Plus,
  Minus,
  Sparkles,
  Trophy,
  Info,
  Clock,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface StrengthWorkoutModalProps {
  program?: StrengthProgramTemplate;
  onClose: () => void;
  onCompleteWorkout?: () => void;
}

interface ActiveExerciseState {
  exerciseId: string;
  name: string;
  isUpperBody: boolean;
  repRange: [number, number];
  weightKg: number;
  sets: StrengthSetLog[];
}

const DEFAULT_STRENGTH_SESSION_EXERCISES = [
  { id: 'kneboy', name: 'Knebøy', isUpperBody: false, repRange: [8, 12] as [number, number], defaultWeight: 50 },
  { id: 'push-ups', name: 'Push-ups / Benkpress', isUpperBody: true, repRange: [8, 12] as [number, number], defaultWeight: 0 },
  { id: 'kettlebell-row', name: 'Roing', isUpperBody: true, repRange: [8, 12] as [number, number], defaultWeight: 16 },
  { id: 'planke', name: 'Planke / Kjerne', isUpperBody: false, repRange: [30, 60] as [number, number], defaultWeight: 0 },
];

export const StrengthWorkoutModal: React.FC<StrengthWorkoutModalProps> = ({
  program: _program,
  onClose,
  onCompleteWorkout,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });
  const [exercises, setExercises] = useState<ActiveExerciseState[]>(() => {
    return DEFAULT_STRENGTH_SESSION_EXERCISES.map((ex) => {
      const prev = getLatestExerciseLog(ex.id);
      const startWeight = prev ? prev.weightKg : ex.defaultWeight;
      const initialSets: StrengthSetLog[] = [1, 2, 3].map((idx) => {
        const prevSet = prev?.sets[idx - 1];
        return {
          setIndex: idx,
          targetReps: ex.repRange[1],
          targetWeightKg: startWeight,
          loggedReps: prevSet ? prevSet.reps : ex.repRange[0],
          loggedWeightKg: startWeight,
          isCompleted: false,
        };
      });

      return {
        exerciseId: ex.id,
        name: ex.name,
        isUpperBody: ex.isUpperBody,
        repRange: ex.repRange,
        weightKg: startWeight,
        sets: initialSets,
      };
    });
  });

  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(0);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [progressionResults, setProgressionResults] = useState<DoubleProgressionResult[]>([]);
  const [showBasis, setShowBasis] = useState<boolean>(false);

  const activeExercise = exercises[activeExerciseIndex];
  const exerciseObj = EXERCISE_LIBRARY.find((e) => e.id === activeExercise?.exerciseId) || EXERCISE_LIBRARY[0];

  const restTargetTimeRef = useRef<number | null>(null);
  const lastBeepSecondRef = useRef<number | null>(null);

  // Hviletimer basert på veggklokke (Date.now()) slik at den overlever bakgrunnsmodus
  useEffect(() => {
    if (restSecondsRemaining === null || restSecondsRemaining <= 0) {
      restTargetTimeRef.current = null;
      lastBeepSecondRef.current = null;
      return;
    }

    if (!restTargetTimeRef.current) {
      restTargetTimeRef.current = Date.now() + restSecondsRemaining * 1000;
    }

    const timer = setInterval(() => {
      if (!restTargetTimeRef.current) return;
      const diffMs = restTargetTimeRef.current - Date.now();
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));

      if (remaining <= 0) {
        audioService.playWorkStart(true);
        restTargetTimeRef.current = null;
        lastBeepSecondRef.current = null;
        setRestSecondsRemaining(null);
        return;
      }

      if (remaining <= 3 && lastBeepSecondRef.current !== remaining) {
        lastBeepSecondRef.current = remaining;
        audioService.playCountdownBeep(true);
      }

      setRestSecondsRemaining(remaining);
    }, 250);

    return () => clearInterval(timer);
  }, [restSecondsRemaining]);

  const handleUpdateReps = (setIdx: number, delta: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[activeExerciseIndex] };
      const sets = [...ex.sets];
      const current = sets[setIdx].loggedReps ?? ex.repRange[0];
      sets[setIdx] = {
        ...sets[setIdx],
        loggedReps: Math.max(1, current + delta),
      };
      ex.sets = sets;
      copy[activeExerciseIndex] = ex;
      return copy;
    });
  };

  const handleUpdateWeight = (delta: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[activeExerciseIndex] };
      const newWeight = Math.max(0, ex.weightKg + delta);
      ex.weightKg = newWeight;
      ex.sets = ex.sets.map((s) => ({
        ...s,
        targetWeightKg: newWeight,
        loggedWeightKg: newWeight,
      }));
      copy[activeExerciseIndex] = ex;
      return copy;
    });
  };

  const handleToggleSet = (setIdx: number) => {
    audioService.unlockAudio();
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[activeExerciseIndex] };
      const sets = [...ex.sets];
      const set = sets[setIdx];
      const nextCompleted = !set.isCompleted;
      sets[setIdx] = { ...set, isCompleted: nextCompleted };
      ex.sets = sets;
      copy[activeExerciseIndex] = ex;
      return copy;
    });

    // Start 90 sekunders pause
    setRestSecondsRemaining(90);
  };

  const handleCompleteWorkout = () => {
    // 1. Lagre alle logger og beregn progresjon
    const results: DoubleProgressionResult[] = [];
    exercises.forEach((ex) => {
      saveExerciseSetsLog(ex.exerciseId, ex.sets, ex.weightKg);
      const res = calculateDoubleProgression(
        ex.sets,
        ex.repRange,
        ex.isUpperBody,
        ex.weightKg
      );
      results.push(res);
    });

    setProgressionResults(results);
    setIsFinished(true);
    audioService.playWorkoutComplete(true);
  };

  // FULLFØRT MED DOBBEL PROGRESJONS-RAPPORT
  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in text-white">
        <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Styrkeøkt Fullført!</h2>
            <p className="text-xs text-zinc-400">
              Dobbel Progresjonsmotor har analysert økten din. Her er neste trinns mål:
            </p>
          </div>

          {/* Progresjonsforslag per øvelse */}
          <div className="space-y-2.5">
            {exercises.map((ex, i) => {
              const res = progressionResults[i];
              if (!res) return null;

              return (
                <div
                  key={ex.exerciseId}
                  className={`p-3.5 rounded-2xl border ${
                    res.shouldIncreaseWeight
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-white">{ex.name}</span>
                    <span className="text-xs font-mono font-black">
                      {res.shouldIncreaseWeight ? `+${res.nextWeightKg - res.currentWeightKg} kg` : 'Samme vekt'}
                    </span>
                  </div>
                  <p className="text-xs font-bold mt-1 text-white">{res.title}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{res.reason}</p>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              if (onCompleteWorkout) onCompleteWorkout();
              onClose();
            }}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black rounded-2xl shadow-xl shadow-emerald-950 transition-all"
          >
            Lagre og Lukk
          </button>
        </div>
      </div>
    );
  }

  // WCAG: Lukk ved trykk på Escape-tast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 text-white"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="strength-program-title"
        className="w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="strength-program-title" className="text-lg font-black text-white">Sterkere 12 Uker</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400">
                  Uke 1 • Helkropp A
                </span>
              </div>
              <p className="text-xs text-zinc-400">Dobbel progresjon • Logg i økten</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowBasis(!showBasis)}
              title="Kunnskapsgrunnlag & Forskning"
              className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Lukk"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Forskning / Kunnskapsgrunnlag popover */}
        {showBasis && (
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs space-y-1.5 animate-in fade-in shrink-0">
            <p className="font-bold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Vitenskapelig kunnskapsgrunnlag (C.19):
            </p>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              «Dobbel progresjon sikrer adaptiv overbelastning ved først å øke repetisjonsvolumet mot toppmålet, deretter vekten (Schoenfeld 2016).»
            </p>
          </div>
        )}

        {/* Øvelsesfaner */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 pb-1">
          {exercises.map((ex, idx) => {
            const isCompleted = ex.sets.every((s) => s.isCompleted);
            const isCurrent = idx === activeExerciseIndex;
            return (
              <button
                key={ex.exerciseId}
                onClick={() => setActiveExerciseIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-emerald-500 text-zinc-950 font-black shadow-md'
                    : isCompleted
                    ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-400'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                <span>{ex.name}</span>
              </button>
            );
          })}
        </div>

        {/* Aktiv Øvelse Visning */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex items-center gap-4 p-3 bg-zinc-900/60 border border-zinc-850 rounded-2xl">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
              <ExerciseIllustration exercise={exerciseObj} phaseIndex={0} className="w-full h-full" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-white">{activeExercise.name}</h3>
              <p className="text-xs text-zinc-400">
                Mål: {activeExercise.repRange[0]}–{activeExercise.repRange[1]} reps
              </p>
              {/* Vekt-justering */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleUpdateWeight(-2.5)}
                  className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white font-bold text-xs flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-black text-emerald-400 w-16 text-center">
                  {activeExercise.weightKg} kg
                </span>
                <button
                  onClick={() => handleUpdateWeight(2.5)}
                  className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white font-bold text-xs flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sett-liste */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Sett & Repetisjoner
            </span>
            <div className="space-y-2">
              {activeExercise.sets.map((set, setIdx) => {
                const currentReps = set.loggedReps ?? activeExercise.repRange[0];
                return (
                  <div
                    key={set.setIndex}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      set.isCompleted
                        ? 'bg-emerald-950/40 border-emerald-500'
                        : 'bg-zinc-900/80 border-zinc-800'
                    }`}
                  >
                    <span className="text-xs font-black text-zinc-300 w-12">Sett {set.setIndex}</span>

                    {/* Reps stepper */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateReps(setIdx, -1)}
                        className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black text-sm flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-mono font-black text-white w-12 text-center">
                        {currentReps} reps
                      </span>
                      <button
                        onClick={() => handleUpdateReps(setIdx, 1)}
                        className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black text-sm flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Fullfør sett knapp */}
                    <button
                      onClick={() => handleToggleSet(setIdx)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                        set.isCompleted
                          ? 'bg-emerald-500 text-zinc-950 shadow-md font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hviletimer hvis aktiv */}
          {restSecondsRemaining !== null && (
            <div className="p-3 bg-amber-950/80 border border-amber-500/70 rounded-2xl flex items-center justify-between text-amber-300 shadow-md animate-in fade-in">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">Hvilepause:</span>
              </div>
              <span className="text-lg font-mono font-black text-white">
                {restSecondsRemaining}s
              </span>
              <button
                onClick={() => setRestSecondsRemaining(null)}
                className="text-[11px] font-bold text-amber-400 hover:text-white"
              >
                Hopp over
              </button>
            </div>
          )}
        </div>

        {/* Fullfør økt knapp */}
        <div className="pt-2 border-t border-zinc-850 shrink-0">
          <button
            onClick={handleCompleteWorkout}
            className="w-full py-4 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Fullfør Styrkeøkt & Beregn Progresjon
          </button>
        </div>
      </div>
    </div>
  );
};
