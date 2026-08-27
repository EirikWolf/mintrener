import React, { useState } from 'react';
import { TimerState, WorkoutTemplate, IntervalPhase } from '../../types/workout';
import { CircularProgress } from './CircularProgress';
import { UserMenu } from '../auth/UserMenu';
import { SensorStatusModal } from '../sensors/SensorStatusModal';
import { HeartRateWidget } from '../sensors/HeartRateWidget';
import { MicroWorkoutModal } from '../micro/MicroWorkoutModal';
import { MicroTimerDisplay } from '../micro/MicroTimerDisplay';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { GpsTrackerModal } from '../gps/GpsTrackerModal';
import { GroupRoomModal } from '../group/GroupRoomModal';
import { AboutGuideModal } from '../help/AboutGuideModal';
import { AiCoachModal } from '../coach/AiCoachModal';
import { PwaInstallPromptModal } from '../pwa/PwaInstallPromptModal';
import { ChallengeCatalogModal } from '../challenges/ChallengeCatalogModal';
import { StrengthWorkoutModal } from '../strength/StrengthWorkoutModal';
import { STARTER_CHALLENGES } from '../../data/challenges';
import { getActiveChallengeId, getChallengeProgress } from '../../services/challengeService';
import { getFavoriteProgramIds } from '../../services/favoritesService';
import { TRAINING_PROGRAMS } from '../../data/programs';
import { getInterruptedSession, clearInterruptedSession, InterruptedSession } from '../../services/sessionRecoveryService';
import { checkAdaptiveProgression, ProgressionSuggestion } from '../../services/adaptiveProgressionService';
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
  Activity,
  Dumbbell,
  Mic,
  MicOff,
  ChevronRight,
  Star,
  Zap,
  Navigation,
  Users,
  Sparkles,
  Share2,
  Check,
  Target,
  Trophy,
} from 'lucide-react';
import { shareWorkout } from '../../services/shareWorkoutService';
import { calculateWeeklyProgress, WeeklyGoalProgress } from '../../services/weeklyGoalService';

