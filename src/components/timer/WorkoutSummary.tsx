import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WorkoutTemplate } from '../../types/workout';
import { CompletedWorkoutLog } from '../../types/models';
import { useAuth } from '../../contexts/AuthContext';
import { updateWorkoutRating } from '../../services/firestoreService';
import { savePersonalRecord } from '../../services/personalRecordService';
import { recordWorkoutTelemetry, recordEngagementEvent } from '../../services/telemetryService';
import { calculateWeeklyProgress, makeGoalForWeek, WeeklyGoalProgress } from '../../services/weeklyGoalService';
import { computeStreakDays, computeWeekStreak, WEEK_STREAK_MILESTONES, WeekStreakResult } from '../../services/streakService';
import {
  getUncelebratedMilestones,
  markMilestoneCelebrated,
  getLastReportedInsuranceWeek,
  markInsuranceReported,
  getLastReportedBreakWeek,
  markBreakReported,
} from '../../services/streakCelebrationService';
import { shouldShowAccountPrompt, dismissAccountPrompt, AccountPromptMoment } from '../../services/accountPromptService';
import { buildEffectiveHistory } from '../../services/summaryContextService';
import { localAiCoach } from '../../services/localAiCoachService';
import { WORKOUT_HISTORY_KEY as LOCAL_HISTORY_KEY } from '../../services/workoutHistoryStorage';
import { Trophy, RotateCcw, Flame, CheckCircle2, ThumbsUp, Smile, Medal, Sparkles } from 'lucide-react';

type WeekMilestone = (typeof WEEK_STREAK_MILESTONES)[number];

/**
 * Utsatt konto-prompt (spec § 4): tilbys anonyme brukere ved verdimomenter,
 * aldri som portvakt. Egen liten komponent for å holde WorkoutSummary lesbar;
 * shown-telemetrien hører til selve visningen og bor derfor i mount-effekten her.
 */
const AccountPromptCard: React.FC<{ moment: AccountPromptMoment; text: string }> = ({
  moment,
  text,
}) => {
  const { signInWithGoogle } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  // StrictMode-guard: dobbel effekt-kjøring i dev skal ikke doble shown-telleren.
  // Refs overlever StrictModes simulerte remount, så markøren holder.
  const shownReportedRef = useRef<AccountPromptMoment | null>(null);

  useEffect(() => {
    if (shownReportedRef.current === moment) return;
    shownReportedRef.current = moment;
    recordEngagementEvent(`accountPrompt_${moment}_shown`);
  }, [moment]);

  if (dismissed) return null;

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5 text-left">
      <p className="text-xs text-zinc-300 leading-snug">{text}</p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            recordEngagementEvent(`accountPrompt_${moment}_accepted`);
            signInWithGoogle();
          }}
          className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all text-zinc-950 font-bold text-xs rounded-xl"
        >
          Lagre med konto
        </button>
        <button
          onClick={() => {
            dismissAccountPrompt(moment);
            recordEngagementEvent(`accountPrompt_${moment}_dismissed`);
            setDismissed(true);
          }}
          className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 transition-all text-zinc-300 font-bold text-xs rounded-xl"
        >
          Ikke nå
        </button>
      </div>
    </div>
  );
};

