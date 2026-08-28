import React, { useState, useEffect, useRef } from 'react';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { VoiceTone } from '../../schemas/profileSchema';
import { VoiceCoachEngine } from '../../services/voiceCoachService';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';
import { getPersonalRecord, savePersonalRecord } from '../../services/personalRecordService';
import { audioService } from '../../services/audioService';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Trophy,
  Check,
  ArrowLeft,
  Flame,
} from 'lucide-react';

interface MicroTimerDisplayProps {
  exercise: ExerciseItem;
  initialDurationSeconds?: number;
  initialTone?: VoiceTone;
  onClose: () => void;
  onComplete?: (durationSeconds: number, feedback?: 'lett' | 'passe' | 'tungt') => void;
}

const PRESET_DURATIONS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
];

export const MicroTimerDisplay: React.FC<MicroTimerDisplayProps> = ({
  exercise,
  initialDurationSeconds = 60,
  initialTone = 'rolig',
  onClose,
  onComplete,
}) => {
  const [targetDuration, setTargetDuration] = useState<number>(initialDurationSeconds);
  const [isHoldMode, setIsHoldMode] = useState<boolean>(false);
  const [tone, setTone] = useState<VoiceTone>(initialTone);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [feedback, setFeedback] = useState<'lett' | 'passe' | 'tungt' | null>(null);

  // Personlig rekord for denne øvelsen
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  useEffect(() => {
    getPersonalRecord(undefined, exercise.id).then((pr) => {
      if (pr) setPersonalBest(pr.bestSeconds);
    });
  }, [exercise.id]);

  const startTimeRef = useRef<number | null>(null);
  const pausedElapsedRef = useRef<number>(0);
  const voiceCoachRef = useRef<VoiceCoachEngine | null>(null);

  // Initialiser VoiceCoachEngine
  useEffect(() => {
    voiceCoachRef.current = new VoiceCoachEngine(
      {
        totalSeconds: isHoldMode ? 0 : targetDuration,
        tone,
        isHoldMode,
        personalRecordSeconds: personalBest,
      },
      (sub) => setCurrentSubtitle(sub)
    );
    voiceCoachRef.current.setSpeechEnabled(speechEnabled);
  }, [targetDuration, tone, isHoldMode, personalBest, speechEnabled]);

  // Hovedtidsløkke med timestamp-driftkontroll
  useEffect(() => {
    if (status !== 'running') return;

    startTimeRef.current = Date.now() - pausedElapsedRef.current * 1000;

    const interval = setInterval(() => {
      if (!startTimeRef.current) return;
      const now = Date.now();
      const currentElapsed = Math.floor((now - startTimeRef.current) / 1000);
      setElapsedSeconds(currentElapsed);

      const remaining = isHoldMode ? 0 : Math.max(0, targetDuration - currentElapsed);

      // Trigger lydeffekter
      if (soundEnabled) {
        if (!isHoldMode && remaining >= 1 && remaining <= 3) {
          audioService.playCountdownBeep(soundEnabled);
        } else if (!isHoldMode && remaining === 0) {
          audioService.playWorkoutComplete(soundEnabled);
        }
      }

      // Trigger stemmemeldinger
      if (voiceCoachRef.current) {
        voiceCoachRef.current.tick(currentElapsed, remaining);
      }

      // Sjekk om ferdig i nedtellingsmodus
      if (!isHoldMode && currentElapsed >= targetDuration) {
        setStatus('completed');
        pausedElapsedRef.current = targetDuration;

        if (targetDuration > personalBest) {
          savePersonalRecord(undefined, exercise.id, exercise.navn.nb, targetDuration);
          setPersonalBest(targetDuration);
          setIsNewRecord(true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, targetDuration, isHoldMode, soundEnabled, personalBest, exercise.id, exercise.navn.nb]);

  const handleStart = () => {
    audioService.unlockAudio();
    audioService.playWorkStart(soundEnabled);
    setStatus('running');
    pausedElapsedRef.current = 0;
    setElapsedSeconds(0);
    setIsNewRecord(false);
    if (voiceCoachRef.current) {
      voiceCoachRef.current.reset();
      voiceCoachRef.current.tick(0, isHoldMode ? 0 : targetDuration);
    }
  };

  const handlePause = () => {
    setStatus('paused');
    pausedElapsedRef.current = elapsedSeconds;
  };

  const handleResume = () => {
    audioService.unlockAudio();
    setStatus('running');
  };

  const handleStopHold = () => {
    setStatus('completed');
    pausedElapsedRef.current = elapsedSeconds;

    if (elapsedSeconds > personalBest) {
      savePersonalRecord(undefined, exercise.id, exercise.navn.nb, elapsedSeconds);
      setPersonalBest(elapsedSeconds);
      setIsNewRecord(true);
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setElapsedSeconds(0);
    pausedElapsedRef.current = 0;
    setCurrentSubtitle('');
    setIsNewRecord(false);
  };

  const remaining = isHoldMode ? elapsedSeconds : Math.max(0, targetDuration - elapsedSeconds);
  const displayMinutes = Math.floor(remaining / 60);
  const displaySeconds = remaining % 60;
  const formattedTime = `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`;

  const progressPercent = isHoldMode
    ? personalBest > 0 ? Math.min(100, Math.round((elapsedSeconds / personalBest) * 100)) : 100
    : Math.min(100, Math.round((elapsedSeconds / targetDuration) * 100));

  // FULLFØRT SKJERM
  if (status === 'completed') {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl">
          <Check className="w-10 h-10 stroke-[3]" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Microtrening fullført</span>
          <h2 className="text-3xl font-black text-white">{exercise.navn.nb}</h2>
          <p className="text-base text-zinc-300 font-mono font-black">
            Tid gjennomført: <strong className="text-emerald-400">{formattedTime}</strong>
          </p>
        </div>

        {isNewRecord && (
          <div className="p-3 bg-amber-950/80 border border-amber-500/70 rounded-2xl flex items-center gap-3 text-amber-300 max-w-xs mx-auto shadow-lg animate-bounce">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="text-left text-xs">
              <p className="font-black text-white">Ny personlig rekord!</p>
              <p className="text-[11px] text-amber-200">{elapsedSeconds} sekunder holdt!</p>
            </div>
          </div>
        )}

        {/* For lett / passe / for tungt feedback */}
        <div className="space-y-2 max-w-xs w-full">
          <p className="text-xs font-bold text-zinc-400">Hvordan føltes økten?</p>
          <div className="grid grid-cols-3 gap-2">
            {(['lett', 'passe', 'tungt'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFeedback(f)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                  feedback === f
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-black'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 max-w-xs w-full pt-2">
          <button
            onClick={handleReset}
            className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded-2xl border border-zinc-800"
          >
            Prøv igjen
          </button>
          <button
            onClick={() => {
              if (onComplete) onComplete(elapsedSeconds, feedback || undefined);
              onClose();
            }}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20"
          >
            Ferdig
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-white flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden">
      {/* 1. TOPPLINJE */}
      <header className="flex items-center justify-between shrink-0 z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lukk</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
            Microtimer
          </span>
          <h1 className="text-base font-black text-white truncate max-w-[200px]">{exercise.navn.nb}</h1>
        </div>

        {/* Lyd / Tale innstillinger */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className={`p-2 rounded-xl border transition-all ${
              speechEnabled ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            {speechEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-all ${
              soundEnabled ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. HOVEDINNHOLD */}
      <main className="flex-1 flex flex-col items-center justify-center my-auto space-y-4 max-w-lg mx-auto w-full">
        {/* Valg av varighet / Modus før start */}
        {status === 'idle' && (
          <div className="space-y-4 w-full animate-in fade-in">
            {/* Bildet av øvelsen */}
            <div className="w-36 h-36 mx-auto rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-xl">
              <ExerciseIllustration exercise={exercise} phaseIndex={0} className="w-full h-full" />
            </div>

            {/* Hold-modus toggle for statiske øvelser */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsHoldMode(false)}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all ${
                  !isHoldMode
                    ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                Nedtelling
              </button>
              <button
                type="button"
                onClick={() => setIsHoldMode(true)}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  isHoldMode
                    ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Hold til du gir opp
              </button>
            </div>

            {/* Varighets-chips (kun ved nedtellingsmodus) */}
            {!isHoldMode && (
              <div className="grid grid-cols-3 gap-2">
                {PRESET_DURATIONS.map((p) => (
                  <button
                    key={p.seconds}
                    onClick={() => setTargetDuration(p.seconds)}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      targetDuration === p.seconds
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Stemmetone-velger */}
            <div className="flex items-center justify-between p-2.5 bg-zinc-900/50 border border-zinc-850 rounded-2xl text-xs">
              <span className="text-zinc-400 font-medium">Stemmetone:</span>
              <div className="flex gap-1.5">
                {(['rolig', 'lek', 'gira', 'tørr'] as VoiceTone[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                      tone === t ? 'bg-emerald-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STOR NEDTELLING (>30% av skjermhøyden) */}
        {status !== 'idle' && (
          <div className="text-center space-y-4 w-full animate-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center">
              <div className="text-[22vw] sm:text-[140px] font-black font-mono tracking-tight leading-none text-white drop-shadow-2xl">
                {formattedTime}
              </div>
            </div>

            {/* Fremdriftslinje */}
            <div className="w-full max-w-sm mx-auto h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Personlig rekord indikator */}
            {personalBest > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Pers: <strong className="text-white">{personalBest}s</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Stemme-undertittel boks (For diskré/lydløs kontorbruk!) */}
        {currentSubtitle && (
          <div className="max-w-md w-full p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center shadow-lg animate-in fade-in">
            <p className="text-xs font-semibold text-emerald-300 leading-relaxed italic">
              «{currentSubtitle}»
            </p>
          </div>
        )}
      </main>

      {/* 3. BUNNBAR: TOMMELKONTROLLER */}
      <footer className="shrink-0 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] max-w-sm mx-auto w-full">
        {status === 'idle' ? (
          <button
            onClick={handleStart}
            className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xl rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-7 h-7 fill-current" />
            START MICROØKT
          </button>
        ) : status === 'running' ? (
          <div className="flex gap-3">
            {isHoldMode ? (
              <button
                onClick={handleStopHold}
                className="flex-1 py-4 bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-black text-lg rounded-2xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2"
              >
                STOPP (FERDIG)
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black text-lg rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <Pause className="w-6 h-6 fill-current" />
                PAUSE
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded-2xl border border-zinc-800 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Avbryt
            </button>
            <button
              onClick={handleResume}
              className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              FORTSETT
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
