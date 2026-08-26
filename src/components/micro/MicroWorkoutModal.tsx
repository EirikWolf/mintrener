import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { EXERCISE_LIBRARY } from '../../data/exercises';
import { WorkoutTemplate } from '../../types/workout';
import { Zap, X, Play } from 'lucide-react';

interface MicroWorkoutModalProps {
  onClose: () => void;
  onStartMicroWorkout: (workout: WorkoutTemplate) => void;
}

const POPULAR_MICRO_EXERCISES = [
  'planke',
  'kneboy',
  'push-ups',
  'utfall-forover',
  'hoye-kneloft',
  'katte-ku',
];

const PRESET_DURATIONS = [
  { label: '30s', seconds: 30 },
  { label: '60s (1m)', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '⏱️ Hold til du gir opp', seconds: 600, isOpenEnded: true },
];

export const MicroWorkoutModal: React.FC<MicroWorkoutModalProps> = ({
  onClose,
  onStartMicroWorkout,
}) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('planke');
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [isOpenEnded, setIsOpenEnded] = useState<boolean>(false);

  const selectedExercise =
    EXERCISE_LIBRARY.find((e) => e.id === selectedExerciseId) || EXERCISE_LIBRARY[0];

  const handleStart = () => {
    const workout: WorkoutTemplate = {
      id: `micro-${Date.now()}`,
      name: isOpenEnded
        ? `Microtrening: ${selectedExercise.navn.nb} (Maks tid)`
        : `Microtrening: ${selectedExercise.navn.nb} (${selectedDuration}s)`,
      description: `Kort og effektiv hverdagsøkt uten utstyr`,
      type: 'custom',
      prepareDurationSeconds: 5,
      rounds: 1,
      roundRestDurationSeconds: 0,
      items: [
        {
          id: `micro-item-1`,
          exercise: {
            id: selectedExercise.id,
            name: selectedExercise.navn.nb,
            nameEn: selectedExercise.navn.en,
            category: selectedExercise.kategori as any,
          },
          workDurationSeconds: selectedDuration,
          restDurationSeconds: 0,
        },
      ],
    };

    onStartMicroWorkout(workout);
    onClose();
  };

  // WCAG: Lukk ved trykk på Escape-tast
  React.useEffect(() => {
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="micro-modal-title"
        className="w-full max-w-sm max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[101]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 id="micro-modal-title" className="text-base font-black text-white">Microtrening</h2>
              <p className="text-[10px] text-zinc-400">1 øvelse • 1–5 minutter i hverdagsklær</p>
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

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* 1. Velg øvelse */}
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-zinc-300 tracking-wider">
              1. Velg øvelse
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {EXERCISE_LIBRARY.filter((e) =>
                POPULAR_MICRO_EXERCISES.includes(e.id)
              ).map((ex) => {
                const isSelected = ex.id === selectedExerciseId;
                return (
                  <button
                    key={ex.id}
                    onClick={() => setSelectedExerciseId(ex.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-950/80 border-amber-500 text-white shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <p className="text-xs font-bold truncate">{ex.navn.nb}</p>
                    <p className="text-[10px] text-zinc-400 capitalize">{ex.kategori}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Velg varighet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-bold text-zinc-300 tracking-wider">
                2. Velg varighet
              </label>
              <span className="text-xs font-mono font-bold text-amber-400">
                {isOpenEnded ? 'Maks innsats' : `${selectedDuration} sek`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((preset) => {
                const isSelected =
                  preset.isOpenEnded === isOpenEnded &&
                  (preset.isOpenEnded || selectedDuration === preset.seconds);
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setSelectedDuration(preset.seconds);
                      setIsOpenEnded(Boolean(preset.isOpenEnded));
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-black'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                    } ${preset.isOpenEnded ? 'col-span-2 sm:col-span-3 bg-amber-950/40 text-amber-300' : ''}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Startknapp */}
        <div className="pt-2 border-t border-zinc-800 shrink-0">
          <button
            onClick={handleStart}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-zinc-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            Start microøkt ({selectedExercise.navn.nb})
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
