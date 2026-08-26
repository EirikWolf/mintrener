import React, { useState } from 'react';
import { TimerState, WorkoutTemplate } from '../../types/workout';
import { CircularProgress } from './CircularProgress';
import { UserMenu } from '../auth/UserMenu';
import { SensorStatusModal } from '../sensors/SensorStatusModal';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Smartphone,
  Sun,
  Moon,
  Zap,
  Activity,
} from 'lucide-react';

interface TimerDisplayProps {
  workout: WorkoutTemplate;
  state: TimerState;
  presets: WorkoutTemplate[];
  onSelectWorkout: (w: WorkoutTemplate) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkipNext: () => void;
  onPrevious: () => void;
  onToggleLock: () => void;
  onToggleSound: () => void;
  onToggleVibrate: () => void;
  onToggleWakeLock: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  workout,
  state,
  presets,
  onSelectWorkout,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkipNext,
  onPrevious,
  onToggleLock,
  onToggleSound,
  onToggleVibrate,
  onToggleWakeLock,
}) => {
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Bakgrunnsfarge og gradient avhengig av aktiv fase
  const getPhaseStyles = () => {
    switch (state.phase) {
      case 'work':
        return {
          bg: 'bg-gradient-to-b from-emerald-950 via-emerald-900 to-zinc-950',
          badgeBg: 'bg-emerald-500 text-zinc-950 font-black',
          badgeText: 'ARBEID',
        };
      case 'rest':
      case 'round_rest':
        return {
          bg: 'bg-gradient-to-b from-amber-950 via-amber-900 to-zinc-950',
          badgeBg: 'bg-amber-500 text-zinc-950 font-black',
          badgeText: state.phase === 'round_rest' ? 'PAUSE MELLOM RUNDER' : 'PAUSE / HVILE',
        };
      case 'prepare':
        return {
          bg: 'bg-gradient-to-b from-blue-950 via-blue-900 to-zinc-950',
          badgeBg: 'bg-blue-500 text-zinc-950 font-black',
          badgeText: 'GJØR DEG KLAR',
        };
      default:
        return {
          bg: 'bg-zinc-950',
          badgeBg: 'bg-zinc-800 text-zinc-300 font-bold',
          badgeText: 'KLAR',
        };
    }
  };

  const phaseStyle = getPhaseStyles();

  return (
    <div
      className={`relative flex flex-col justify-between w-full h-full max-h-[100dvh] max-w-md mx-auto px-4 pt-2 pb-6 sm:pb-8 select-none overflow-hidden transition-colors duration-500 ${phaseStyle.bg}`}
    >
      {/* 1. TOPPBAR: Bruker, Tittel, sensor/lyd/dvale-ikoner og lås */}
      <header className="flex flex-col gap-2 pt-1 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserMenu />
            <div>
              <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-bold line-clamp-1">
                {workout.name}
              </h2>
              <span className="text-[11px] text-zinc-400 font-mono">
                Totalt: <strong className="text-zinc-200">{formatTime(state.totalRemainingSeconds)}</strong>
              </span>
            </div>
          </div>

          {/* Kontrollknapper for lyd, vibrasjon, dvale/skjerm og tastelås */}
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md rounded-full p-1 shadow-md">
            {/* Dvale / Skjermlås-bryter */}
            <button
              onClick={onToggleWakeLock}
              title={state.wakeLockEnabled ? 'Skjerm holdes på (dvale av)' : 'Skjerm kan gå i dvale'}
              aria-label={state.wakeLockEnabled ? 'Skjerm holdes på' : 'Skjerm kan gå i dvale'}
              className={`p-1.5 rounded-full transition-all ${
                state.wakeLockEnabled ? 'text-amber-400 bg-amber-950/60 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {state.wakeLockEnabled ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Lyd */}
            <button
              onClick={onToggleSound}
              title={state.soundEnabled ? 'Lyd på' : 'Lyd av'}
              aria-label={state.soundEnabled ? 'Slå av lyd' : 'Slå på lyd'}
              className={`p-1.5 rounded-full transition-all ${
                state.soundEnabled ? 'text-emerald-400 bg-emerald-950/60' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {state.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Vibrasjon */}
            <button
              onClick={onToggleVibrate}
              title={state.vibrateEnabled ? 'Vibrasjon på' : 'Vibrasjon av'}
              aria-label={state.vibrateEnabled ? 'Slå av vibrasjon' : 'Slå på vibrasjon'}
              className={`p-1.5 rounded-full transition-all ${
                state.vibrateEnabled ? 'text-amber-400 bg-amber-950/60' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>

            {/* Sensorstatus */}
            <button
              onClick={() => setIsSensorModalOpen(true)}
              title="Sensorstatus"
              aria-label="Åpne sensorstatus"
              className="p-1.5 rounded-full text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            {/* Berøringslås */}
            <button
              onClick={onToggleLock}
              title={state.isLocked ? 'Skjerm låst' : 'Lås mot feiltrykk'}
              aria-label={state.isLocked ? 'Lås opp skjerm' : 'Lås skjerm mot feiltrykk'}
              className={`p-1.5 rounded-full transition-all ${
                state.isLocked ? 'text-rose-400 bg-rose-950/60' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {state.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Treningsøkt-velger (kun synlig når timeren ikke har startet ennå) */}
        {state.status === 'idle' && (
          <div className="flex gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800/80 rounded-xl overflow-x-auto">
            {presets.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onSelectWorkout(tpl)}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  workout.id === tpl.id
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {tpl.type === 'tabata' ? <Zap className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                {tpl.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 2. HOVEDSEKSJON: Fase, Øvelsesnavn, Sirkulær indikator */}
      <main className="flex flex-col items-center justify-center flex-1 my-auto space-y-2 text-center z-10 min-h-0">
        {/* Rundenummer / Intervall & Fase-badge */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold tracking-wider text-zinc-400 uppercase">
            {state.totalRounds > 1 ? (
              <>
                <span>RUNDE {state.currentRound} AV {state.totalRounds}</span>
                <span>•</span>
                <span>ØVELSE {state.currentItemIndex + 1} AV {state.totalItems}</span>
              </>
            ) : (
              <span>INTERVALL {state.currentItemIndex + 1} AV {state.totalItems}</span>
            )}
          </div>

          <span
            className={`px-3 py-0.5 rounded-full text-[10px] sm:text-xs tracking-widest uppercase shadow-md transition-all ${phaseStyle.badgeBg}`}
          >
            {phaseStyle.badgeText}
          </span>
        </div>

        {/* Nåværende Øvelsesnavn */}
        <div className="min-h-[2.25rem] sm:min-h-[2.75rem] flex flex-col justify-center items-center px-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md line-clamp-1">
            {state.phase === 'prepare'
              ? 'Gjør deg klar'
              : state.phase === 'round_rest'
              ? 'Pust ut'
              : state.currentExercise?.name || workout.name}
          </h1>
          {state.phase === 'work' && state.currentExercise?.nameEn && (
            <span className="text-[10px] text-zinc-400 font-medium">
              ({state.currentExercise.nameEn})
            </span>
          )}
        </div>

        {/* Sirkulær fremdriftsvisning med stor tidsnedtelling */}
        <div className="py-1 flex items-center justify-center w-full max-h-[200px] xs:max-h-[230px]">
          <CircularProgress
            progress={state.phaseProgress}
            remainingSeconds={state.phaseRemainingSeconds}
            phase={state.phase}
          />
        </div>

        {/* Neste øvelse under timeren */}
        <div className="min-h-[1.5rem] flex items-center justify-center">
          {state.nextExercise && state.phase !== 'prepare' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-[11px] text-zinc-300 backdrop-blur-sm">
              <span className="text-zinc-500 font-semibold uppercase text-[10px]">Neste:</span>
              <span className="font-bold text-white line-clamp-1">{state.nextExercise.name}</span>
            </div>
          ) : state.phase === 'prepare' && state.currentExercise ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-[11px] text-zinc-300 backdrop-blur-sm">
              <span className="text-zinc-500 font-semibold uppercase text-[10px]">Først:</span>
              <span className="font-bold text-white line-clamp-1">{state.currentExercise.name}</span>
            </div>
          ) : null}
        </div>
      </main>

      {/* 3. BUNNBAR: Tommelknapper («Én hånd, ett blikk») */}
      <footer className="pt-2 pb-2 z-10">
        <div className="flex items-center justify-between gap-3 max-w-sm mx-auto">
          {/* Forrige-knapp */}
          <button
            onClick={onPrevious}
            disabled={state.status === 'idle' || state.isLocked}
            aria-label="Forrige intervall"
            className="flex-1 py-3 bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all rounded-2xl border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-sm"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Stor Hovedknapp (Start / Pause / Fortsett) */}
          {state.status === 'idle' ? (
            <button
              onClick={onStart}
              disabled={state.isLocked}
              className="flex-[2.5] py-3.5 px-5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-6 h-6 fill-current" />
              START
            </button>
          ) : state.status === 'running' ? (
            <button
              onClick={onPause}
              disabled={state.isLocked}
              className="flex-[2.5] py-3.5 px-5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black text-lg rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Pause className="w-6 h-6 fill-current" />
              PAUSE
            </button>
          ) : (
            <button
              onClick={onResume}
              disabled={state.isLocked}
              className="flex-[2.5] py-3.5 px-5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-6 h-6 fill-current" />
              FORTSETT
            </button>
          )}

          {/* Hopp over-knapp */}
          <button
            onClick={onSkipNext}
            disabled={state.status === 'idle' || state.isLocked}
            aria-label="Neste intervall"
            className="flex-1 py-3 bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all rounded-2xl border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-sm"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Nullstill-knapp ved pause */}
        {state.status === 'paused' && !state.isLocked && (
          <div className="flex justify-center mt-2 animate-in fade-in duration-200">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-rose-400 py-1 px-3 rounded-lg hover:bg-zinc-900/60 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Avbryt og nullstill
            </button>
          </div>
        )}
      </footer>

      {/* LÅST SKJERM OVERLAY (Beskytter mot utilsiktede trykk) */}
      {state.isLocked && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400">
            <Lock className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Skjermen er låst</h3>
            <p className="text-xs text-zinc-400">
              Timeren kjører videre i bakgrunnen uten risiko for feiltrykk.
            </p>
          </div>
          <button
            onClick={onToggleLock}
            className="py-3 px-6 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold rounded-2xl border border-zinc-700 flex items-center gap-2 shadow-lg"
          >
            <Unlock className="w-5 h-5 text-rose-400" />
            Trykk for å låse opp
          </button>
        </div>
      )}

      {/* Sensorstatus Modal */}
      {isSensorModalOpen && (
        <SensorStatusModal onClose={() => setIsSensorModalOpen(false)} />
      )}
    </div>
  );
};
