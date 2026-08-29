import React, { useState } from 'react';
import { TimerState, WorkoutTemplate, IntervalPhase } from '../../types/workout';
import { CircularProgress } from './CircularProgress';
import { UserMenu } from '../auth/UserMenu';
import { SensorStatusModal } from '../sensors/SensorStatusModal';
import { HeartRateWidget } from '../sensors/HeartRateWidget';
import { HeartRateLiveGraph } from '../sensors/HeartRateLiveGraph';
import { getUserMaxHeartRate } from '../../services/heartRateZoneService';
import { MicroWorkoutModal } from '../micro/MicroWorkoutModal';
import { MicroTimerDisplay } from '../micro/MicroTimerDisplay';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { GpsTrackerModal } from '../gps/GpsTrackerModal';
import { GroupRoomModal } from '../group/GroupRoomModal';
import { AboutGuideModal } from '../help/AboutGuideModal';
import { AiCoachModal } from '../coach/AiCoachModal';
import { ChallengeCatalogModal } from '../challenges/ChallengeCatalogModal';
import { StrengthWorkoutModal } from '../strength/StrengthWorkoutModal';
import { TvBigScreenDisplay } from '../instructor/TvBigScreenDisplay';
import { SkillTreeModal } from '../skills/SkillTreeModal';
import { AiWorkoutGeneratorModal } from '../ai/AiWorkoutGeneratorModal';
import { PainFilterModal } from './PainFilterModal';
import { voiceCommandService, TimerVoiceCommand } from '../../services/voiceCommandService';
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
  Activity,
  Dumbbell,
  Mic,
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
  TrendingUp,
  ShieldAlert,
  Tv,
} from 'lucide-react';
import { shareWorkout } from '../../services/shareWorkoutService';
import { calculateWeeklyProgress, WeeklyGoalProgress } from '../../services/weeklyGoalService';

interface FocusModeQuickControlsProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
  isVoiceControlActive: boolean;
  onToggleVoiceControl: () => void;
}

/**
 * Fokusmodus (Oppgave 8, revisjon §3.1/§4.1): minimal flytende kontrollstripe som
 * erstatter hele toppraden mens en økt kjører. Kun lås og lyd overlever hit — de to
 * kontrollene brukeren faktisk trenger midt i en økt i HR-sone 4/5, når blikkfeltet
 * er tunnelsyn og arbeidsminnet knapt rommer ett element. Stemmestyring-indikatoren
 * vises kun når den faktisk lytter, slik at stripen ikke tar plass unødvendig.
 */