interface WorkoutSummaryProps {
  workout: WorkoutTemplate;
  totalElapsedSeconds: number;
  workoutLogId?: string;
  onRestart: () => void;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({
  workout,
  totalElapsedSeconds,
  workoutLogId,
  onRestart,
}) => {
  const { user } = useAuth();
  const [selectedRating, setSelectedRating] = useState<'for_lett' | 'passe' | 'for_tungt' | null>(null);
  const [prStatus, setPrStatus] = useState<{ isNewPr: boolean; previousBest: number } | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalProgress | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [weekStreak, setWeekStreak] = useState<WeekStreakResult | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [celebratedMilestone, setCelebratedMilestone] = useState<WeekMilestone | null>(null);
  // Slinguke-feiring (spec § 2.1: «feires i etterkant») — serietallet fra resultatet
  const [insuranceSavedWeeks, setInsuranceSavedWeeks] = useState<number | null>(null);
  // Effekten under re-kjører når workoutLogId ankommer — uka skal likevel bare
  // telles/feires ÉN gang per fullført økt.
  const weekCompletedHandledRef = useRef(false);

  // Send anonym telemetri og sjekk PR ved fullføring
  useEffect(() => {
    recordWorkoutTelemetry(workout, totalElapsedSeconds);

    if (workout.items.length === 1 && totalElapsedSeconds > 5) {
      const ex = workout.items[0].exercise;
      savePersonalRecord(user?.uid, ex.id, ex.name, totalElapsedSeconds).then((res) => {
        if (res.isNewPr) {
          setPrStatus(res);
        }
      });
    }
  }, [workout, totalElapsedSeconds, user]);

  // Hent lokal historikk for å gi Astrid kontekst om ukesmål og streak.
  // MERK: App.tsx sin egen "lagre fullført økt"-effekt (som skriver denne
  // økten til lokal historikk) kan kjøre etter denne effekten - React kjører
  // barn-effekter før foreldre-effekter i samme commit, og selve skrivingen
  // skjer først når den asynkrone lagringen fullfører. `workoutLogId` settes
  // av App.tsx idet lagringen er ferdig, så effekten kjører på nytt da id-en
  // ankommer. buildEffectiveHistory avgjør (med eksakt id-match, ikke en
  // heuristikk) om økten allerede er inkludert i historikken, og stabler inn
  // en midlertidig oppføring for den hvis ikke - se summaryContextService.ts.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
      const history: CompletedWorkoutLog[] = raw ? JSON.parse(raw) : [];

      const effectiveHistory = buildEffectiveHistory(
        history,
        { workoutName: workout.name, durationSeconds: totalElapsedSeconds },
        workoutLogId
      );

      setWeeklyGoal(calculateWeeklyProgress(effectiveHistory));

      const dates = effectiveHistory.map((log) => new Date(log.completedAt).toISOString().split('T')[0]);
      setStreakDays(computeStreakDays(dates));

      // Uke-streak (C1): avledet fra samme effektive historikk. Feiringstekster
      // og konto-prompt genererer tallene sine fra dette resultatet — aldri
      // antatt aritmetikk (forsikret uke bevarer serien uten å telle +1).
      // ÉN makeGoalForWeek-instans deles av begge beregningene (B3): den leser
      // målloggen fra localStorage én gang, ikke per uke i simuleringen.
      const goalForWeek = makeGoalForWeek();
      const streak = computeWeekStreak(effectiveHistory, goalForWeek);
      setWeekStreak(streak);
      setHistoryCount(effectiveHistory.length);

      // Fullførte DENNE økta uka? Beregn streaken også UTEN øktas egen logg:
      // overgangen false → true på currentWeekCompleted er signalet.
      const sessionId = workoutLogId ?? 'pending-session';
      const before = computeWeekStreak(
        effectiveHistory.filter((log) => log.id !== sessionId),
        goalForWeek
      );
      const weekJustCompleted = streak.currentWeekCompleted && !before.currentWeekCompleted;

      if (weekJustCompleted && !weekCompletedHandledRef.current) {
        weekCompletedHandledRef.current = true;
        recordEngagementEvent('streak_weekCompleted');

        const uncelebrated = getUncelebratedMilestones(streak.reachedMilestones);
        if (uncelebrated.length > 0) {
          // Feir høyeste ufeirede i banneret; markér OG tell ALLE som feires
          // (B2) — retroaktiv bootstrap (eksisterende bruker med lang serie)
          // skal telle hver milepæl i telemetrien uten banner-kaskade.
          const milestone = Math.max(...uncelebrated) as WeekMilestone;
          uncelebrated.forEach((m) => {
            markMilestoneCelebrated(m);
            recordEngagementEvent(`streak_milestone_w${m as WeekMilestone}`);
          });
          setCelebratedMilestone(milestone);
        }
      }

      // Telemetri-produsenter for slinguke-forbruk og brudd (spec § 2.1/5):
      // begge avledes retroaktivt av hver beregning, så persisterte markører
      // deduper over re-render/StrictMode og på tvers av økter.
      const lastInsuredWeek =
        streak.insuranceUsedWeekKeys[streak.insuranceUsedWeekKeys.length - 1] ?? null;
      if (lastInsuredWeek !== null && lastInsuredWeek !== getLastReportedInsuranceWeek()) {
        markInsuranceReported(lastInsuredWeek);
        recordEngagementEvent('streak_insuranceUsed');
        // Feires i etterkant (spec § 2.1) — forsikring truer aldri før
        setInsuranceSavedWeeks(streak.currentWeeks);
      }
      if (
        streak.breakWeekKey !== null &&
        streak.lastBrokenWeeks > 0 &&
        streak.breakWeekKey !== getLastReportedBreakWeek()
      ) {
        markBreakReported(streak.breakWeekKey);
        // Ingen sørgetekst her — brudd re-frames kun i detaljarket (B1)
        recordEngagementEvent('streak_broken');
      }
    } catch {
      // Lokal historikk utilgjengelig - Astrid faller tilbake på generisk feedback
    }
  }, [workout, totalElapsedSeconds, workoutLogId]);

  // Astrids tilbakemelding - regenereres reaktivt når PR-status eller
  // brukerens vurdering av økten endrer seg. Puls er ikke koblet til her:
  // det finnes i dag ingen enkel kilde til gjennomsnitt/maks-puls for HELE
  // økten (kun sanntidsdata fra pulsbeltet via bluetoothHeartRateService),
  // og å bygge det er utenfor rammen av denne oppgaven.
  const astridFeedback = useMemo(
    () =>
      localAiCoach.generateWorkoutSummaryFeedback({
        workoutName: workout.name,
        durationSeconds: totalElapsedSeconds,
        isNewPr: prStatus?.isNewPr ?? false,
        rating: selectedRating,
        weeklyGoal,
        streakDays,
      }),
    [workout.name, totalElapsedSeconds, prStatus, selectedRating, weeklyGoal, streakDays]
  );

  // Konto-prompt-moment (spec § 4): week2 vinner når begge er aktuelle.
  // Kun for anonyme brukere, og en avvisning er varig per moment.
  const accountPromptMoment = useMemo<AccountPromptMoment | null>(() => {
    if (user) return null;
    if (celebratedMilestone === 2 && shouldShowAccountPrompt('week2', { isLoggedIn: false })) {
      return 'week2';
    }
    if (historyCount === 1 && shouldShowAccountPrompt('first_workout', { isLoggedIn: false })) {
      return 'first_workout';
    }
    return null;
  }, [user, celebratedMilestone, historyCount]);

  const accountPromptText =
    accountPromptMoment === 'week2' && weekStreak
      ? `${historyCount} økter og ${weekStreak.currentWeeks} uker på rad — vil du synkronisere fremgangen med en konto?`
      : 'Vil du ta vare på fremgangen din på tvers av enheter?';

  const handleRate = async (rating: 'for_lett' | 'passe' | 'for_tungt') => {
    setSelectedRating(rating);
    recordWorkoutTelemetry(workout, totalElapsedSeconds, rating);
    if (workoutLogId) {
      await updateWorkoutRating(user?.uid, workoutLogId, rating);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins} min ${secs} sek`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-md mx-auto h-full space-y-4 sm:space-y-6 overflow-y-auto animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/30">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-zinc-900 border border-emerald-500 rounded-full p-1 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      {prStatus?.isNewPr && (
        <div className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/20 border border-amber-500/60 text-amber-300 flex items-center justify-center gap-2 font-black text-sm animate-bounce shadow-md">
          <Medal className="w-5 h-5 text-amber-400 fill-current" />
          <span>🎉 NY PERSONLIG REKORD (PR)!</span>
        </div>
      )}

      {/* Milepælsfeiring (C1, spec § 2.2): etter økta som sikret uka — aldri push-varsel */}
      {celebratedMilestone !== null && (
        <div className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/20 border border-amber-500/60 text-amber-300 flex items-center justify-center gap-2 font-black text-sm animate-bounce shadow-md">
          <Flame className="w-5 h-5 text-amber-400 fill-current" />
          <span>🔥 {celebratedMilestone} uker på rad — milepæl nådd!</span>
        </div>
      )}

      {/* Slinguke-feiring (spec § 2.1: forsikring feires etterpå, truer aldri før).
          Sekundær til milepælsbanneret når begge er aktuelle. */}
      {insuranceSavedWeeks !== null && (
        <div className="w-full py-2 px-4 rounded-2xl bg-blue-950/60 border border-blue-500/50 text-blue-300 flex items-center justify-center gap-2 font-bold text-xs shadow-md">
          <span aria-hidden="true">🛡️</span>
          <span>Slinguka reddet serien din — fortsatt {insuranceSavedWeeks} uker!</span>
        </div>
      )}

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Bravo! Økt fullført!
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm">
          Du gjennomførte <strong className="text-zinc-200">{workout.name}</strong> med glans.
        </p>
      </div>

      {/* Oppsummeringskort */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col items-center">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-medium">Tid brukt</span>
          <span className="text-lg sm:text-xl font-bold text-white mt-0.5">{formatTime(totalElapsedSeconds)}</span>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col items-center">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-medium">Runder</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5">{workout.rounds} {workout.rounds === 1 ? 'runde' : 'runder'}</span>
        </div>
      </div>

      {/* Mestringsevaluering (Oppgave 3: For lett / Passe / For tungt) */}
      <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase font-bold text-zinc-300 tracking-wider">
            Hvordan føltes økten?
          </span>
          {selectedRating && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/60">
              Registrert!
            </span>
          )}
        </div>

        <div role="radiogroup" aria-label="Hvordan føltes økten?" className="grid grid-cols-3 gap-2">
          <button
            role="radio"
            aria-checked={selectedRating === 'for_lett'}
            onClick={() => handleRate('for_lett')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
              selectedRating === 'for_lett'
                ? 'bg-blue-950/80 border-blue-500 text-blue-300 shadow-sm'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Smile className="w-4 h-4 text-blue-400" />
            <span>For lett</span>
          </button>

          <button
            role="radio"
            aria-checked={selectedRating === 'passe'}
            onClick={() => handleRate('passe')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
              selectedRating === 'passe'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <ThumbsUp className="w-4 h-4 text-emerald-400" />
            <span>Passe</span>
          </button>

          <button
            role="radio"
            aria-checked={selectedRating === 'for_tungt'}
            onClick={() => handleRate('for_tungt')}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
              selectedRating === 'for_tungt'
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>For tungt</span>
          </button>
        </div>
      </div>

      {/* Øvelsesliste */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3 text-left">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          Gjennomførte øvelser ({workout.items.length})
        </h3>
        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
          {workout.items.map((item, idx) => (
            <div key={item.id} className="flex justify-between items-center text-xs py-0.5 border-b border-zinc-800/40 last:border-0">
              <span className="text-zinc-300 truncate pr-2">{idx + 1}. {item.exercise.name}</span>
              <span className="text-zinc-400 font-mono text-[11px] shrink-0">{item.workDurationSeconds}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Astrid AI Trener Feedback */}
      <div className="w-full bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-teal-950/40 border border-emerald-500/30 rounded-2xl p-3 text-left flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/40 text-emerald-400">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-emerald-400">Astrid • AI-Trener</span>
            <span className="text-[10px] px-1 bg-emerald-500/20 text-emerald-300 rounded font-semibold">Smart Coach</span>
          </div>
          <p className="text-xs text-zinc-300 leading-snug">{astridFeedback}</p>
        </div>
      </div>

      {/* Utsatt konto-prompt (spec § 4) */}
      {accountPromptMoment && (
        <AccountPromptCard moment={accountPromptMoment} text={accountPromptText} />
      )}

      {/* Start på nytt knapp */}
      <button
        onClick={onRestart}
        className="w-full py-3 sm:py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm sm:text-base shrink-0"
      >
        <RotateCcw className="w-5 h-5" />
        Ferdig / Ny økt
      </button>
    </div>
  );
};
