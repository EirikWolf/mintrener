import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WorkoutTemplate } from '../../types/workout';
import {
  PAIN_POINTS,
  PainPointId,
  adaptWorkoutForPain,
} from '../../services/injuryAlternativeService';
import { IntervalItem } from '../../types/workout';
import { ShieldAlert, X, Check, ArrowRight, Activity } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface InjuryProtectionModalProps {
  workout: WorkoutTemplate;
  onClose: () => void;
  onApplyAdaptedWorkout: (adapted: WorkoutTemplate) => void;
}

export const InjuryProtectionModal: React.FC<InjuryProtectionModalProps> = ({
  workout,
  onClose,
  onApplyAdaptedWorkout,
}) => {
  const [selectedPainPoints, setSelectedPainPoints] = useState<PainPointId[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  const togglePainPoint = (id: PainPointId) => {
    setSelectedPainPoints((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const { adaptedWorkout: adapted, modifiedCount: changedCount } = adaptWorkoutForPain(
    workout,
    selectedPainPoints
  );

  const handleApply = () => {
    onApplyAdaptedWorkout(adapted);
    onClose();
  };

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="injury-modal-title"
        className="w-full max-w-md max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[121] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="injury-modal-title" className="text-base font-black text-white">
                Skadeforebygging & Tilpasning
              </h2>
              <p className="text-[10px] text-zinc-400">Bytt ut øvelser som trigger ubehag</p>
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

        {/* Scrollbart Innhold */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          <p className="text-[11px] text-zinc-300">
            Kjenner du på stivhet eller smerte i dag? Velg områdene nedenfor, så erstatter vi utsatte øvelser med skånsomme alternativer:
          </p>

          {/* Smertepunkter grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PAIN_POINTS.map((point) => {
              const isSelected = selectedPainPoints.includes(point.id);
              return (
                <button
                  key={point.id}
                  onClick={() => togglePainPoint(point.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-lg">{point.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-white">{point.label}</p>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                      {point.description}
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Forhåndsvisning av endringer */}
          {selectedPainPoints.length > 0 && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <Activity className="w-3.5 h-3.5" />
                {changedCount > 0
                  ? `${changedCount} øvelse(r) tilpasset for trygg gjennomføring`
                  : 'Ingen øvelser i denne økten belaster de valgte områdene.'}
              </div>

              {changedCount > 0 && (
                <div className="space-y-1 text-[10px] text-zinc-300">
                  {adapted.items.map((item: IntervalItem, idx: number) => {
                    const orig = workout.items[idx];
                    if (item.exercise.id === orig?.exercise.id) return null;
                    return (
                      <div key={item.id} className="flex items-center gap-1.5 truncate">
                        <span className="line-through text-zinc-500">{orig.exercise.name}</span>
                        <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-300">{item.exercise.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Handling */}
        <div className="pt-2 border-t border-zinc-800 shrink-0 flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-1/3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-2xl transition-all"
          >
            Avbryt
          </button>
          <button
            onClick={handleApply}
            className="w-2/3 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Bruk tilpasset økt
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