const FocusModeQuickControls: React.FC<FocusModeQuickControlsProps> = ({
  soundEnabled,
  onToggleSound,
  isLocked,
  onToggleLock,
  isVoiceControlActive,
  onToggleVoiceControl,
}) => (
  // data-testid: stripen er en ren container uten landemerkerolle/tilgjengelig navn,
  // og knappene i den deler aria-label med toppradens — testene trenger et stabilt
  // anker for å skille «stripe synlig» fra «topprad synlig».
  <div data-testid="focus-quick-controls" className="absolute top-2 right-2 z-20 flex items-center gap-2">
    {isVoiceControlActive && (
      <button
        onClick={onToggleVoiceControl}
        aria-label="Håndfri stemmestyring aktiv (trykk for å pause)"
        className="w-11 h-11 flex items-center justify-center rounded-full text-indigo-400 bg-indigo-950/90 ring-1 ring-indigo-400/60 animate-pulse transition-all active:scale-95 shadow-lg"
      >
        <Mic className="w-5 h-5" />
      </button>
    )}

    {/* Lyd av/på (44x44px touch target) */}
    <button
      onClick={onToggleSound}
      role="switch"
      aria-checked={soundEnabled}
      aria-label="Lydvarsler"
      className={`w-11 h-11 flex items-center justify-center rounded-full border transition-all active:scale-95 shadow-lg backdrop-blur-sm ${
        soundEnabled
          ? 'bg-zinc-900/90 border-zinc-700 text-emerald-400 hover:bg-zinc-800'
          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-300'
      }`}
    >
      {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
    </button>

    {/* Skjermlås mot feiltrykk (44x44px touch target) */}
    <button
      onClick={onToggleLock}
      role="switch"
      aria-checked={isLocked}
      aria-label="Skjermlås"
      className={`w-11 h-11 flex items-center justify-center rounded-full border transition-all active:scale-95 shadow-lg backdrop-blur-sm ${
        isLocked
          ? 'bg-rose-950/90 border-rose-800 text-rose-400'
          : 'bg-zinc-900/90 border-zinc-700 text-zinc-400 hover:text-white'
      }`}
    >
      {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
    </button>
  </div>
);

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
  onToggleVibrate: _onToggleVibrate,
  onToggleWakeLock: _onToggleWakeLock,
  onToggleSpeech: _onToggleSpeech,
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
  const [isTvModeOpen, setIsTvModeOpen] = useState(false);
  const [isSkillTreeModalOpen, setIsSkillTreeModalOpen] = useState(false);
  const [isAiWorkoutModalOpen, setIsAiWorkoutModalOpen] = useState(false);
  const [isPainFilterOpen, setIsPainFilterOpen] = useState(false);
  const [isVoiceControlActive, setIsVoiceControlActive] = useState<boolean>(() => voiceCommandService.getIsListening());
  const [activeMicroExercise, setActiveMicroExercise] = useState<ExerciseItem | null>(null);
  const [activeChallengeId, setActiveChallengeIdState] = useState<string | null>(() => getActiveChallengeId());
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
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

  // Delt mellom mikrofon-knappen i toppraden og fokusmodus-stripen, slik at
  // av/på-lytting for håndfri stemmestyring ikke er duplisert to steder.
  const handleToggleVoiceControl = () => voiceCommandService.toggleListening();

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

  // Håndfri Stemmestyring Listener (Steg 1)
  React.useEffect(() => {
    const unsubscribe = voiceCommandService.onCommand((cmd: TimerVoiceCommand) => {
      switch (cmd) {
        case 'pause':
          onPause();
          break;
        case 'resume':
          if (state.status === 'idle') onStart();
          else onResume();
          break;
        case 'next':
          onSkipNext();
          break;
        case 'previous':
          onPrevious();
          break;
        case 'restart':
          onReset();
          break;
      }
    });

    const handleListeningChange = (e: any) => {
      setIsVoiceControlActive(Boolean(e.detail?.isListening));
    };

    window.addEventListener('voice-command-listening', handleListeningChange);
    return () => {
      unsubscribe();
      window.removeEventListener('voice-command-listening', handleListeningChange);
    };
  }, [state.status, onPause, onResume, onStart, onSkipNext, onPrevious, onReset]);

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

  // Fokusmodus (Oppgave 8): distillert visning under aktiv økt. Idle-visningen skal
  // være uendret — kun running/paused trigger den forenklede, forstørrede skjermen
  // (revisjon §3.1: tunnelsyn og lavt arbeidsminne i HR-sone 4/5).
  const isFocusMode = state.status === 'running' || state.status === 'paused';

  return (
    <div
      className={`relative flex flex-col justify-between w-full h-full max-w-md mx-auto px-4 pt-1.5 pb-2 select-none overflow-hidden transition-colors duration-500 ${phaseStyle.bg}`}
    >
      {/* Fokusmodus: minimal flytende stripe (lås + lyd + evt. stemmestyring) erstatter
          hele toppraden under aktiv økt, se FocusModeQuickControls over. */}
      {isFocusMode && (
        <FocusModeQuickControls
          soundEnabled={state.soundEnabled}
          onToggleSound={onToggleSound}
          isLocked={state.isLocked}
          onToggleLock={onToggleLock}
          isVoiceControlActive={isVoiceControlActive}
          onToggleVoiceControl={handleToggleVoiceControl}
        />
      )}

      {/* 1. TOPPBAR */}
      <header className="flex flex-col gap-1.5 pt-0.5 shrink-0 z-10">
        {/* Hele toppraden (bruker, logo, puls-pille, storskjerm, lyd/lås-pillen) skjules
            i fokusmodus — lås og lyd lever videre i FocusModeQuickControls i stedet. */}
        {!isFocusMode && (
        <div className="flex items-center justify-between">
          {/* Venstre: Bruker & Tittel */}
          <div className="flex items-center gap-2">
            <UserMenu onOpenCurator={onOpenCurator} />
            <div className="flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span className="font-black text-xs sm:text-sm tracking-tight text-white">Min Trener</span>
            </div>
          </div>

          {/* Høyre: Puls (hvis tilkoblet), Aktiv stemmestyring, Lyd og Lås */}
          <div className="flex items-center gap-1.5">
            {/* Heart Rate Widget (vises diskret når tilkoblet) */}
            <HeartRateWidget onHeartRateUpdate={setCurrentHeartRate} />

            {/* Aktiv lytter-indikator for håndfri stemmestyring (kun når aktiv) */}
            {isVoiceControlActive && (
              <button
                onClick={handleToggleVoiceControl}
                role="switch"
                aria-checked={isVoiceControlActive}
                aria-label="Håndfri stemmestyring"
                className="p-2 rounded-full text-indigo-400 bg-indigo-950/80 ring-1 ring-indigo-400/60 animate-pulse transition-all active:scale-95"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            {/* Storskjerm / TV-visning */}
            <button
              onClick={() => setIsTvModeOpen(true)}
              aria-label="Storskjerm- og TV-visning"
              title="Vis på storskjerm / TV"
              className="p-2 rounded-full border border-blue-800/80 bg-blue-950/80 text-blue-400 hover:text-white hover:bg-blue-900 transition-all active:scale-95 shadow-sm ring-1 ring-blue-500/20"
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Lyd av/på (44x44px touch target) */}
            <button
              onClick={onToggleSound}
              role="switch"
              aria-checked={state.soundEnabled}
              aria-label="Lydvarsler"
              className={`p-2 rounded-full border transition-all active:scale-95 ${
                state.soundEnabled
                  ? 'bg-zinc-900 border-zinc-700 text-emerald-400 hover:bg-zinc-800'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {state.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Skjermlås mot feiltrykk (44x44px touch target) */}
            <button
              onClick={onToggleLock}
              role="switch"
              aria-checked={state.isLocked}
              aria-label="Skjermlås"
              className={`p-2 rounded-full border transition-all active:scale-95 ${
                state.isLocked
                  ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              {state.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
        </div>
        )}

        {/* 2. FAVORITT-PROGRAMMER (2 rader grid på fremsiden når timeren er i hvilemodus) */}
        {state.status === 'idle' && (() => {
          const favoriteIds = getFavoriteProgramIds();
          const uniqueWorkoutsMap = new Map<string, WorkoutTemplate>();
          presets.forEach((w) => uniqueWorkoutsMap.set(w.id, w));
          TRAINING_PROGRAMS.forEach((p) =>
            uniqueWorkoutsMap.set(p.workout.id, { ...p.workout, voiceTone: p.voiceTone })
          );

          const matchedFavs = favoriteIds
            .map((id) => uniqueWorkoutsMap.get(id))
            .filter((w): w is WorkoutTemplate => Boolean(w));

          const displayList = matchedFavs.length > 0 ? matchedFavs : presets;
          const hasScroll = displayList.length > 4;

          return (
            <div className="space-y-2 pt-0.5 relative">
              {/* 1. Fortsett der du slapp Banner */}
              {interruptedSession && (
                // data-testid: banneret mangler semantisk rolle, og «Fortsett»-knappen
                // deler tekst med «Fortsett: <øktnavn>» — testene scoper queriene sine
                // til banneret for å unngå skjøre tekst-regexer.
                <div data-testid="restore-session-banner" className="bg-amber-950/90 border border-amber-500/70 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
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

              {/* 1. VERKTØY- OG MODUS-MATRISE (Alltid synlige på 2 linjer) */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5 py-0.5">
                <button
                  onClick={() => setIsChallengesModalOpen(true)}
                  aria-label="28 og 30 dagers treningsutfordringer"
                  className="py-1.5 px-1 rounded-xl bg-amber-950/80 border border-amber-500/50 text-[10px] sm:text-[11px] font-bold text-amber-300 hover:bg-amber-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 ring-1 ring-amber-400/20 text-center"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Utfordring</span>
                </button>
                <button
                  onClick={() => setIsPainFilterOpen(true)}
                  aria-label="Skade- og smertefilter for trygg trening"
                  className="py-1.5 px-1 rounded-xl bg-rose-950/80 border border-rose-500/50 text-[10px] sm:text-[11px] font-bold text-rose-300 hover:bg-rose-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 ring-1 ring-rose-400/20 text-center"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">Skånsom</span>
                </button>
                <button
                  onClick={() => setIsAiCoachOpen(true)}
                  aria-label="Astrid AI-Trener"
                  className="py-1.5 px-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-[10px] sm:text-[11px] font-bold text-emerald-300 hover:bg-emerald-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 text-center"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Astrid AI</span>
                </button>
                <button
                  onClick={() => setIsAiWorkoutModalOpen(true)}
                  aria-label="AI Treningsgenerator"
                  className="py-1.5 px-1 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-[10px] sm:text-[11px] font-bold text-indigo-300 hover:bg-indigo-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 text-center"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">AI Økt</span>
                </button>
                <button
                  onClick={() => setIsSkillTreeModalOpen(true)}
                  aria-label="Ferdighetstrær & Mestringsstige"
                  className="py-1.5 px-1 rounded-xl bg-purple-950/80 border border-purple-800/80 text-[10px] sm:text-[11px] font-bold text-purple-400 hover:bg-purple-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 text-center"
                >
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Ferdighet</span>
                </button>
                <button
                  onClick={() => setIsStrengthModalOpen(true)}
                  aria-label="Styrketrening med Dobbel Progresjon"
                  className="py-1.5 px-1 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-[10px] sm:text-[11px] font-bold text-emerald-400 hover:bg-emerald-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 text-center"
                >
                  <Dumbbell className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Styrke</span>
                </button>
                <button
                  onClick={() => setIsMicroModalOpen(true)}
                  aria-label="Microtrening"
                  className="py-1.5 px-1 rounded-xl bg-amber-950/80 border border-amber-800/80 text-[10px] sm:text-[11px] font-bold text-amber-400 hover:bg-amber-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 text-center"
                >
                  <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="truncate">Micro</span>
                </button>
                <button
                  onClick={() => setIsGpsModalOpen(true)}
                  aria-label="GPS Utendørsøkt"
                  className="py-1.5 px-1 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-[10px] sm:text-[11px] font-bold text-emerald-400 hover:bg-emerald-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 text-center"
                >
                  <Navigation className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="truncate">GPS</span>
                </button>
                <button
                  onClick={() => setIsGroupModalOpen(true)}
                  aria-label="Grupperom"
                  className="py-1.5 px-1 rounded-xl bg-purple-950/80 border border-purple-800/80 text-[10px] sm:text-[11px] font-bold text-purple-400 hover:bg-purple-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 text-center"
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Gruppe</span>
                </button>
                <button
                  onClick={() => setIsTvModeOpen(true)}
                  aria-label="Storskjerm og TV-visning"
                  className="py-1.5 px-1 rounded-xl bg-blue-950/80 border border-blue-800/80 text-[10px] sm:text-[11px] font-bold text-blue-400 hover:bg-blue-900 transition-all flex flex-col sm:flex-row items-center justify-center gap-1 shadow-sm active:scale-95 ring-1 ring-blue-400/20 text-center"
                >
                  <Tv className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">TV</span>
                </button>
              </div>

              {/* 2. FAVORITT-PROGRAMMER OVERSKRIFT & LENKE */}
              <div className="flex items-center justify-between px-1 pt-1.5 pb-0.5">
                <span className="text-[11px] uppercase font-black text-zinc-300 tracking-wider flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  {matchedFavs.length > 0 ? `Favorittøkter (${matchedFavs.length})` : 'Hurtigstart'}
                </span>
                {onOpenPrograms && (
                  <button
                    onClick={onOpenPrograms}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 transition-colors px-1 py-0.5"
                  >
                    <span>Alle programmer</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
                        <p className="text-[10px] text-zinc-400">
                          {tpl.items.length} øvelser {tpl.rounds > 1 ? `• ${tpl.rounds} runder` : ''}
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

        {/* Info-linje med totaltid, deleknapp og tittel — skjules i fokusmodus,
            øvelsesnavnet vises allerede stort i hovedseksjonen under */}
        {!isFocusMode && (
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
        )}
      </header>

      {/* 2. HOVEDSEKSJON: Fase, Øvelsesnavn, Sirkulær indikator */}
      <main className="flex flex-col items-center justify-center flex-1 my-auto space-y-1.5 text-center z-10 min-h-0">
        {/* Rundenummer / Intervall & Fase-badge — forstørres i fokusmodus for lesbarhet
            på 1,5 m avstand under aktiv økt (revisjon §3.1) */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`flex items-center gap-2 font-bold tracking-wider text-zinc-400 uppercase ${
              isFocusMode ? 'text-sm sm:text-base' : 'text-[10px] sm:text-xs'
            }`}
            // B6.1 (revisjon § 3.3 nivå 1): rundelinjen tar personaens aksentfarge
            // i fokusmodus. Variabelen settes av coachPersonaService; fallbacken
            // matcher text-zinc-400 slik at visningen er identisk uten persona.
            style={isFocusMode ? { color: 'var(--persona-accent, #a1a1aa)' } : undefined}
          >
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

          {/* Fase-badge beholdes alltid (aldri kun farge, jf. WCAG 1.4.1) og
              forstørres i fokusmodus sammen med resten av visningen */}
          <span
            aria-live="assertive"
            aria-atomic="true"
            className={`rounded-full tracking-widest uppercase shadow-md transition-all ${phaseStyle.badgeBg} ${
              isFocusMode ? 'px-4 py-1 text-sm' : 'px-3 py-0.5 text-[10px] sm:text-xs'
            }`}
            // B6.1: fasebadgens KANT tar persona-aksenten i fokusmodus — tekst- og
            // bakgrunnsfargene beholder fasesemantikken (WCAG 1.4.1, aldri kun farge).
            style={isFocusMode ? { borderColor: 'var(--persona-accent, #a1a1aa)' } : undefined}
          >
            {phaseStyle.badgeText}
          </span>
        </div>

        {/* Øvelsestittel (Stort og tydelig, enda større i fokusmodus) */}
        <div className="min-h-[2rem] flex items-center justify-center px-4" aria-live="polite" aria-atomic="true">
          <h1
            className={`font-black text-white tracking-tight drop-shadow-sm ${
              isFocusMode ? 'text-3xl sm:text-4xl line-clamp-2' : 'text-xl xs:text-2xl sm:text-3xl line-clamp-1'
            }`}
          >
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

        {/* Live Pulsgraf ved aktiv pulsmåling */}
        {currentHeartRate && state.status !== 'idle' && (
          <div className="w-full flex justify-center px-4 py-1">
            <HeartRateLiveGraph
              currentBpm={currentHeartRate}
              maxHr={getUserMaxHeartRate()}
              isRestPhase={state.phase === 'rest'}
            />
          </div>
        )}

        {/* Neste øvelse / Bevegelsesteller under timeren */}
        <div className="min-h-[1.5rem] flex items-center justify-center gap-2">
          {state.motionReps !== undefined && state.motionReps > 0 && state.phase === 'work' && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-800/80 text-[11px] text-emerald-300 font-bold backdrop-blur-sm animate-in fade-in">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{state.motionReps} reps</span>
            </div>
          )}

          {/* «Neste»/«Først»-pillen forstørres i fokusmodus — dette er en av de
              få tekstene brukeren fortsatt trenger å lese midt i en økt */}
          {state.nextExercise && state.phase !== 'prepare' ? (
            <div
              className={`flex items-center gap-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 backdrop-blur-sm ${
                isFocusMode ? 'px-3 py-1 text-base sm:text-lg' : 'px-2.5 py-0.5 text-[11px]'
              }`}
            >
              <span className={`text-zinc-400 font-semibold uppercase ${isFocusMode ? 'text-xs sm:text-sm' : 'text-[10px]'}`}>Neste:</span>
              <span className="font-bold text-white line-clamp-1">{state.nextExercise.name}</span>
            </div>
          ) : state.phase === 'prepare' && state.currentExercise ? (
            <div
              className={`flex items-center gap-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 backdrop-blur-sm ${
                isFocusMode ? 'px-3 py-1 text-base sm:text-lg' : 'px-2.5 py-0.5 text-[11px]'
              }`}
            >
              <span className={`text-zinc-400 font-semibold uppercase ${isFocusMode ? 'text-xs sm:text-sm' : 'text-[10px]'}`}>Først:</span>
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

      {/* TV & Storskjerm / Instruktør Visning */}
      {isTvModeOpen && (
        <TvBigScreenDisplay
          workout={workout}
          state={state}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onSkipNext={onSkipNext}
          onPrevious={onPrevious}
          onToggleSound={onToggleSound}
          onClose={() => setIsTvModeOpen(false)}
        />
      )}

      {/* Ferdighetstrær & Mestringsstige Modal */}
      {isSkillTreeModalOpen && (
        <SkillTreeModal
          onClose={() => setIsSkillTreeModalOpen(false)}
          onStartWorkout={(skillWorkout) => {
            if (onStartWorkoutDirectly) {
              onStartWorkoutDirectly(skillWorkout);
            } else {
              onSelectWorkout(skillWorkout);
              onStart();
            }
          }}
        />
      )}

      {/* AI Øktgenerator Modal */}
      {isAiWorkoutModalOpen && (
        <AiWorkoutGeneratorModal
          onClose={() => setIsAiWorkoutModalOpen(false)}
          onStartWorkout={(aiWorkout) => {
            if (onStartWorkoutDirectly) {
              onStartWorkoutDirectly(aiWorkout);
            } else {
              onSelectWorkout(aiWorkout);
              onStart();
            }
          }}
        />
      )}

      {/* Skade- & Smertefilter Modal */}
      {isPainFilterOpen && (
        <PainFilterModal
          workout={workout}
          onClose={() => setIsPainFilterOpen(false)}
          onApplyWorkout={(adapted) => {
            onSelectWorkout(adapted);
          }}
        />
      )}
    </div>
  );
};
