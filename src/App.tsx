import { useState, useEffect, useRef } from 'react';
import { PRESET_WORKOUTS, TABATA_WORKOUT } from './data/mockWorkouts';
import { WorkoutTemplate } from './types/workout';
import { useIntervalTimer } from './hooks/useIntervalTimer';
import { TimerDisplay } from './components/timer/TimerDisplay';
import { WorkoutSummary } from './components/timer/WorkoutSummary';
import { ExerciseLibraryView } from './components/library/ExerciseLibraryView';
import { WorkoutHistoryView } from './components/history/WorkoutHistoryView';
import { ProgramCatalogView } from './components/programs/ProgramCatalogView';
import { WorkoutBuilderView } from './components/builder/WorkoutBuilderView';
import { ExerciseImageCuratorView } from './components/curator/ExerciseImageCuratorView';
import { SettingsMoreView } from './components/settings/SettingsMoreView';
import { BottomNav, AppTab } from './components/navigation/BottomNav';
import { getSharedWorkoutFromUrl } from './services/shareWorkoutService';
import { useAuth } from './contexts/AuthContext';
import { saveCompletedWorkout } from './services/firestoreService';
import { fetchCustomWorkouts } from './services/customWorkoutsService';
import { ProfileOnboardingModal } from './components/profile/ProfileOnboardingModal';
import { getUserProfilesState } from './services/profileCompositionService';
import { UserProfilesState } from './schemas/profileSchema';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('timer');
  const [userProfiles, setUserProfiles] = useState<UserProfilesState>(() => getUserProfilesState());
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !userProfiles.hasCompletedOnboarding);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutTemplate>(() => {
    const shared = getSharedWorkoutFromUrl();
    return shared || TABATA_WORKOUT;
  });
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
        .catch((err) => console.warn('Kunne ikke lagre fullført økt:', err));
    }
    if (state.status === 'idle') {
      hasSavedRef.current = false;
      setLatestLogId(undefined);
    }
  }, [state.status, state.totalElapsedSeconds, user, selectedWorkout]);

  const [autoStartPending, setAutoStartPending] = useState(false);

  const handleSelectWorkout = (tpl: WorkoutTemplate) => {
    setSelectedWorkout(tpl);
    resetWorkout();
  };

  const handleStartWorkoutDirectly = (tpl: WorkoutTemplate) => {
    setSelectedWorkout(tpl);
    resetWorkout();
    setAutoStartPending(true);
    setActiveTab('timer');
  };

  useEffect(() => {
    if (autoStartPending) {
      setAutoStartPending(false);
      startWorkout();
    }
  }, [autoStartPending, selectedWorkout, startWorkout]);

  const handleStartCustomWorkout = (customW: WorkoutTemplate) => {
    handleStartWorkoutDirectly(customW);
  };

  const [builderInitialWorkout, setBuilderInitialWorkout] = useState<WorkoutTemplate | null>(null);

  // Hvis økten er fullført, vis oppsummering
  if (state.status === 'completed') {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col justify-center overflow-hidden">
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
      {/* Hovedvisning basert på aktiv fane */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'timer' ? (
          <TimerDisplay
            workout={selectedWorkout}
            state={state}
            presets={allPresets}
            onSelectWorkout={handleSelectWorkout}
            onStartWorkoutDirectly={handleStartWorkoutDirectly}
            onStart={startWorkout}
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
            onOpenCurator={() => setActiveTab('curator')}
            onOpenPrograms={() => setActiveTab('programs')}
          />
        ) : activeTab === 'programs' ? (
          <ProgramCatalogView
            onStartProgram={handleStartCustomWorkout}
            onCustomizeProgram={(progWorkout) => {
              setBuilderInitialWorkout(progWorkout);
              setActiveTab('builder');
            }}
            onNavigateToTimer={() => setActiveTab('timer')}
          />
        ) : activeTab === 'builder' ? (
          <WorkoutBuilderView
            initialWorkout={builderInitialWorkout}
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
        ) : activeTab === 'curator' && user ? (
          <ExerciseImageCuratorView
            onNavigateToTimer={() => setActiveTab('timer')}
          />
        ) : (
          <SettingsMoreView
            soundEnabled={state.soundEnabled}
            onToggleSound={toggleSound}
            vibrateEnabled={state.vibrateEnabled}
            onToggleVibrate={toggleVibrate}
            wakeLockEnabled={state.wakeLockEnabled}
            onToggleWakeLock={toggleWakeLock}
            speechEnabled={state.speechEnabled}
            onToggleSpeech={toggleSpeech}
            onOpenCurator={user ? () => setActiveTab('curator') : undefined}
          />
        )}
      </div>

      {/* Bunnmeny (skjules under aktiv økt for maksimal fokus, i henhold til kapittel 4) */}
      {state.status === 'idle' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* 1-spørsmåls Onboarding for kontekstprofiler */}
      {showOnboarding && (
        <ProfileOnboardingModal
          isOpen={showOnboarding}
          onClose={(newState) => {
            setUserProfiles(newState);
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
