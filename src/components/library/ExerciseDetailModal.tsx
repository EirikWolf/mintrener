import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';
import { X, CheckCircle2, AlertTriangle, Dumbbell, Target } from 'lucide-react';

interface ExerciseDetailModalProps {
  exercise: ExerciseItem;
  onClose: () => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise,
  onClose,
}) => {
  const [activePhase, setActivePhase] = useState<number>(0);

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
        aria-labelledby="exercise-detail-title"
        className="w-full max-w-md max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col overflow-hidden space-y-3.5 relative z-[101]"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-2.5 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                {exercise.kategori}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                Nivå: <strong className="text-zinc-200">{exercise.nivå}</strong>
              </span>
            </div>
            <h2 id="exercise-detail-title" className="text-lg sm:text-xl font-black text-white">{exercise.navn.nb}</h2>
            {exercise.navn.en && (
              <p className="text-xs text-zinc-400 font-medium">({exercise.navn.en})</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk modal"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollbart Innhold */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {/* Illustrasjon / Fasevisning med velger */}
          <div className="space-y-1.5">
            <ExerciseIllustration
              exercise={exercise}
              phaseIndex={activePhase}
              className="w-full h-56 sm:h-64"
            />

            {/* Fase-knapper for å veksle mellom Start og Sluttposisjon */}
            <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
              <button
                onClick={() => setActivePhase(0)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                  activePhase === 0
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                Fase 1: Startposisjon
              </button>
              <button
                onClick={() => setActivePhase(1)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                  activePhase === 1
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                Fase 2: Sluttposisjon
              </button>
            </div>
          </div>

          {/* Muskelgrupper & Utstyr */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 font-semibold uppercase text-[10px]">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Muskler
              </div>
              <p className="text-zinc-200 font-bold">{exercise.muskler.primær.join(', ')}</p>
              {exercise.muskler.sekundær.length > 0 && (
                <p className="text-[10px] text-zinc-400">Sekundær: {exercise.muskler.sekundær.join(', ')}</p>
              )}
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 font-semibold uppercase text-[10px]">
                <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                Utstyr
              </div>
              <p className="text-zinc-200 font-bold capitalize">{exercise.utstyr.join(', ')}</p>
              <p className="text-[10px] text-zinc-400">Type: {exercise.type === 'reps' ? 'Repetisjoner' : 'Tid'}</p>
            </div>
          </div>

          {/* Slik gjør du (Instruksjoner) */}
          <div className="space-y-1.5">
            <h3 className="text-xs uppercase font-bold text-zinc-300 tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Slik gjør du
            </h3>
            <div className="space-y-2 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-3">
              {exercise.instruks.nb.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                  <span className="w-4.5 h-4.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vanlige feil */}
          {exercise.vanligeFeil.nb.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Vanlige feil å unngå
              </h3>
              <div className="space-y-1 bg-rose-950/20 border border-rose-900/30 rounded-2xl p-2.5 text-xs text-rose-200">
                {exercise.vanligeFeil.nb.map((feil, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{feil}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sensorstøtte */}
          {exercise.sensorProfil && exercise.sensorProfil !== 'ingen' && (
            <div className="p-2.5 rounded-2xl bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <span>Støtter automatisk sensor-telling ({exercise.sensorProfil})</span>
            </div>
          )}
        </div>

        {/* Lukk-knapp */}
        <div className="pt-2 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-2xl transition-all"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