interface TimerDisplayProps {
  workout: WorkoutTemplate;
  state: TimerState;
  presets: WorkoutTemplate[];
  onSelectWorkout: (w: WorkoutTemplate) => void;
  onStartWorkoutDirectly?: (w: WorkoutTemplate) => void;
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
  onToggleSpeech?: () => void;
  onOpenCurator?: () => void;
  onOpenPrograms?: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  workout,
  state,
  presets,
  onSelectWorkout,
  onStartWorkoutDirectly,
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
  onToggleSpeech,
  onOpenCurator,
  onOpenPrograms,
}) => {
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);
  const [isMicroModalOpen, setIsMicroModalOpen] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [isChallengesModalOpen, setIsChallengesModalOpen] = useState(false);
  const [isStrengthModalOpen, setIsStrengthModalOpen] = useState(false);
  const [activeMicroExercise, setActiveMicroExercise] = useState<ExerciseItem | null>(null);
  const [activeChallengeId, setActiveChallengeIdState] = useState<string | null>(() => getActiveChallengeId());
  const [interruptedSession, setInterruptedSession] = useState<InterruptedSession | null>(() => getInterruptedSession());
  const [adaptiveSuggestion, setAdaptiveSuggestion] = useState<ProgressionSuggestion | null>(null);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  React.useEffect(() => {
    const handler = () => {
      setActiveChallengeIdState(getActiveChallengeId());
    };
    window.addEventListener('challenge-progress-changed', handler);
    return () => window.removeEventListener('challenge-progress-changed', handler);
  }, []);

  const handleShareCurrentWorkout = async () => {
    const res = await shareWorkout(workout);
    if (res.copied) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyGoalProgress | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('mintrener_local_workout_history');
      const hist = raw ? JSON.parse(raw) : [];
      const sug = checkAdaptiveProgression(workout, hist);
      setAdaptiveSuggestion(sug);
      setWeeklyProgress(calculateWeeklyProgress(hist));
    } catch {
      setAdaptiveSuggestion(null);
      setWeeklyProgress(null);
    }
  }, [workout, state.status]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseStyles = (phase: IntervalPhase) => {
    switch (phase) {
      case 'prepare':
        return {
          bg: 'bg-zinc-950',
          badgeBg: 'bg-amber-950/80 text-amber-300 border border-amber-800/80',
          badgeText: 'Klargjøring',
        };
      case 'work':
        return {
          bg: 'bg-emerald-950/80',
          badgeBg: 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/80',
          badgeText: 'Arbeid',
        };
      case 'rest':
      case 'round_rest':
        return {
          bg: 'bg-amber-950/80',
          badgeBg: 'bg-amber-950/90 text-amber-300 border border-amber-700/80',
          badgeText: phase === 'round_rest' ? 'Rundehvile' : 'Hvile',
        };
      case 'complete':
        return {
          bg: 'bg-purple-950/40',
          badgeBg: 'bg-purple-950/80 text-purple-300 border border-purple-800/80',
          badgeText: 'Fullført',
        };
      default:
        return {
          bg: 'bg-zinc-950',
          badgeBg: 'bg-zinc-800 text-zinc-300',
          badgeText: 'Klar',
        };
    }
  };

  const phaseStyle = getPhaseStyles(state.phase);

  return (
    <div
      className={`relative flex flex-col justify-between w-full h-full max-w-md mx-auto px-4 pt-1.5 pb-2 select-none overflow-hidden transition-colors duration-500 ${phaseStyle.bg}`}
    >
      {/* 1. TOPPBAR */}
      <header className="flex flex-col gap-1.5 pt-0.5 shrink-0 z-10">
        <div className="flex items-center justify-between">
          {/* Venstre: Bruker & Tittel */}
          <div className="flex items-center gap-2">
            <UserMenu onOpenCurator={onOpenCurator} />
            <div className="flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span className="font-black text-xs sm:text-sm tracking-tight text-white">Min Trener</span>
              <button
                onClick={() => setIsAboutModalOpen(true)}
                title="Om Min Trener & Veiledning (?)"
                aria-label="Om Min Trener og hjelpeguide"
                className="w-5 h-5 rounded-full bg-zinc-900/90 border border-zinc-700/80 hover:border-emerald-400 text-zinc-400 hover:text-emerald-300 font-black text-[10px] flex items-center justify-center transition-all active:scale-95 shadow-sm ml-0.5"
              >
                ?
              </button>
            </div>
          </div>

          {/* Høyre: Sensor-, puls- og kontrollknapper */}
          <div className="flex items-center gap-1">
            {/* PWA Installer-knapp (vises kun i hvilemodus) */}
            {state.status === 'idle' && <PwaInstallPromptModal />}

            {/* Heart Rate Widget */}
            <HeartRateWidget />

            <div className="flex items-center gap-0.5 bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md rounded-full p-1 shadow-sm">
              {/* Norsk stemmeveiledning */}
              {onToggleSpeech && (
                <button
                  onClick={onToggleSpeech}
                  title={state.speechEnabled ? 'Norsk stemme på' : 'Stemme av'}
                  aria-label={state.speechEnabled ? 'Slå av stemme' : 'Slå på stemme'}
                  className={`p-1.5 rounded-full transition-all ${
                    state.speechEnabled ? 'text-emerald-400 bg-emerald-950/60' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {state.speechEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Dvale / Skjerm */}
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

              {/* Astrid AI-Trener */}
              <button
                onClick={() => setIsAiCoachOpen(true)}
                title="Astrid • AI-Trener"
                aria-label="Åpne AI-Trener"
                className="p-1.5 rounded-full text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all active:scale-95 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
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
        </div>

        {/* 2. FAVORITT-PROGRAMMER (2 rader grid på fremsiden når timeren er i hvilemodus) */}
        {state.status === 'idle' && (() => {
          const favoriteIds = getFavoriteProgramIds();
          const uniqueWorkoutsMap = new Map<string, WorkoutTemplate>();
          presets.forEach((w) => uniqueWorkoutsMap.set(w.id, w));
          TRAINING_PROGRAMS.forEach((p) => uniqueWorkoutsMap.set(p.workout.id, p.workout));

          const matchedFavs = favoriteIds
            .map((id) => uniqueWorkoutsMap.get(id))
            .filter((w): w is WorkoutTemplate => Boolean(w));

          const displayList = matchedFavs.length > 0 ? matchedFavs : presets;
          const hasScroll = displayList.length > 4;

          return (
            <div className="space-y-2 pt-0.5 relative">
              {/* 1. Fortsett der du slapp Banner */}
              {interruptedSession && (
                <div className="bg-amber-950/90 border border-amber-500/70 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Fortsett: {interruptedSession.workout.name}</p>
                      <p className="text-[10px] text-amber-300">Runde {interruptedSession.currentRound} • {Math.floor(interruptedSession.totalElapsedSeconds / 60)}m gjennomført</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        clearInterruptedSession();
                        setInterruptedSession(null);
                      }}
                      className="px-2 py-1 text-[10px] font-bold text-zinc-400 hover:text-white"
                    >
                      Forkast
                    </button>
                    <button
                      onClick={() => {
                        if (onStartWorkoutDirectly) {
                          onStartWorkoutDirectly(interruptedSession.workout);
                        }
                        setInterruptedSession(null);
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black rounded-xl shadow-sm active:scale-95"
                    >
                      Fortsett
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Adaptiv Progresjon forslag */}
              {adaptiveSuggestion && (
                <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 shadow-md animate-in fade-in ${
                  adaptiveSuggestion.type === 'increase'
                    ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
                    : 'bg-blue-950/90 border-blue-500/70 text-blue-300'
                }`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-white text-xs truncate">{adaptiveSuggestion.title}</p>
                      <p className="text-[10px] text-zinc-300 truncate">{adaptiveSuggestion.reason}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onSelectWorkout(adaptiveSuggestion.adaptedWorkout);
                      setAdaptiveSuggestion(null);
                    }}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs shrink-0 active:scale-95 shadow-sm"
                  >
                    Bruk
                  </button>
                </div>
              )}

              {/* 3. Ukesmål Fremdrift (Spec kap. 4) */}
              {weeklyProgress && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl text-xs shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg ${weeklyProgress.isGoalMet ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-300">
                      Ukesmål: <strong className="text-white">{weeklyProgress.completedThisWeek}</strong> av <strong>{weeklyProgress.goal}</strong> økter
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          weeklyProgress.isGoalMet ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${weeklyProgress.percentage}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono font-black ${weeklyProgress.isGoalMet ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {weeklyProgress.percentage}%
                    </span>
                  </div>
                </div>
              )}

              {/* 3b. Aktiv Utfordring Fremdriftskort (C.15, C.15b) */}
              {activeChallengeId && (() => {
                const challenge = STARTER_CHALLENGES.find((c) => c.id === activeChallengeId);
                if (!challenge) return null;
                const prog = getChallengeProgress(challenge.id);
                const currentDayData = challenge.dailyWorkouts.find((d) => d.day === prog.currentDay);
                const percent = Math.round((prog.completedDays.length / challenge.durationDays) * 100);

                return (
                  <div className="bg-amber-950/80 border border-amber-500/70 rounded-2xl p-2.5 space-y-2 shadow-lg animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{challenge.badgeReward.icon}</span>
                        <div>
                          <p className="text-xs font-black text-white">
                            {challenge.title} • Dag {prog.currentDay}/{challenge.durationDays}
                          </p>
                          <p className="text-[10px] text-amber-200">
                            {currentDayData?.isRestDay
                              ? 'I dag: Velfortjent hviledag ☕'
                              : `I dag: ${currentDayData?.title || 'Dagens økt'}`}
                          </p>
                        </div>
                      </div>

                      {currentDayData && !currentDayData.isRestDay && currentDayData.workout && (
                        <button
                          onClick={() => {
                            if (onStartWorkoutDirectly) {
                              onStartWorkoutDirectly(currentDayData.workout!);
                            } else {
                              onSelectWorkout(currentDayData.workout!);
                              onStart();
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 text-xs font-black rounded-xl shadow-md flex items-center gap-1 shrink-0"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Start dag {prog.currentDay}
                        </button>
                      )}
                    </div>

                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between px-1 gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    {matchedFavs.length > 0 ? `Favoritter (${matchedFavs.length})` : 'Hurtigstart'}
                  </span>
                  <button
                    onClick={() => setIsStrengthModalOpen(true)}
                    title="Styrketrening med Dobbel Progresjon"
                    className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-black text-emerald-400 hover:bg-emerald-900 transition-all flex items-center gap-0.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Dumbbell className="w-2.5 h-2.5" />
                    <span>Styrke</span>
                  </button>
                  <button
                    onClick={() => setIsChallengesModalOpen(true)}
                    title="Utfordringer (28/30 dagers program)"
                    className="px-1.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/80 text-[10px] font-black text-amber-400 hover:bg-amber-900 transition-all flex items-center gap-0.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Trophy className="w-2.5 h-2.5" />
                    <span>Utfordring</span>
                  </button>
                  <button
                    onClick={() => setIsMicroModalOpen(true)}
                    title="Microtrening (1 øvelse 1-5 min)"
                    className="px-1.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-800/80 text-[10px] font-black text-amber-400 hover:bg-amber-900 transition-all flex items-center gap-0.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Zap className="w-2.5 h-2.5 fill-current" />
                    <span>Micro</span>
                  </button>
                  <button
                    onClick={() => setIsGpsModalOpen(true)}
                    title="GPS Utendørsøkt (Løp, gå, sykkel)"
                    className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-black text-emerald-400 hover:bg-emerald-900 transition-all flex items-center gap-0.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Navigation className="w-2.5 h-2.5 fill-current" />
                    <span>GPS</span>
                  </button>
                  <button
                    onClick={() => setIsGroupModalOpen(true)}
                    title="Grupperom (Synkronisert timer)"
                    className="px-1.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-800/80 text-[10px] font-black text-purple-400 hover:bg-purple-900 transition-all flex items-center gap-0.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Users className="w-2.5 h-2.5" />
                    <span>Gruppe</span>
                  </button>
                </div>
                {onOpenPrograms && (
                  <button
                    onClick={onOpenPrograms}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 transition-colors shrink-0"
                  >
                    <span className="hidden xs:inline">Alle</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* 2 Rader Grid (Horisontal swipe ved > 4 økter) */}
              <div
                className={`grid grid-rows-2 gap-1.5 ${
                  hasScroll
                    ? 'grid-flow-col auto-cols-[142px] sm:auto-cols-[165px] overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory pr-4'
                    : 'grid-cols-2'
                }`}
              >
                {displayList.map((tpl) => {
                  const isSelected = workout.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => onSelectWorkout(tpl)}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center justify-between gap-1.5 shadow-sm snap-start shrink-0 ${
                        isSelected
                          ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-emerald-950/40'
                          : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-300' : 'text-zinc-200'}`}>
                          {tpl.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 capitalize">
                          {tpl.items.length} øvelser {tpl.rounds > 1 ? `• ${tpl.rounds} rnd` : ''}
                        </p>
                      </div>

                      <div className={`p-1 rounded-lg shrink-0 ${
                        isSelected ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <Play className="w-3 h-3 fill-current" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Info-linje med totaltid, deleknapp og tittel */}
        <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400 font-medium">
          <div className="flex items-center gap-1.5 truncate max-w-[210px]">
            <span className="truncate font-semibold text-zinc-300">
              {workout.name}
            </span>
            <button
              onClick={handleShareCurrentWorkout}
              title="Del denne økten som lenke"
              className="p-1 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-all shrink-0 active:scale-95 flex items-center gap-0.5"
            >
              {shareCopied ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 animate-in fade-in">
                  <Check className="w-3 h-3" />
                  Kopiert!
                </span>
              ) : (
                <Share2 className="w-3 h-3" />
              )}
            </button>
          </div>
          <span className="font-mono bg-zinc-900/80 border border-zinc-800/60 rounded-md px-2 py-0.5 text-zinc-200">
            Totalt: <strong>{formatTime(state.totalRemainingSeconds)}</strong>
          </span>
        </div>
      </header>

      {/* 2. HOVEDSEKSJON: Fase, Øvelsesnavn, Sirkulær indikator */}
      <main className="flex flex-col items-center justify-center flex-1 my-auto space-y-1.5 text-center z-10 min-h-0">
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

        {/* Øvelsestittel (Stort og tydelig) */}
        <div className="min-h-[2rem] flex items-center justify-center px-4">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-black text-white tracking-tight line-clamp-1 drop-shadow-sm">
            {state.phase === 'prepare'
              ? 'Gjør deg klar'
              : state.currentExercise?.name || workout.name}
          </h1>
        </div>

        {/* Sirkelmåler med gjenværende tid */}
        <div className="w-full flex items-center justify-center py-1">
          <CircularProgress
            progress={state.phaseProgress}
            remainingSeconds={state.phaseRemainingSeconds}
            phase={state.phase}
          />
        </div>

        {/* Neste øvelse / Bevegelsesteller under timeren */}
        <div className="min-h-[1.5rem] flex items-center justify-center gap-2">
          {state.motionReps !== undefined && state.motionReps > 0 && state.phase === 'work' && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-800/80 text-[11px] text-emerald-300 font-bold backdrop-blur-sm animate-in fade-in">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{state.motionReps} reps</span>
            </div>
          )}

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
      <footer className="pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shrink-0 z-10">
        <div className="flex items-center justify-between gap-2.5 max-w-sm mx-auto">
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
          <div className="flex justify-center mt-1 animate-in fade-in duration-200">
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

      {/* Microtrening Modal */}
      {isMicroModalOpen && (
        <MicroWorkoutModal
          onClose={() => setIsMicroModalOpen(false)}
          onStartMicroTimer={(ex) => {
            setActiveMicroExercise(ex);
          }}
          onStartMicroWorkout={(microWorkout) => {
            if (onStartWorkoutDirectly) {
              onStartWorkoutDirectly(microWorkout);
            } else {
              onSelectWorkout(microWorkout);
              onStart();
            }
          }}
        />
      )}

      {/* Dedikert Microtimer Fullskjerm */}
      {activeMicroExercise && (
        <MicroTimerDisplay
          exercise={activeMicroExercise}
          onClose={() => setActiveMicroExercise(null)}
        />
      )}

      {/* GPS Utendørsøkt Modal */}
      {isGpsModalOpen && (
        <GpsTrackerModal onClose={() => setIsGpsModalOpen(false)} />
      )}

      {/* Grupperom Modal */}
      {isGroupModalOpen && (
        <GroupRoomModal
          workout={workout}
          onClose={() => setIsGroupModalOpen(false)}
          onStartSyncedWorkout={(roomState) => {
            if (onStartWorkoutDirectly) {
              onStartWorkoutDirectly(roomState.workout);
            } else {
              onSelectWorkout(roomState.workout);
              onStart();
            }
          }}
        />
      )}

      {/* Om Min Trener & Veiledning Modal */}
      {isAboutModalOpen && (
        <AboutGuideModal onClose={() => setIsAboutModalOpen(false)} />
      )}

      {/* Astrid AI-Trener Modal */}
      {isAiCoachOpen && (
        <AiCoachModal
          onClose={() => setIsAiCoachOpen(false)}
          context={{
            currentWorkout: workout,
            weeklyGoal: weeklyProgress,
          }}
          onSelectWorkoutById={(id) => {
            const found = presets.find((p) => p.id === id);
            if (found) {
              if (onStartWorkoutDirectly) onStartWorkoutDirectly(found);
              else onSelectWorkout(found);
            }
          }}
        />
      )}

      {/* Utfordringer (Challenges 28/30 dager) Modal */}
      {isChallengesModalOpen && (
        <ChallengeCatalogModal
          onClose={() => setIsChallengesModalOpen(false)}
          onStartWorkout={(chalWorkout, _dayNum) => {
            if (onStartWorkoutDirectly) {
              onStartWorkoutDirectly(chalWorkout);
            } else {
              onSelectWorkout(chalWorkout);
              onStart();
            }
          }}
        />
      )}

      {/* Styrketrening med Dobbel Progresjon Modal */}
      {isStrengthModalOpen && (
        <StrengthWorkoutModal
          onClose={() => setIsStrengthModalOpen(false)}
        />
      )}
    </div>
  );
};
