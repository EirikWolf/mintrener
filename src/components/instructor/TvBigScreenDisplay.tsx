import React, { useEffect, useState } from 'react';
import { TimerState, WorkoutTemplate } from '../../types/workout';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';
import { EXERCISE_LIBRARY } from '../../data/exercises';
import {
  Tv,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Users,
} from 'lucide-react';

interface TvBigScreenDisplayProps {
  workout: WorkoutTemplate;
  state: TimerState;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onSkipNext?: () => void;
  onPrevious?: () => void;
  onToggleSound?: () => void;
  onClose: () => void;
}

export const TvBigScreenDisplay: React.FC<TvBigScreenDisplayProps> = ({
  workout,
  state,
  onStart,
  onPause,
  onResume,
  onSkipNext,
  onPrevious,
  onToggleSound,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullskjerm ikke støttet:', e);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // WCAG: Lukk ved trykk på Escape-tast når ikke i fullskjerm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentEx = state.currentExercise;
  const currentExObj = EXERCISE_LIBRARY.find((e) => e.id === currentEx?.id) || EXERCISE_LIBRARY[0];
  const nextEx = state.nextExercise;

  const phaseColor =
    state.phase === 'work'
      ? 'text-emerald-400 border-emerald-500 bg-emerald-950/40'
      : state.phase === 'rest'
      ? 'text-amber-400 border-amber-500 bg-amber-950/40'
      : 'text-purple-400 border-purple-500 bg-purple-950/40';

  const phaseLabel =
    state.phase === 'work'
      ? 'JOBB'
      : state.phase === 'rest'
      ? 'PAUSE'
      : state.phase === 'prepare'
      ? 'GJØR KLAR'
      : 'FULLFØRT';

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-screen-title"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6 sm:p-10 select-none animate-in fade-in"
    >
      {/* Topplinje: Programnavn, Gruppe-badge, Fullskjerm & Lukk */}
      <div className="flex items-center justify-between shrink-0 border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 id="tv-screen-title" className="text-xl sm:text-2xl font-black text-white">{workout.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Storskjerm & Instruktør
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              Runde {state.currentRound} av {state.totalRounds} • Øvelse {state.currentItemIndex + 1} av {state.totalItems}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              aria-label={state.soundEnabled ? 'Slå av lyd' : 'Slå på lyd'}
              className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
            >
              {state.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-zinc-600" />}
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Lukk fullskjerm' : 'Åpne fullskjerm'}
            className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Lukk storskjermvisning"
            className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hovedfelt: Gigantisk Timer & Øvelsesillustrasjon */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 my-auto py-4">
        {/* Venstre: Kjempetall & Fase */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 flex-1">
          <span className={`px-6 py-2 rounded-full border text-lg sm:text-2xl font-black uppercase tracking-widest ${phaseColor}`}>
            {phaseLabel}
          </span>

          <div className="font-mono font-black text-8xl sm:text-[13rem] tracking-tighter leading-none text-white drop-shadow-2xl">
            {formatMinSec(state.phaseRemainingSeconds)}
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-emerald-300 tracking-tight max-w-xl">
            {currentEx?.name || 'Gjør deg klar'}
          </h2>
        </div>

        {/* Høyre: Stor Øvelsesillustrasjon */}
        {currentEx && (
          <div className="w-64 h-64 sm:w-96 sm:h-96 rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl flex items-center justify-center shrink-0">
            <ExerciseIllustration
              exercise={currentExObj}
              phaseIndex={0}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Bunnlinje: Neste øvelse banner for instruktør & Gruppe-kontroller */}
      <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-900 pt-4">
        {/* Neste øvelse forhåndsvisning */}
        <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 px-4 py-2.5 rounded-2xl">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Neste:
          </span>
          {nextEx ? (
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-zinc-200">{nextEx.name}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-zinc-400">Siste øvelse i runden!</span>
          )}
        </div>

        {/* Kontrollknapper */}
        <div className="flex items-center gap-3">
          {onPrevious && (
            <button
              onClick={onPrevious}
              className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-zinc-300 transition-all border border-zinc-800"
            >
              <SkipBack className="w-6 h-6" />
            </button>
          )}

          {state.status === 'running' ? (
            <button
              onClick={onPause}
              className="py-4 px-8 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black text-lg shadow-xl shadow-amber-950 transition-all flex items-center gap-2"
            >
              <Pause className="w-6 h-6 fill-current" />
              PAUSE
            </button>
          ) : (
            <button
              onClick={state.status === 'paused' ? onResume : onStart}
              className="py-4 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-lg shadow-xl shadow-emerald-950 transition-all flex items-center gap-2"
            >
              <Play className="w-6 h-6 fill-current" />
              {state.status === 'paused' ? 'FORTSETT' : 'START'}
            </button>
          )}

          {onSkipNext && (
            <button
              onClick={onSkipNext}
              className="p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-zinc-300 transition-all border border-zinc-800"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Total gjenværende tid */}
        <div className="text-right font-mono text-xs sm:text-sm text-zinc-400">
          Totaltid igjen: <strong className="text-white">{formatMinSec(state.totalRemainingSeconds)}</strong>
        </div>
      </div>
    </div>
  );
};
