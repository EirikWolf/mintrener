import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EXERCISE_LIBRARY } from '../../data/exercises';
import { useAuth } from '../../contexts/AuthContext';
import {
  StrengthSet,
  calculateOneRepMax,
  saveStrengthLog,
  getLastStrengthLogForExercise,
} from '../../services/strengthLogService';
import { Dumbbell, X, Plus, Trash2, CheckCircle2, Trophy } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface StrengthLoggerModalProps {
  onClose: () => void;
  initialExerciseId?: string;
}

export const StrengthLoggerModal: React.FC<StrengthLoggerModalProps> = ({
  onClose,
  initialExerciseId = 'goblet-squat',
}) => {
  const { user } = useAuth();
  const [exerciseId, setExerciseId] = useState<string>(initialExerciseId);
  const [sets, setSets] = useState<StrengthSet[]>([
    { setNumber: 1, reps: 10, weightKg: 16, completed: false },
    { setNumber: 2, reps: 10, weightKg: 16, completed: false },
    { setNumber: 3, reps: 10, weightKg: 16, completed: false },
  ]);
  const [lastLog, setLastLog] = useState<string | null>(null);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);
  const [restDuration] = useState<number>(60);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const restTimerRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  const selectedExercise =
    EXERCISE_LIBRARY.find((e) => e.id === exerciseId) || EXERCISE_LIBRARY[0];

  // Hent forrige logg for valgt øvelse
  useEffect(() => {
    getLastStrengthLogForExercise(user?.uid, exerciseId).then((prev) => {
      if (prev && prev.sets.length > 0) {
        const summary = prev.sets
          .map((s) => `${s.reps}x${s.weightKg}kg`)
          .join(', ');
        setLastLog(`Sist: ${prev.sets.length} sett (${summary})`);
      } else {
        setLastLog(null);
      }
    });
  }, [exerciseId, user]);

  // Hviletimer med veggklokke-differanse (Date.now()) slik at den overlever bakgrunnsmodus
  const restTargetTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (restSecondsRemaining !== null && restSecondsRemaining > 0) {
      if (!restTargetTimeRef.current) {
        restTargetTimeRef.current = Date.now() + restSecondsRemaining * 1000;
      }
      restTimerRef.current = window.setInterval(() => {
        if (!restTargetTimeRef.current) return;
        const diffMs = restTargetTimeRef.current - Date.now();
        const remaining = Math.max(0, Math.ceil(diffMs / 1000));
        setRestSecondsRemaining(remaining);
        if (remaining === 0) {
          restTargetTimeRef.current = null;
          if (restTimerRef.current) clearInterval(restTimerRef.current);
        }
      }, 500);
    } else {
      restTargetTimeRef.current = null;
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restSecondsRemaining]);

  const handleToggleSet = (index: number) => {
    const updated = [...sets];
    const isNowCompleted = !updated[index].completed;
    updated[index].completed = isNowCompleted;
    setSets(updated);

    if (isNowCompleted) {
      // Start hviletimer automatisk med ferskt måltidspunkt
      restTargetTimeRef.current = Date.now() + restDuration * 1000;
      setRestSecondsRemaining(restDuration);
    }
  };

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1] || { reps: 10, weightKg: 16 };
    setSets([
      ...sets,
      {
        setNumber: sets.length + 1,
        reps: lastSet.reps,
        weightKg: lastSet.weightKg,
        completed: false,
      },
    ]);
  };

  const handleRemoveSet = (index: number) => {
    if (sets.length <= 1) return;
    const updated = sets.filter((_, idx) => idx !== index).map((s, i) => ({ ...s, setNumber: i + 1 }));
    setSets(updated);
  };

  const updateSetWeight = (index: number, delta: number) => {
    const updated = [...sets];
    updated[index].weightKg = Math.max(0, updated[index].weightKg + delta);
    setSets(updated);
  };

  const updateSetReps = (index: number, delta: number) => {
    const updated = [...sets];
    updated[index].reps = Math.max(1, updated[index].reps + delta);
    setSets(updated);
  };

  // Beregn beste 1RM fra fullførte sett
  const completedSets = sets.filter((s) => s.completed);
  const bestOneRepMax = completedSets.reduce((max, s) => {
    const val = calculateOneRepMax(s.weightKg, s.reps);
    return val > max ? val : max;
  }, 0);

  const handleSave = async () => {
    if (completedSets.length === 0) {
      alert('Vennligst huk av minst ett fullført sett før du lagrer.');
      return;
    }

    await saveStrengthLog(user?.uid, {
      exerciseId,
      exerciseName: selectedExercise.navn.nb,
      sets: completedSets,
      estimatedOneRepMaxKg: bestOneRepMax,
      restDurationSeconds: restDuration,
    });

    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // WCAG: Lukk ved trykk på Escape-tast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="strength-modal-title"
        className="w-full max-w-md max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-3 relative z-[101] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 id="strength-modal-title" className="text-base font-black text-white">Styrkelogg (Sett & Vekt)</h2>
              <p className="text-[10px] text-zinc-400">Logg kg, reps og automatisk hviletimer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* 1. Velg øvelse */}
          <div className="space-y-1">
            <label htmlFor="strength-exercise-select" className="text-xs font-bold text-zinc-300">Velg styrkeøvelse</label>
            <select
              id="strength-exercise-select"
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {EXERCISE_LIBRARY.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.navn.nb} ({ex.kategori})
                </option>
              ))}
            </select>
            {lastLog && (
              <p className="text-[10px] text-cyan-400/90 font-medium pl-1">{lastLog}</p>
            )}
          </div>

          {/* 2. Hviletimer-bar hvis aktiv */}
          {restSecondsRemaining !== null && restSecondsRemaining > 0 && (
            <div className="bg-cyan-950/80 border border-cyan-700/60 rounded-2xl p-2.5 flex items-center justify-between animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold text-cyan-200">Hviletid mellom sett:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-black text-cyan-400">{restSecondsRemaining}s</span>
                <button
                  onClick={() => setRestSecondsRemaining(null)}
                  className="text-[10px] bg-cyan-900/60 text-cyan-300 px-2 py-0.5 rounded-lg hover:bg-cyan-800"
                >
                  Hopp over
                </button>
              </div>
            </div>
          )}

          {/* 3. Sett-tabell */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
              <span>Sett</span>
              <span className="text-center">Vekt (kg)</span>
              <span className="text-center">Reps</span>
              <span>Fullført</span>
            </div>

            <div className="space-y-1.5">
              {sets.map((s, idx) => (
                <div
                  key={s.setNumber}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                    s.completed
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-200'
                  }`}
                >
                  {/* Sett-nummer */}
                  <span className="w-6 text-center text-xs font-bold font-mono text-zinc-400">
                    #{s.setNumber}
                  </span>

                  {/* Vekt justering */}
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-1.5 py-0.5">
                    <button
                      onClick={() => updateSetWeight(idx, -2.5)}
                      aria-label={`Reduser vekt for sett ${s.setNumber}`}
                      className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white font-black"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold w-10 text-center text-white">
                      {s.weightKg}k
                    </span>
                    <button
                      onClick={() => updateSetWeight(idx, 2.5)}
                      aria-label={`Øk vekt for sett ${s.setNumber}`}
                      className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white font-black"
                    >
                      +
                    </button>
                  </div>

                  {/* Reps justering */}
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-1.5 py-0.5">
                    <button
                      onClick={() => updateSetReps(idx, -1)}
                      aria-label={`Reduser reps for sett ${s.setNumber}`}
                      className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white font-black"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold w-8 text-center text-white">
                      {s.reps}
                    </span>
                    <button
                      onClick={() => updateSetReps(idx, 1)}
                      aria-label={`Øk reps for sett ${s.setNumber}`}
                      className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white font-black"
                    >
                      +
                    </button>
                  </div>

                  {/* Avkryssingsknapp & Slett */}
                  <div className="flex items-center gap-1">
                    <button
                      role="checkbox"
                      aria-checked={s.completed}
                      aria-label={`Sett ${s.setNumber}: ${s.completed ? 'Fullført' : 'Ikke fullført'}`}
                      onClick={() => handleToggleSet(idx)}
                      className={`p-1.5 rounded-xl border transition-all ${
                        s.completed
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    {sets.length > 1 && (
                      <button
                        onClick={() => handleRemoveSet(idx)}
                        aria-label={`Slett sett ${s.setNumber}`}
                        className="p-1 rounded-lg text-zinc-600 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legg til sett */}
            <button
              onClick={handleAddSet}
              className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 border border-dashed border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Legg til sett #{sets.length + 1}
            </button>
          </div>

          {/* 4. Estimert 1RM */}
          {bestOneRepMax > 0 && (
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-2.5 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Estimert 1RM (Maks-løft):
              </span>
              <span className="font-mono font-black text-amber-400 text-sm">
                ~{bestOneRepMax} kg
              </span>
            </div>
          )}
        </div>

        {/* Bunnknapper */}
        <div className="pt-2 border-t border-zinc-800 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaved}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 active:scale-95 text-zinc-950 font-black rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all text-sm"
          >
            {isSaved ? (
              <span className="text-emerald-950 font-black">Lagret! 🎉</span>
            ) : (
              <span>Lagre styrkeøkt ({completedSets.length} fullførte sett)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
