import React, { useState } from 'react';
import { WorkoutTemplate } from '../../types/workout';
import {
  PAIN_POINTS,
  PainPointId,
  adaptWorkoutForPain,
} from '../../services/injuryAlternativeService';
import {
  convertToDeloadWorkout,
} from '../../services/fatigueDeloadService';
import { ShieldAlert, X, Check, ArrowRight, Sparkles, HeartPulse } from 'lucide-react';

interface PainFilterModalProps {
  workout: WorkoutTemplate;
  onClose: () => void;
  onApplyWorkout: (adapted: WorkoutTemplate) => void;
}

export const PainFilterModal: React.FC<PainFilterModalProps> = ({
  workout,
  onClose,
  onApplyWorkout,
}) => {
  const [selectedPainPoints, setSelectedPainPoints] = useState<PainPointId[]>([]);
  const [isDeloadActive, setIsDeloadActive] = useState<boolean>(false);

  // WCAG: Lukk ved Escape-tast
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const togglePainPoint = (id: PainPointId) => {
    setSelectedPainPoints((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const { adaptedWorkout, modifiedCount, replacements } = adaptWorkoutForPain(
    workout,
    selectedPainPoints
  );

  const finalWorkout = isDeloadActive
    ? convertToDeloadWorkout(adaptedWorkout)
    : adaptedWorkout;

  const handleConfirm = () => {
    onApplyWorkout(finalWorkout);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 text-white"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pain-filter-title"
        className="w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="pain-filter-title" className="text-lg sm:text-xl font-black text-white">
                Skade- & Smertefilter
              </h2>
              <p className="text-xs text-zinc-400">
                Automatisk tilpasning av økten for trygg og skånsom trening
              </p>
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

        {/* Velg smertepunkter */}
        <div className="space-y-2 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Hvor kjenner du ubehag eller stivhet i dag?
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PAIN_POINTS.map((point) => {
              const isSelected = selectedPainPoints.includes(point.id);
              return (
                <button
                  key={point.id}
                  onClick={() => togglePainPoint(point.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-rose-950/40 border-rose-500 text-white shadow-sm ring-1 ring-rose-500/30'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-xl shrink-0">{point.icon}</span>
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-white">{point.label}</p>
                      {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      {point.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Deload-valg */}
        <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Deload Restitusjon (Mindre volum)</p>
              <p className="text-[10px] text-zinc-400">
                Senker arbeidstid og øker pauser for overskudd og restitusjon.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDeloadActive((prev) => !prev)}
            role="switch"
            aria-checked={isDeloadActive}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              isDeloadActive
                ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {isDeloadActive ? 'Aktiv' : 'Av'}
          </button>
        </div>

        {/* Live erstatningsoversikt */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-300">Tilpasninger for «{workout.name}»:</span>
            <span className={modifiedCount > 0 ? 'text-rose-400' : 'text-zinc-500'}>
              {modifiedCount} øvelser byttet
            </span>
          </div>

          {replacements.length === 0 ? (
            <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl text-center text-xs text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-300">Ingen øvelseskonflikter funnet.</p>
              <p className="text-[11px]">
                {selectedPainPoints.length === 0
                  ? 'Velg ett eller flere smertepunkter over for å skåne ledd.'
                  : 'Nåværende økt inneholder ingen risikable øvelser for dine valgte punkter.'}
              </p>
            </div>
          ) : (
            replacements.map((r, i) => (
              <div
                key={i}
                className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-1 text-xs"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="line-through text-zinc-500 truncate max-w-[40%]">{r.original}</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 truncate max-w-[50%]">{r.replacement}</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug">{r.reason}</p>
              </div>
            ))
          )}
        </div>

        {/* Bunn-handlinger */}
        <div className="pt-2 border-t border-zinc-850 flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl transition-all"
          >
            Avbryt
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bruk tilpasset økt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
