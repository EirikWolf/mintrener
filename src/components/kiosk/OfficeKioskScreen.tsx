import React, { useState, useEffect, useMemo } from 'react';
import { WorkoutTemplate } from '../../types/workout';
import { MicroTimerDisplay } from '../micro/MicroTimerDisplay';
import { EXERCISE_LIBRARY } from '../../data/exercises';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import {
  Tv,
  Maximize2,
  Minimize2,
  X,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  Coffee,
} from 'lucide-react';

interface OfficeKioskScreenProps {
  onClose: () => void;
  onStartCustomWorkout?: (workout: WorkoutTemplate) => void;
}

const HEALTH_QUOTES = [
  '2 minutters bevegelse gir deg 20 % mer energi og fokus resten av arbeidsdagen.',
  'Stramme skuldre? En rask bryståpner motvirker tastaturlut og hodepine.',
  'Reis deg opp, trekk pusten dypt og kjenn blodsirkulasjonen vekkes.',
  'En liten pause nå forhindrer stiv nakke i kveld.',
  'Gjør kroppen og kollegaene en tjeneste – ta en 2-minutters strekk!',
];

const DEFAULT_SCHEDULED_TIMES = ['11:30', '14:00'];

export const OfficeKioskScreen: React.FC<OfficeKioskScreenProps> = ({
  onClose,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    Boolean(document.fullscreenElement)
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeMicroExercise, setActiveMicroExercise] = useState<ExerciseItem | null>(null);
  const [scheduledTimes] = useState<string[]>(DEFAULT_SCHEDULED_TIMES);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Klokke & sitat-rotasjon
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Sjekk om nåværende klokkeslett matcher en planlagt pause (på sekundet 00)
      const currentHM = now.toLocaleTimeString('nb-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (now.getSeconds() === 0 && scheduledTimes.includes(currentHM) && !activeMicroExercise) {
        // Auto-start 2-minutters kontorøkt (Nakke & Skuldre)
        const defaultEx =
          EXERCISE_LIBRARY.find((e) => e.id === 'skulder-dislocates') ||
          EXERCISE_LIBRARY[0];
        setActiveMicroExercise(defaultEx);
      }
    }, 1000);

    const quoteTimer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % HEALTH_QUOTES.length);
    }, 15000);

    return () => {
      clearInterval(timer);
      clearInterval(quoteTimer);
    };
  }, [scheduledTimes, activeMicroExercise]);

  // Fullskjerm lytter
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // WCAG: Escape for å lukke
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  };

  // Beregn tid til neste planlagte pause
  const nextBreakInfo = useMemo(() => {
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const upcoming = scheduledTimes
      .map((t) => {
        const [h, m] = t.split(':').map(Number);
        return { timeStr: t, minutes: h * 60 + m };
      })
      .filter((t) => t.minutes > currentMinutes)
      .sort((a, b) => a.minutes - b.minutes);

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const diffMin = next.minutes - currentMinutes;
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      const secs = 60 - now.getSeconds();
      return {
        targetTime: next.timeStr,
        hours,
        mins: secs === 60 ? mins : Math.max(0, mins - 1),
        secs: secs === 60 ? 0 : secs,
      };
    }

    return null;
  }, [currentTime, scheduledTimes]);

  const startInstantBreak = () => {
    const defaultEx =
      EXERCISE_LIBRARY.find((e) => e.id === 'skulder-dislocates') ||
      EXERCISE_LIBRARY[0];
    setActiveMicroExercise(defaultEx);
  };

  const formattedTime = currentTime.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-kiosk-title"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden"
    >
      {/* 1. Topplinje */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-400 flex items-center gap-2 shadow-lg">
            <Tv className="w-6 h-6 animate-pulse" />
            <span className="font-black text-sm tracking-wide uppercase">Kontor-TV Kiosk</span>
          </div>
          <span className="text-xs text-zinc-400 capitalize hidden sm:inline">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-label={soundEnabled ? 'Demp lyd' : 'Aktiver lyd'}
            className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all shadow-md active:scale-95"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>

          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Lukk fullskjerm' : 'Fullskjerm'}
            className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all shadow-md active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            aria-label="Lukk Kiosk"
            className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-md active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Hovedvisning (Sentral Klokke & Nedtelling) */}
      <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto my-auto">
        {/* Stor digital klokke */}
        <div className="space-y-1">
          <h1
            id="office-kiosk-title"
            className="text-6xl sm:text-8xl md:text-9xl font-black font-mono tracking-tight text-white drop-shadow-2xl"
          >
            {formattedTime}
          </h1>
          <p className="text-base sm:text-xl text-emerald-400 font-bold capitalize">
            {formattedDate}
          </p>
        </div>

        {/* Neste mikropause boks */}
        <div className="p-5 sm:p-6 bg-zinc-900/80 border border-zinc-800 rounded-3xl backdrop-blur-md max-w-lg w-full shadow-2xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1.5 text-amber-400">
              <Coffee className="w-4 h-4" />
              Faste Kontorpauser
            </span>
            <span>{scheduledTimes.join(' & ')}</span>
          </div>

          {nextBreakInfo ? (
            <div className="space-y-1">
              <p className="text-xs sm:text-sm text-zinc-300">
                Neste felles mikropause (kl. {nextBreakInfo.targetTime}) starter om:
              </p>
              <p className="text-2xl sm:text-3xl font-black font-mono text-white">
                {nextBreakInfo.hours > 0 ? `${nextBreakInfo.hours}t ` : ''}
                {nextBreakInfo.mins}m {String(nextBreakInfo.secs).padStart(2, '0')}s
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Dagens faste mikropauser er fullført!</p>
          )}

          <div className="pt-2">
            <button
              onClick={startInstantBreak}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Ta en 2-minutters pause nå</span>
            </button>
          </div>
        </div>

        {/* Helse-sitat */}
        <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-2xl max-w-md animate-in fade-in duration-500 flex items-center gap-2.5 text-xs text-zinc-300">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="italic">«{HEALTH_QUOTES[quoteIndex]}»</p>
        </div>
      </div>

      {/* 3. Bunn-info */}
      <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-900 pt-3">
        <span className="font-mono">Min Trener Digital Signage • v1.3</span>
        <span>Trykk Escape for å avslutte</span>
      </div>

      {/* Aktiv mikropause-avspiller */}
      {activeMicroExercise && (
        <MicroTimerDisplay
          exercise={activeMicroExercise}
          initialDurationSeconds={120}
          onClose={() => setActiveMicroExercise(null)}
          onComplete={() => setActiveMicroExercise(null)}
        />
      )}
    </div>
  );
};
