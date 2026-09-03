import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Check, Sparkles, Flame } from 'lucide-react';
import {
  COACH_PERSONAS,
  CoachPersonaId,
  setActiveCoachPersona,
  preloadPersonaAudio,
  playPersonaPreview,
  stopCurrentPersonaAudio,
} from '../../services/coachPersonaService';
import { setWeeklyGoal } from '../../services/weeklyGoalService';
import { recordEngagementEvent } from '../../services/telemetryService';
import { markOnboardingDone } from '../../services/onboardingService';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface OnboardingFlowProps {
  /** Kalles når flyten er ferdig (fullført ELLER hoppet over) — App skjuler gaten. */
  onComplete: () => void;
}

const QUICK_GOALS = [
  { value: 2, label: '2 økter' },
  { value: 3, label: '3 økter' },
  { value: 4, label: '4+ økter' },
] as const;

/**
 * Førstegangs-onboarding (C2, spec § 3; mockup-valg A): tre steg —
 * trenerstemme (med ▶-lydprøver; første trykk er også lyd-opplåsingen),
 * ukesmål og foreslått førsteøkt. «Til første økta» lukker flyten med
 * timeren + anbefalt program synlig (planpresisering 4): selve START-trykket
 * er brukergesten som låser opp WebAudio — en auto-start ville gitt stum lyd.
 */
