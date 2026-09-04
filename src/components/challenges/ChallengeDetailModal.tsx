import React, { useState, useEffect, useRef } from 'react';
import { ChallengeItem, ChallengeUserProgress } from '../../schemas/challengeSchema';
import { WorkoutTemplate } from '../../types/workout';
import {
  getChallengeProgress,
  completeChallengeDay,
  startChallengeAtDay,
  getActiveChallengeId,
  setActiveChallengeId,
} from '../../services/challengeService';
import { CalendarExportModal } from '../calendar/CalendarExportModal';
import { calculateWorkoutDuration } from '../../services/customWorkoutsService';
import { EXERCISE_LIBRARY } from '../../data/exercises/index';
import { ExerciseDetailModal } from '../library/ExerciseDetailModal';
import {
  X,
  Play,
  Check,
  Coffee,
  Trophy,
  Star,
  Calendar,
  Share2,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 * Varighet som en tid man kan sette av.
 *
 * Minutter rundes OPP. Tallet finnes for å bookes i en kalender, og en økt på
 * 2 min 25 s som meldes som «2 min» gjør deg forsinket til neste møte.
 */
function formatVarighet(sekunder: number): string {
  if (sekunder < 60) return `${sekunder} s`;
  return `${Math.ceil(sekunder / 60)} min`;
}

interface ChallengeDetailModalProps {
  challenge: ChallengeItem;
  onClose: () => void;
  onStartWorkout: (workout: WorkoutTemplate, dayNumber: number) => void;
}

export const ChallengeDetailModal: React.FC<ChallengeDetailModalProps> = ({
  challenge,
  onClose,
  onStartWorkout,
}) => {
  const [progress, setProgress] = useState<ChallengeUserProgress>(() =>
    getChallengeProgress(challenge.id)
  );
  const [isActive, setIsActive] = useState<boolean>(
    () => getActiveChallengeId() === challenge.id
  );
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  // Hvilken dag som er åpnet for forhåndsvisning. Null = dagsrutenettet vises.
  const [valgtDag, setValgtDag] = useState<number | null>(null);
  /**
   * Øvelsen som er slått opp fra dagsvisningen.
   *
   * Utfordringens `name` er ikke alltid katalogens: noen ganger kosmetisk
   * («Sprellmenn» mot «Sprellmenn (Jumping Jacks)»), noen ganger bevisst
   * tematisert (familie-utfordringen kaller sprellmenn «Kenguruhopp», og det er
   * en funksjon for barn), og noen ganger direkte feil («Skulderåpnere» peker
   * på en øvelse som krever strikk). Oppslaget går derfor på ID, ikke navn —
   * og det avslører den siste klassen i det du åpner den.
   */
  const [oppslåttØvelse, setOppslåttØvelse] = useState<string | null>(null);
  const [isShared, setIsShared] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  const handleShareChallenge = async () => {
    const shareData = {
      title: `${challenge.title} – Min Trener`,
      text: `Bli med på ${challenge.durationDays}-dagers utfordringen "${challenge.title}" i Min Trener!`,
      url: `https://mintrener.web.app/?c=${challenge.id}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      } catch {
        // Bruker avbrøt
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
    }
  };

  useEffect(() => {
    const handler = () => {
      setProgress(getChallengeProgress(challenge.id));
      setIsActive(getActiveChallengeId() === challenge.id);
    };
    window.addEventListener('challenge-progress-changed', handler);
    return () => window.removeEventListener('challenge-progress-changed', handler);
  }, [challenge.id]);

  const handleToggleActive = () => {
    if (isActive) {
      setActiveChallengeId(null);
      setIsActive(false);
    } else {
      setActiveChallengeId(challenge.id);
      setIsActive(true);
    }
  };

  /**
   * Et trykk på en dag ÅPNER den, det starter den ikke.
   *
   * Fram til 2026-09-01 startet trykket økta med det samme. Da fantes det ingen
   * vei fra dagsrutenettet til å se hva dagen inneholder — den som ville
   * forberede seg, måtte starte økta og avbryte den. Det var funnet.
   */
  const handleDayClick = (dayNum: number) => {
    if (!challenge.dailyWorkouts.some((d) => d.day === dayNum)) return;
    setValgtDag(dayNum);
  };

  const startDag = (dayNum: number) => {
    const dayData = challenge.dailyWorkouts.find((d) => d.day === dayNum);
    if (!dayData?.workout) return;
    onStartWorkout(dayData.workout, dayNum);
    onClose();
  };

  const fullførHviledag = (dayNum: number) => {
    completeChallengeDay(challenge.id, dayNum);
    setValgtDag(null);
  };

  const valgtDagData =
    valgtDag === null ? null : challenge.dailyWorkouts.find((d) => d.day === valgtDag) ?? null;

  /**
   * Hvor lang tid utfordringen tar per dag.
   *
   * Vises i toppen, ikke bare inne i en enkelt dag: spørsmålet «hvor mye tid må
   * jeg sette av» skal kunne besvares uten å lete gjennom dagsrutenettet.
   * Utfordringer med voksende økter (planke 20 s → 3 min) får et intervall —
   * ett tall ville løyet om halve programmet.
   */
  const varigheter = challenge.dailyWorkouts
    .filter((d) => !d.isRestDay && d.workout?.items.length)
    .map((d) => calculateWorkoutDuration(d.workout!));
  const varighetTekst = varigheter.length
    ? formatVarighet(Math.min(...varigheter)) === formatVarighet(Math.max(...varigheter))
      ? formatVarighet(Math.min(...varigheter))
      : `${formatVarighet(Math.min(...varigheter))}–${formatVarighet(Math.max(...varigheter))}`
    : null;

  const completedCount = progress.completedDays.length;
  const progressPercent = Math.round((completedCount / challenge.durationDays) * 100);

  // WCAG: Lukk ved trykk på Escape-tast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-detail-title"
        className="w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden text-white space-y-4 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-850 pb-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                {challenge.durationDays} dagers utfordring
              </span>
              <span className="text-[10px] font-bold text-zinc-400 capitalize">
                {challenge.category}
              </span>
              {varighetTekst && (
                <span
                  data-testid="utfordring-varighet"
                  className="text-[10px] font-bold text-zinc-300 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-zinc-400" aria-hidden="true" />
                  {varighetTekst} per dag
                </span>
              )}
            </div>
            <h2 id="challenge-detail-title" className="text-xl font-black text-white">{challenge.title}</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">{challenge.description}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aktiv toggle & Fremdriftsbar */}
        <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="text-xl">{challenge.badgeReward.icon}</div>
              <div>
                <p className="text-xs font-bold text-white">
                  Fullført: <strong>{completedCount}</strong> / {challenge.durationDays} dager
                </p>
                <p className="text-[10px] text-zinc-400">
                  Premie: <span className="text-emerald-400 font-bold">{challenge.badgeReward.name}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleShareChallenge}
                title="Del utfordring med venner eller kollegaer"
                className="py-1.5 px-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1"
              >
                {isShared ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isShared ? 'Delt!' : 'Del'}</span>
              </button>
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                title="Legg i kalender (Google / Apple / Outlook)"
                className="py-1.5 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Kalender</span>
              </button>
              <button
                onClick={handleToggleActive}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-md'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isActive ? 'fill-current' : ''}`} />
                {isActive ? 'Aktiv på Hjem' : 'Sett som aktiv'}
              </button>
            </div>
          </div>

          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Faser */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
          {challenge.phases.map((phase) => {
            const isCurrentPhase =
              progress.currentDay >= phase.dayRange[0] &&
              progress.currentDay <= phase.dayRange[1];
            const canFastForward = progress.currentDay < phase.dayRange[0];

            return (
              <div
                key={phase.name}
                className={`p-2 rounded-xl border text-[10px] flex flex-col justify-between ${
                  isCurrentPhase
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900/40 border-zinc-850 text-zinc-400'
                }`}
              >
                <div>
                  <p className="font-bold truncate">{phase.name}</p>
                  <p className="text-[9px] opacity-75">Dag {phase.dayRange[0]}–{phase.dayRange[1]}</p>
                </div>
                {canFastForward && (
                  <button
                    onClick={() => {
                      const updated = startChallengeAtDay(challenge.id, phase.dayRange[0]);
                      setProgress(updated);
                    }}
                    className="mt-1 text-[9px] text-cyan-400 hover:text-cyan-300 hover:underline text-left font-medium"
                    title={`Start utfordringen direkte på dag ${phase.dayRange[0]}`}
                  >
                    Start her (Nivå {phase.dayRange[0]}) →
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 28/30-Dagers Interaktivt Rutenett */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1" hidden={valgtDag !== null}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Dagsrutenett (trykk for å se øvelsene)
          </span>
          <div data-testid="dagsrutenett" className="grid grid-cols-5 sm:grid-cols-6 gap-2 pt-1">
            {challenge.dailyWorkouts.map((dayData) => {
              const isCompleted = progress.completedDays.includes(dayData.day);
              const isCurrent = progress.currentDay === dayData.day && !isCompleted;
              const isRest = dayData.isRestDay;

              return (
                <button
                  key={dayData.day}
                  type="button"
                  // Eksplisitt navn: uten det leste skjermleseren opp
                  // «Dag 12 Kontorøkt Dag 12» og sa ingenting om hva trykket gjør.
                  aria-label={`Dag ${dayData.day} — ${isRest ? 'hviledag' : 'vis øvelsene'}`}
                  onClick={() => handleDayClick(dayData.day)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-center ${
                    isCompleted
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-sm'
                      : isCurrent
                      ? 'bg-emerald-500 text-zinc-950 font-black border-white shadow-lg ring-2 ring-emerald-400/50'
                      : isRest
                      ? 'bg-zinc-900/40 border-zinc-850 text-amber-300/70 hover:bg-zinc-800'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <span className={`text-[10px] font-black ${isCurrent ? 'text-zinc-950' : 'text-zinc-400'}`}>
                    Dag {dayData.day}
                  </span>

                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isRest ? (
                    <Coffee className="w-4 h-4 text-amber-400" />
                  ) : isCurrent ? (
                    <Play className="w-4 h-4 fill-current animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold">{dayData.title.replace('Planke ', '').replace(' Push-ups', '').replace(' Knebøy', '')}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dagsvisning — hva dagen inneholder, og hvor lenge den varer */}
        {valgtDagData && (
          <div
            data-testid="dagsvisning"
            className="flex-1 overflow-y-auto pr-1 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-white">
                  Dag {valgtDagData.day} — {valgtDagData.title}
                </h3>
                <p className="text-[11px] text-zinc-400">{valgtDagData.goalNote}</p>
              </div>
              <button
                type="button"
                onClick={() => setValgtDag(null)}
                aria-label="Lukk dagsvisning"
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {valgtDagData.isRestDay || !valgtDagData.workout?.items.length ? (
              <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-2xl space-y-3">
                <p className="text-xs text-amber-200 flex items-center gap-2">
                  <Coffee className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Hviledag — ingen øvelser i dag.
                </p>
                {!progress.completedDays.includes(valgtDagData.day) && (
                  <button
                    type="button"
                    onClick={() => fullførHviledag(valgtDagData.day)}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-xs transition-all"
                  >
                    Marker hviledagen som fullført
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-zinc-300 flex items-center gap-1.5 font-bold">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  {formatVarighet(calculateWorkoutDuration(valgtDagData.workout))}
                  <span className="font-normal text-zinc-500">
                    · {valgtDagData.workout.items.length} øvelser
                  </span>
                </p>

                {/* Navnene er katalogens. Da kan øvelsen slås opp under Øvelser
                    FØR dagen starter — som var hele poenget med visningen. */}
                <ol className="space-y-1.5">
                  {valgtDagData.workout.items.map((item, i) => (
                    // Navn på egen linje, tid under. Første utkast hadde dem
                    // side om side, og på 375 px ble «Sittende skulder- og
                    // nakkeavspenning» til «Sittende skulder- og na…». Et
                    // avkuttet navn kan ikke slås opp under Øvelser — som var
                    // hele grunnen til at listen finnes.
                    <li
                      key={item.id}
                      className="flex items-start gap-2.5 p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl"
                    >
                      <span className="text-[10px] font-black text-zinc-500 shrink-0 w-4 pt-0.5">
                        {i + 1}.
                      </span>
                      <span className="min-w-0 space-y-0.5 flex-1">
                        {EXERCISE_LIBRARY.some((ex) => ex.id === item.exercise.id) ? (
                          <button
                            type="button"
                            onClick={() => setOppslåttØvelse(item.exercise.id)}
                            aria-label={`Vis hvordan ${item.exercise.name} utføres`}
                            className="block text-left text-xs font-bold text-white break-words underline decoration-dotted decoration-zinc-600 underline-offset-4 hover:decoration-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            {item.exercise.name}
                          </button>
                        ) : (
                          // Egendefinerte øvelser finnes ikke i katalogen. Uten
                          // denne grenen ville raden sett trykkbar ut og ikke
                          // gjort noe — verre enn ingen lenke.
                          <span className="block text-xs font-bold text-white break-words">
                            {item.exercise.name}
                          </span>
                        )}
                        <span className="block text-[11px] font-mono text-emerald-400">
                          {item.targetReps
                            ? `${item.targetReps} reps`
                            : `${item.workDurationSeconds} s`}
                          {item.restDurationSeconds > 0 && (
                            <span className="text-zinc-500"> + {item.restDurationSeconds} s pause</span>
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>

                <button
                  type="button"
                  onClick={() => startDag(valgtDagData.day)}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                  Start dag {valgtDagData.day}
                </button>
              </>
            )}
          </div>
        )}

        {/* Dagens Hurtigknapp — ute av veien mens en dag er åpnet, ellers står
            «Start dag 1» to ganger rett over hverandre. */}
        <div className="pt-2 border-t border-zinc-850 shrink-0" hidden={valgtDag !== null}>
          {progress.isCompleted ? (
            <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
              <Trophy className="w-5 h-5 text-amber-400" />
              Gratulerer! Du har fullført hele utfordringen!
            </div>
          ) : (
            <button
              onClick={() => handleDayClick(progress.currentDay)}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Dag {progress.currentDay} ({challenge.dailyWorkouts[progress.currentDay - 1]?.title || 'Økt'})
            </button>
          )}
        </div>
      </div>

      {oppslåttØvelse && (
        <ExerciseDetailModal
          exercise={EXERCISE_LIBRARY.find((ex) => ex.id === oppslåttØvelse)!}
          onClose={() => setOppslåttØvelse(null)}
        />
      )}

      {isCalendarModalOpen && (
        <CalendarExportModal
          challenge={challenge}
          onClose={() => setIsCalendarModalOpen(false)}
        />
      )}
    </div>
  );
};
