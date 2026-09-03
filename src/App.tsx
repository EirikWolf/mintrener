import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { PRESET_WORKOUTS, TABATA_WORKOUT } from './data/mockWorkouts';
import { WorkoutTemplate } from './types/workout';
import { useIntervalTimer } from './hooks/useIntervalTimer';
import { useWorkoutExitGuard } from './hooks/useWorkoutExitGuard';
import { useTabBackNavigation } from './hooks/useTabBackNavigation';
import { defaultSoundLevelForProfiles } from './services/soundLevelService';
import { STORAGE_KEYS } from './constants/storageKeys';
import { TimerDisplay } from './components/timer/TimerDisplay';
import { WorkoutSummary } from './components/timer/WorkoutSummary';
import { ExerciseLibraryView } from './components/library/ExerciseLibraryView';
import { WorkoutHistoryView } from './components/history/WorkoutHistoryView';
import { ProgramCatalogView } from './components/programs/ProgramCatalogView';
import { WorkoutBuilderView } from './components/builder/WorkoutBuilderView';
import { IS_CURATOR_ENABLED } from './constants/featureFlags';

// Lat import: kuratoren er et internt verktøy og skal ikke ligge i
// produksjonsbundelen. Med flagget av blir chunken aldri hentet.
const ExerciseImageCuratorView = lazy(() =>
  import('./components/curator/ExerciseImageCuratorView').then((m) => ({
    default: m.ExerciseImageCuratorView,
  }))
);
import { SettingsMoreView } from './components/settings/SettingsMoreView';
import { BottomNav, AppTab } from './components/navigation/BottomNav';
import { ErrorToast } from './components/feedback/ErrorToast';
import { showErrorToast } from './services/errorToastService';
import { getSharedWorkoutFromUrl } from './services/shareWorkoutService';
import { useAuth } from './contexts/AuthContext';
import { saveCompletedWorkout } from './services/firestoreService';
import { fetchCustomWorkouts } from './services/customWorkoutsService';
import { ProfileOnboardingModal } from './components/profile/ProfileOnboardingModal';
import { getUserProfilesState } from './services/profileCompositionService';
import { UserProfilesState } from './schemas/profileSchema';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { shouldShowOnboarding } from './services/onboardingService';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('timer');
  // Byggeren kan åpnes på to måter: som kopi av et katalogprogram, eller som
  // redigering av brukerens eget. Forskjellen avgjør om lagring lager dublett.
  const [builderMode, setBuilderMode] = useState<'kopi' | 'rediger'>('kopi');
  const [userProfiles, setUserProfiles] = useState<UserProfilesState>(() => getUserProfilesState());
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !userProfiles.hasCompletedOnboarding);
  // Delingslenken leses ÉN gang: kallet KONSUMERER ?w= (renser URL-en via
  // replaceState og teller åpnings-telemetri), så et andre kall ville sett
  // en tom URL. Både øktvalget og velkomstgaten under leser dette resultatet.
  const [sharedWorkoutArrival] = useState<WorkoutTemplate | null>(() =>
    getSharedWorkoutFromUrl()
  );
  // Førstegangs-onboarding (C2): fullskjerms-gate for helt ferske brukere.
  // Ingen early-return — completed-grenen over må forbli nåbar.
  // B3: en delingslenke (?w=) undertrykker gaten DENNE økta — mottakeren skal
  // rett til den delte økta. Ingenting markeres, så flyten kommer ved neste
  // besøk uten delingslenke.
  const [showWelcomeOnboarding, setShowWelcomeOnboarding] = useState<boolean>(
    () => sharedWorkoutArrival === null && shouldShowOnboarding()
  );
  // B2: når flyten nettopp er fullført/hoppet over, utsettes profilmodalen til
  // neste app-åpning (in-memory: nullstilles av seg selv ved neste besøk) —
  // «Til første økta» skal lande med START ett trykk unna, ikke bak en ny modal.
  const [welcomeHandledThisSession, setWelcomeHandledThisSession] = useState(false);

  // B5 (spec § 3: «kan gjenåpnes fra innstillinger»): SettingsMoreView
  // dispatcher eventen; gaten åpnes uavhengig av gate-vilkårene — fullføring
  // re-markerer bare done-flagget, helt ufarlig.
  useEffect(() => {
    const openWelcome = () => setShowWelcomeOnboarding(true);
    window.addEventListener('open-welcome-onboarding', openWelcome);
    return () => window.removeEventListener('open-welcome-onboarding', openWelcome);
  }, []);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutTemplate>(
    () => sharedWorkoutArrival || TABATA_WORKOUT
  );
  const [allPresets, setAllPresets] = useState<WorkoutTemplate[]>(PRESET_WORKOUTS);
  const { user } = useAuth();
  const hasSavedRef = useRef<boolean>(false);

  // Lytt til profilendringer
  useEffect(() => {
    const handleProfileChange = (e: Event) => {
      const custom = e as CustomEvent<UserProfilesState>;
      if (custom.detail) setUserProfiles(custom.detail);
    };
    window.addEventListener('user-profiles-changed', handleProfileChange);
    return () => window.removeEventListener('user-profiles-changed', handleProfileChange);
  }, []);

  // Last inn lagrede maler og kombiner med standardmaler
  useEffect(() => {
    fetchCustomWorkouts(user?.uid).then((customs) => {
      setAllPresets([...PRESET_WORKOUTS, ...customs]);
    });
  }, [user, activeTab]);

  const {
    state,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    resetWorkout,
    skipNext,
    previous,
    toggleLock,
    toggleSound,
    toggleVibrate,
    toggleWakeLock,
    toggleSpeech,
    setSoundLevel,
  } = useIntervalTimer({ workout: selectedWorkout });

  const [latestLogId, setLatestLogId] = useState<string | undefined>(undefined);

  // Automatisk lagring til Firestore og lokalhistorikk når økt fullføres
  useEffect(() => {
    if (state.status === 'completed' && !hasSavedRef.current) {
      hasSavedRef.current = true;
      saveCompletedWorkout(user?.uid, {
        workoutId: selectedWorkout.id,
        workoutName: selectedWorkout.name,
        workoutType: selectedWorkout.type,
        durationSeconds: state.totalElapsedSeconds,
        roundsCompleted: selectedWorkout.rounds,
        totalRounds: selectedWorkout.rounds,
      })
        .then((logId) => setLatestLogId(logId))
        .catch((err) => {
          // Sikkerhetsnett: saveCompletedWorkout toaster selv på kjente feilstier
          console.warn('Kunne ikke lagre fullført økt:', err);
          showErrorToast('Kunne ikke lagre den fullførte økten.');
        });
    }
    if (state.status === 'idle') {
      hasSavedRef.current = false;
      setLatestLogId(undefined);
    }
  }, [state.status, state.totalElapsedSeconds, user, selectedWorkout]);

  const handleSelectWorkout = (tpl: WorkoutTemplate) => {
    setSelectedWorkout(tpl);
    resetWorkout();
  };

  // Profilen FORESLÅR et lydnivå: et åpent kontorlandskap og et korlokale
  // tåler et pip, men ikke en stemme. Har brukeren valgt selv, står valget —
  // et forslag som overkjører et bevisst valg er ikke et forslag.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.SOUND_LEVEL_CHOSEN) === 'true') return;
    setSoundLevel(defaultSoundLevelForProfiles(userProfiles.profiles), {
      erBrukerensValg: false,
    });
  }, [userProfiles.profiles, setSoundLevel]);

  // Tilbakeknappen forlot hele nettsiden midt i en økt. Vakten fanger trykket
  // så lenge noe kan gå tapt — altså mens økten kjører eller står i pause.
  const exitGuard = useWorkoutExitGuard({
    isActive: state.status === 'running' || state.status === 'paused',
    onConfirmExit: resetWorkout,
  });

  // Vakten over dekker bare tiden en økt kjører. Utenfor økt forlot tilbake
  // hele nettsiden fra enhver annen fane enn forsiden. Her spør vi ikke —
  // tilbake fra Historikk til forsiden er nettopp det brukeren ber om.
  useTabBackNavigation({
    isAway: activeTab !== 'timer',
    onBack: () => setActiveTab('timer'),
    suspendert: state.status === 'running' || state.status === 'paused',
  });

  const handleStartWorkoutDirectly = (tpl: WorkoutTemplate) => {
    setSelectedWorkout(tpl);
    setActiveTab('timer');
    startWorkout(tpl);
  };

  const handleStartCustomWorkout = (customW: WorkoutTemplate) => {
    handleStartWorkoutDirectly(customW);
  };

  const [builderInitialWorkout, setBuilderInitialWorkout] = useState<WorkoutTemplate | null>(null);

  // Hvis økten er fullført, vis oppsummering
  if (state.status === 'completed') {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col justify-center overflow-hidden">
        <ErrorToast />
        <WorkoutSummary
          workout={selectedWorkout}
          totalElapsedSeconds={state.totalElapsedSeconds}
          workoutLogId={latestLogId}
          onRestart={resetWorkout}
        />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* Global feil-toast (revisjon § 2.4) — alltid montert slik at
          tjenestefeil når brukeren, ikke bare konsollen */}
      <ErrorToast />

      {/* Hovedvisning basert på aktiv fane. inert (B4): mens velkomstflyten
          ligger over, skal innholdet bak være utilgjengelig for fokus og
          skjermleser — overlayet er visuelt dekkende, inert gjør det reelt. */}
      <div className="flex-1 overflow-hidden" inert={showWelcomeOnboarding || undefined}>
        {activeTab === 'timer' ? (
          <TimerDisplay
            workout={selectedWorkout}
            state={state}
            presets={allPresets}
            onSelectWorkout={handleSelectWorkout}
            onStartWorkoutDirectly={handleStartWorkoutDirectly}
            onStart={() => startWorkout()}
            onPause={pauseWorkout}
            onResume={resumeWorkout}
            onReset={resetWorkout}
            onSkipNext={skipNext}
            onPrevious={previous}
            onToggleLock={toggleLock}
            onToggleSound={toggleSound}
            onToggleVibrate={toggleVibrate}
            onToggleWakeLock={toggleWakeLock}
            onToggleSpeech={toggleSpeech}
            onOpenCurator={IS_CURATOR_ENABLED ? () => setActiveTab('curator') : undefined}
            onOpenPrograms={() => setActiveTab('programs')}
          />
        ) : activeTab === 'programs' ? (
          <ProgramCatalogView
            onStartProgram={handleStartCustomWorkout}
            onCustomizeProgram={(progWorkout) => {
              setBuilderMode('kopi');
              setBuilderInitialWorkout(progWorkout);
              setActiveTab('builder');
            }}
            onEditOwnProgram={(ownWorkout) => {
              setBuilderMode('rediger');
              setBuilderInitialWorkout(ownWorkout);
              setActiveTab('builder');
            }}
            onCreateProgram={() => {
              setBuilderMode('kopi');
              setBuilderInitialWorkout(null);
              setActiveTab('builder');
            }}
            onNavigateToTimer={() => setActiveTab('timer')}
          />
        ) : activeTab === 'builder' ? (
          <WorkoutBuilderView
            initialWorkout={builderInitialWorkout}
            initialWorkoutMode={builderMode}
            onStartCustomWorkout={handleStartCustomWorkout}
            onNavigateToTimer={() => setActiveTab('timer')}
          />
        ) : activeTab === 'exercises' ? (
          <ExerciseLibraryView
            onNavigateToTimer={() => setActiveTab('timer')}
          />
        ) : activeTab === 'history' ? (
          <WorkoutHistoryView
            onNavigateToTimer={() => setActiveTab('timer')}
          />
        ) : activeTab === 'curator' && IS_CURATOR_ENABLED ? (
          <Suspense fallback={null}>
            <ExerciseImageCuratorView
              onNavigateToTimer={() => setActiveTab('timer')}
            />
          </Suspense>
        ) : (
          <SettingsMoreView
            soundEnabled={state.soundEnabled}
            onSetSoundLevel={setSoundLevel}
            vibrateEnabled={state.vibrateEnabled}
            onToggleVibrate={toggleVibrate}
            wakeLockEnabled={state.wakeLockEnabled}
            onToggleWakeLock={toggleWakeLock}
            speechEnabled={state.speechEnabled}
            onOpenCurator={IS_CURATOR_ENABLED ? () => setActiveTab('curator') : undefined}
          />
        )}
      </div>

      {/* Bunnmeny (skjules under aktiv økt for maksimal fokus, i henhold til
          kapittel 4; og mens velkomstflyten dekker skjermen — B4) */}
      {state.status === 'idle' && !showWelcomeOnboarding && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Førstegangs-onboarding (C2, spec § 3): persona + ukesmål + førsteøkt.
          Ligger på z-[60] over profilmodalen og undertrykker den mens den
          vises (planpresisering 5) — profilmodalens egen logikk endres ikke. */}
      {showWelcomeOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowWelcomeOnboarding(false);
            setWelcomeHandledThisSession(true);
          }}
        />
      )}

      {/* 1-spørsmåls Onboarding for kontekstprofiler — utsatt til neste besøk
          når velkomstflyten nettopp ble håndtert (planpresisering 6 / B2) */}
      {showOnboarding && !showWelcomeOnboarding && !welcomeHandledThisSession && (
        <ProfileOnboardingModal
          isOpen={showOnboarding}
          onClose={(newState) => {
            setUserProfiles(newState);
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Tilbake-vakt: brukeren trykket tilbake midt i en økt. Uten dette
          forlot trykket hele nettsiden og tok økten med seg (revisjon A,
          spørsmål C). Økten fortsetter å gå bak dialogen — et feiltrykk skal
          ikke koste deg rytmen. */}
      {exitGuard.isConfirming && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="avslutt-tittel"
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <div className="w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h2 id="avslutt-tittel" className="text-lg font-black text-white">
                Avslutte økten?
              </h2>
              <p className="text-xs text-zinc-400">
                Økten går fortsatt. Avslutter du, mister du fremdriften i denne runden.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={exitGuard.cancelExit}
                autoFocus
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black rounded-xl text-sm transition-all"
              >
                Fortsett økten
              </button>
              <button
                onClick={exitGuard.confirmExit}
                className="w-full py-2.5 text-rose-400 hover:text-rose-300 hover:bg-zinc-800 font-bold rounded-xl text-sm transition-colors"
              >
                Avslutt økten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