export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPersona, setSelectedPersona] = useState<CoachPersonaId | null>(null);
  const [playingId, setPlayingId] = useState<CoachPersonaId | null>(null);
  const [goal, setGoal] = useState(3);
  const [customGoalOpen, setCustomGoalOpen] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef);

  // UU (fix-løkke B4): fokus flyttes til stegets overskrift ved mount og hvert
  // steg-bytte, slik at skjermleser annonserer konteksten og tastaturbrukeren
  // starter øverst i det nye steget. tabIndex={-1} gjør h1 programmatisk
  // fokuserbar uten å legge den i tab-rekkefølgen.
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // StrictMode-guard (samme mønster som WorkoutSummary): dobbel effekt-kjøring
  // i dev skal ikke doble started-telleren. Ref-en overlever simulert remount.
  const startedReportedRef = useRef(false);
  useEffect(() => {
    if (startedReportedRef.current) return;
    startedReportedRef.current = true;
    recordEngagementEvent('onboarding_started');
  }, []);

  useEffect(() => {
    return () => {
      stopCurrentPersonaAudio();
    };
  }, []);

  const handleSkip = () => {
    // Ingen persona settes aktivt — appens egen default (standard) gjelder.
    markOnboardingDone();
    recordEngagementEvent('onboarding_skipped');
    onComplete();
  };

  const handleTogglePreview = async (id: CoachPersonaId) => {
    if (playingId === id) {
      stopCurrentPersonaAudio();
      setPlayingId(null);
      return;
    }
    setPlayingId(id);
    const audio = await playPersonaPreview(id);
    if (audio) {
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
    } else {
      setPlayingId(null);
    }
  };

  const handlePersonaNext = () => {
    if (!selectedPersona) return;
    stopCurrentPersonaAudio();
    setPlayingId(null);
    // Som i CoachPersonaModal (β6): valget setter aksentfarge og varmer
    // hele personaens lydsett — offline-klart før første økt.
    setActiveCoachPersona(selectedPersona);
    void preloadPersonaAudio(selectedPersona);
    recordEngagementEvent(`onboarding_personaChosen_${selectedPersona}`);
    setStep(2);
  };

  const handleGoalNext = () => {
    setWeeklyGoal(goal);
    recordEngagementEvent('onboarding_goalSet');
    setStep(3);
  };

  const handleStartFirstWorkout = () => {
    markOnboardingDone();
    recordEngagementEvent('onboarding_firstWorkoutStarted');
    onComplete();
  };

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-flow-title"
      className="fixed inset-0 z-[60] bg-zinc-950 text-zinc-100 overflow-y-auto animate-in fade-in duration-200 focus:outline-none"
    >
      <div className="min-h-full w-full max-w-md mx-auto p-5 flex flex-col gap-5">
        {/* Topplinje: stegindikator + Hopp over (på alle steg, spec § 3) */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Steg {step} av 3
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-zinc-400 hover:text-zinc-200 font-semibold transition-colors"
          >
            Hopp over
          </button>
        </div>

        {step === 1 && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Velkommen til Min Trener
              </div>
              <h1
                id="onboarding-flow-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-black text-white tracking-tight outline-none"
              >
                Hvem skal trene deg?
              </h1>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Trykk ▶ for å høre en stemmeprøve, og velg treneren som passer deg.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {COACH_PERSONAS.map((persona) => {
                const isSelected = selectedPersona === persona.id;
                const isStandard = persona.id === 'standard';
                const isPlaying = playingId === persona.id;
                return (
                  <div
                    key={persona.id}
                    className={`flex items-center gap-2 p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    } ${isStandard && !isSelected ? 'opacity-60' : ''}`}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`Velg ${persona.name}`}
                      onClick={() => setSelectedPersona(persona.id)}
                      className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                    >
                      <span className="text-2xl shrink-0">{persona.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-xs font-black text-white truncate">
                          {persona.name}
                        </span>
                        <span className="block text-[10px] text-zinc-400 truncate">
                          {persona.dialectOrStyle}
                        </span>
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {persona.previewUrl && (
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(persona.id)}
                          aria-label={`Forhåndshør ${persona.name}`}
                          aria-pressed={isPlaying}
                          title="Hør stemmeprøve"
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ${
                            isPlaying
                              ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black animate-pulse'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                          }`}
                        >
                          {isPlaying ? (
                            <Square className="w-3 h-3 fill-current" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                        </button>
                      )}
                      <div
                        aria-hidden="true"
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'bg-amber-500 border-amber-400 text-zinc-950'
                            : 'border-zinc-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handlePersonaNext}
              disabled={selectedPersona === null}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 active:scale-[0.98] text-zinc-950 font-black rounded-2xl shadow-lg transition-all text-sm mt-auto"
            >
              Videre
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-center space-y-2">
              <h1
                id="onboarding-flow-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-black text-white tracking-tight outline-none"
              >
                Hvor ofte vil du trene?
              </h1>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Dette blir ukesmålet ditt — og grunnlaget for streaken din.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {QUICK_GOALS.map((choice) => {
                const isSelected = !customGoalOpen && goal === choice.value;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={choice.label}
                    onClick={() => {
                      setCustomGoalOpen(false);
                      setGoal(choice.value);
                    }}
                    className={`py-4 px-2 rounded-2xl border text-sm font-black transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xl">{choice.label.split(' ')[0]}</span>
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {choice.label.split(' ')[1]}/uke
                    </span>
                  </button>
                );
              })}
            </div>

            {customGoalOpen ? (
              <div className="flex items-center justify-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl py-3">
                <button
                  type="button"
                  aria-label="Senk ukesmålet"
                  onClick={() => setGoal((g) => Math.max(1, g - 1))}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black text-base flex items-center justify-center transition-all active:scale-95"
                >
                  -
                </button>
                <span className="text-sm font-black text-white w-20 text-center">
                  {goal} {goal === 1 ? 'økt' : 'økter'}
                </span>
                <button
                  type="button"
                  aria-label="Øk ukesmålet"
                  onClick={() => setGoal((g) => Math.min(14, g + 1))}
                  className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base flex items-center justify-center transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCustomGoalOpen(true)}
                className="text-xs text-zinc-400 hover:text-zinc-200 font-semibold transition-colors self-center"
              >
                Tilpass
              </button>
            )}

            <button
              type="button"
              onClick={handleGoalNext}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black rounded-2xl shadow-lg transition-all text-sm mt-auto"
            >
              Videre
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-center space-y-2">
              <h1
                id="onboarding-flow-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-black text-white tracking-tight outline-none"
              >
                Klar for første økt?
              </h1>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Vi har lagt klar en utstyrsfri økt — treneren din venter i ørene.
              </p>
            </div>

            {/* Anbefalt førsteøkt = appens default-økt: den ligger alt klar i
                timeren når flyten lukkes, så avstanden til START er ett trykk. */}
            <div className="bg-zinc-900/80 border border-emerald-500/40 rounded-2xl p-4 text-left space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{TABATA_WORKOUT.name}</p>
                  <p className="text-[10px] text-zinc-400">
                    Utstyrsfritt · {TABATA_WORKOUT.rounds} runder · perfekt som førsteøkt
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {TABATA_WORKOUT.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartFirstWorkout}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black rounded-2xl shadow-lg transition-all text-sm mt-auto"
            >
              Til første økta
            </button>
          </>
        )}
      </div>
    </div>
  );
};
