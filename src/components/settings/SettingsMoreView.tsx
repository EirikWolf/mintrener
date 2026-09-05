import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { exportFullUserDataset } from '../../services/exportDataService';
import { showErrorToast } from '../../services/errorToastService';
import {
  getTelemetryConsent,
  setTelemetryConsent,
  fetchGlobalStats,
  GlobalTelemetryStats,
} from '../../services/telemetryService';
import { SensorStatusModal } from '../sensors/SensorStatusModal';
import { AboutGuideModal } from '../help/AboutGuideModal';
import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';
import { ProfileOnboardingModal } from '../profile/ProfileOnboardingModal';
import { getActiveContextProfiles } from '../../services/profileCompositionService';
import { ContextProfile } from '../../schemas/profileSchema';
import {
  getCurrentLanguage,
  setLanguage,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '../../services/i18nService';
import { TesterFeedbackModal } from '../tester/TesterFeedbackModal';
import { isAdmin, unlockAdminAccess } from '../../services/adminService';

// PWA-optimalisering (Revisjon C): kode-splitt tunge admin- og kiosk-komponenter
const OfficeKioskScreen = React.lazy(() =>
  import('../kiosk/OfficeKioskScreen').then((m) => ({ default: m.OfficeKioskScreen }))
);
const AdminDashboardModal = React.lazy(() =>
  import('../admin/AdminDashboardModal').then((m) => ({ default: m.AdminDashboardModal }))
);
import { isTesterRoleActive, verifyAndSetTesterCode } from '../../services/testerService';
import {
  Volume2,
  VolumeX,
  Vibrate,
  VibrateOff,
  Eye,
  EyeOff,
  AudioLines,
  Activity,
  Download,
  Trash2,
  HelpCircle,
  Shield,
  LogIn,
  LogOut,
  User,
  Check,
  ChevronRight,
  Dumbbell,
  Target,
  Sparkles,
  Globe2,
  Flame,
  Tv,
  Mic,
  HeartPulse,
  Timer,
  Bell,
} from 'lucide-react';
import { CoachPersonaModal } from './CoachPersonaModal';
import {
  COACH_PERSONAS,
  getActiveCoachPersona,
  CoachPersonaId,
  isPersonaAudioCached,
} from '../../services/coachPersonaService';
import { getWeeklyGoal, setWeeklyGoal } from '../../services/weeklyGoalService';
import { getUserBirthYear, setUserBirthYear, getUserMaxHeartRate } from '../../services/heartRateZoneService';
import { bluetoothHeartRateService } from '../../services/bluetoothHeartRateService';
import {
  SOUND_LEVELS,
  soundLevelFromFlags,
  type SoundLevel,
} from '../../services/soundLevelService';
import { audioService } from '../../services/audioService';
import { loadPersistedSettings, savePersistedSettings } from '../../services/settingsStorageService';

interface SettingsMoreViewProps {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  onToggleVibrate: () => void;
  wakeLockEnabled: boolean;
  onToggleWakeLock: () => void;
  speechEnabled: boolean;
  /** Setter begge lydbryterne i ett grep. */
  onSetSoundLevel?: (level: SoundLevel) => void;
  countdownDurationSeconds?: 3 | 5;
  onSetCountdownDurationSeconds?: (seconds: 3 | 5) => void;
  countdownAudioStyle?: 'beep' | 'buzzer';
  onSetCountdownAudioStyle?: (style: 'beep' | 'buzzer') => void;
}

export const SettingsMoreView: React.FC<SettingsMoreViewProps> = ({
  soundEnabled,
  vibrateEnabled,
  onToggleVibrate,
  wakeLockEnabled,
  onToggleWakeLock,
  speechEnabled,
  onSetSoundLevel,
  countdownDurationSeconds,
  onSetCountdownDurationSeconds,
  countdownAudioStyle,
  onSetCountdownAudioStyle,
}) => {
  // Nivået er en LESNING av bryterne, ikke en fjerde tilstand å holde i synk.
  const aktivtNivå = soundLevelFromFlags({ soundEnabled, speechEnabled });

  const { user, signInWithGoogle, logout, deleteAccount } = useAuth();
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);
  // Ikke lov pulsbelte på enheter uten Web Bluetooth — pulsmåleren skjuler
  // seg selv der, og teksten må følge etter (revisjon B2).
  const harBluetooth = bluetoothHeartRateService.isSupported();
  const [birthYearInput, setBirthYearInput] = useState<string>(() => {
    const y = getUserBirthYear();
    return y === null ? '' : String(y);
  });

  const handleBirthYearChange = (value: string) => {
    setBirthYearInput(value);
    const year = parseInt(value, 10);
    const currentYear = new Date().getFullYear();
    if (!value) {
      setUserBirthYear(null);
    } else if (!isNaN(year) && year >= currentYear - 110 && year <= currentYear - 10) {
      setUserBirthYear(year);
    }
  };
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [activeProfiles, setActiveProfiles] = useState<ContextProfile[]>(() => getActiveContextProfiles());
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [telemetryEnabled, setTelemetryEnabledState] = useState<boolean>(() => getTelemetryConsent());
  const [globalStats, setGlobalStats] = useState<GlobalTelemetryStats | null>(null);
  const [weeklyGoal, setWeeklyGoalState] = useState<number>(() => getWeeklyGoal());
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => getCurrentLanguage());
  const [isCoachPersonaModalOpen, setIsCoachPersonaModalOpen] = useState(false);
  const [currentPersonaId, setCurrentPersonaId] = useState<CoachPersonaId>(() => getActiveCoachPersona());
  const [isTesterModalOpen, setIsTesterModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  const [localCountdownDuration, setLocalCountdownDuration] = useState<3 | 5>(() => {
    return countdownDurationSeconds ?? loadPersistedSettings().countdownDurationSeconds;
  });
  const [localCountdownAudioStyle, setLocalCountdownAudioStyle] = useState<'beep' | 'buzzer'>(() => {
    return countdownAudioStyle ?? loadPersistedSettings().countdownAudioStyle;
  });

  React.useEffect(() => {
    if (countdownDurationSeconds !== undefined) {
      setLocalCountdownDuration(countdownDurationSeconds);
    }
  }, [countdownDurationSeconds]);

  React.useEffect(() => {
    if (countdownAudioStyle !== undefined) {
      setLocalCountdownAudioStyle(countdownAudioStyle);
    }
  }, [countdownAudioStyle]);

  const handleSetCountdownDuration = (sec: 3 | 5) => {
    setLocalCountdownDuration(sec);
    if (onSetCountdownDurationSeconds) {
      onSetCountdownDurationSeconds(sec);
    } else {
      savePersistedSettings({ countdownDurationSeconds: sec });
    }
  };

  const handleSetCountdownAudioStyle = (style: 'beep' | 'buzzer') => {
    setLocalCountdownAudioStyle(style);
    if (onSetCountdownAudioStyle) {
      onSetCountdownAudioStyle(style);
    } else {
      savePersistedSettings({ countdownAudioStyle: style });
    }
    if (style === 'buzzer') {
      audioService.playCountdownBuzzer(true);
    } else {
      audioService.playCountdownBeep(true);
    }
  };

  const adminAccess = isAdmin(user?.email);
  const testerAccess = isTesterRoleActive();

  const currentPersona = COACH_PERSONAS.find(p => p.id === currentPersonaId) || COACH_PERSONAS[0];
  const [isPersonaCached, setIsPersonaCached] = useState<boolean>(false);

  React.useEffect(() => {
    isPersonaAudioCached(currentPersona.id).then(setIsPersonaCached);
  }, [currentPersona.id, isCoachPersonaModalOpen]);

  React.useEffect(() => {
    const handleProfileChange = () => {
      setActiveProfiles(getActiveContextProfiles());
    };
    const handlePersonaChange = () => {
      setCurrentPersonaId(getActiveCoachPersona());
    };
    window.addEventListener('user-profiles-changed', handleProfileChange);
    window.addEventListener('coach-persona-changed', handlePersonaChange);
    return () => {
      window.removeEventListener('user-profiles-changed', handleProfileChange);
      window.removeEventListener('coach-persona-changed', handlePersonaChange);
    };
  }, []);

  React.useEffect(() => {
    fetchGlobalStats().then(setGlobalStats);
  }, []);

  const handleUpdateWeeklyGoal = (val: number) => {
    const clamped = Math.max(1, Math.min(14, val));
    setWeeklyGoalState(clamped);
    setWeeklyGoal(clamped);
  };

  const handleToggleTelemetry = () => {
    const next = !telemetryEnabled;
    setTelemetryEnabledState(next);
    setTelemetryConsent(next);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportFullUserDataset(user?.uid);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Eksportfeil:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsDeleteAccountModalOpen(false);
    } catch (err) {
      // Feil-toast (revisjon § 2.4): konto-sletting er en kritisk skriveoperasjon
      console.error('Feil ved sletting av konto:', err);
      showErrorToast('Kunne ikke slette kontoen. Logg inn på nytt og prøv igjen.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-md mx-auto p-4 space-y-5 overflow-y-auto select-none pb-20">
      {/* Tittel */}
      <div className="flex items-center gap-2 pt-1 border-b border-zinc-800/80 pb-3">
        <Dumbbell className="w-5 h-5 text-emerald-400" />
        <div>
          <h1 className="text-lg font-black tracking-tight text-white">Innstillinger & Mer</h1>
          <p className="text-xs text-zinc-400">Tilpass din treningsopplevelse</p>
        </div>
      </div>

      {/* 1. KONTO / PROFIL */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Brukerkonto</h2>
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Bruker'} className="w-10 h-10 rounded-full border border-emerald-500/50" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <User className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{user.displayName || 'Innlogget bruker'}</p>
                <p className="text-xs text-zinc-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-800 flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              Logg ut
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">
              Logg inn for å synkronisere treningshistorikk, favoritter og egne programmer på tvers av enheter.
            </p>
            <button
              onClick={() => signInWithGoogle()}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Logg inn med Google
            </button>
          </div>
        )}
      </section>

      {/* 2. LYD & TILBAKEMELDINGER */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Lyd, tale & skjerm</h2>
        <div className="divide-y divide-zinc-800/60">
          {/* Lydnivå — ett valg, tre navngitte nivåer.
              Her sto tidligere to uavhengige brytere («Lydsignaler» og
              «Stemmeveiledning»). De ga fire kombinasjoner, hvorav brukeren
              fant to. Nivået arbeidsplassen faktisk ba om — diskrete pip uten
              stemme — krevde at man skjønte at bryterne var forskjellige ting
              og satte dem i riktig kombinasjon. */}
          <div className="py-2 space-y-2">
            <div className="flex items-center gap-2.5">
              {aktivtNivå === 'stille' ? (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              ) : aktivtNivå === 'signal' ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AudioLines className="w-4 h-4 text-emerald-400" />
              )}
              <div>
                <p className="text-xs font-bold text-white">Lydnivå</p>
                <p className="text-[10px] text-zinc-400">Hvor mye appen skal si underveis</p>
              </div>
            </div>

            <div
              role="radiogroup"
              aria-label="Lydnivå"
              className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950/60 border border-zinc-800 rounded-2xl"
            >
              {SOUND_LEVELS.map((nivå) => (
                <button
                  key={nivå.id}
                  role="radio"
                  aria-checked={aktivtNivå === nivå.id}
                  onClick={() => onSetSoundLevel?.(nivå.id)}
                  className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    aktivtNivå === nivå.id
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  {nivå.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-zinc-400 px-1">
              {SOUND_LEVELS.find((n) => n.id === aktivtNivå)?.description}
            </p>
          </div>

          {/* Trenerstemme & Dialekt (Suno & Kitor Personaer) */}
          <div className="flex items-center justify-between py-2 border-t border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-xs font-bold text-white">Trenerstemme & Dialekt</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-[10px] text-zinc-400">
                    {currentPersona.icon} {currentPersona.name} ({currentPersona.badge})
                  </p>
                  <span aria-hidden="true" className="text-zinc-500 text-[10px]">·</span>
                  {currentPersona.id === 'standard' ? (
                    <span className="text-[9px] text-zinc-400 font-medium">
                      Syntetisk (alltid klar)
                    </span>
                  ) : isPersonaCached ? (
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Klar offline
                    </span>
                  ) : (
                    <span className="text-[9px] text-amber-400/90 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 inline-block" />
                      Lastes ved avspilling
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCoachPersonaModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-amber-300 border border-zinc-700 transition-all active:scale-95 flex items-center gap-1 shadow-sm"
            >
              <span>Endre</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vibrasjon */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              {vibrateEnabled ? <Vibrate className="w-4 h-4 text-amber-400" /> : <VibrateOff className="w-4 h-4 text-zinc-400" />}
              <div>
                <p className="text-xs font-bold text-white">Vibrasjon</p>
                <p className="text-[10px] text-zinc-400">Haptisk feedback ved faseoverganger</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={vibrateEnabled}
              aria-label="Vibrasjon"
              onClick={onToggleVibrate}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${vibrateEnabled ? 'bg-amber-500' : 'bg-zinc-600'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${vibrateEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Hold skjermen våken */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              {wakeLockEnabled ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
              <div>
                <p className="text-xs font-bold text-white">Hold skjermen på</p>
                <p className="text-[10px] text-zinc-400">Forhindrer at mobilen slukker under økten</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={wakeLockEnabled}
              aria-label="Hold skjermen på"
              onClick={onToggleWakeLock}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${wakeLockEnabled ? 'bg-amber-500' : 'bg-zinc-600'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${wakeLockEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Nedtelling til neste fase */}
          <div className="py-2.5 border-t border-zinc-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Timer className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-white">Nedtelling til neste fase</p>
                  <p className="text-[10px] text-zinc-400">Varsel før øvelsen eller pausen starter</p>
                </div>
              </div>
            </div>
            <div
              role="radiogroup"
              aria-label="Nedtelling"
              className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950/60 border border-zinc-800 rounded-2xl"
            >
              <button
                type="button"
                role="radio"
                aria-checked={localCountdownDuration === 3}
                onClick={() => handleSetCountdownDuration(3)}
                className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center ${
                  localCountdownDuration === 3
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span>3 sekunder</span>
                <span className={`text-[10px] font-normal ${localCountdownDuration === 3 ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>Standard</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={localCountdownDuration === 5}
                onClick={() => handleSetCountdownDuration(5)}
                className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center ${
                  localCountdownDuration === 5
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span>5 sekunder</span>
                <span className={`text-[10px] font-normal ${localCountdownDuration === 5 ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>CrossFit / Storskjerm</span>
              </button>
            </div>
          </div>

          {/* Varselsignal (pip vs buzzer) */}
          <div className="py-2.5 border-t border-zinc-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-white">Varselsignal</p>
                  <p className="text-[10px] text-zinc-400">Type signal ved nedtelling og arbeidsstart</p>
                </div>
              </div>
            </div>
            <div
              role="radiogroup"
              aria-label="Varselsignal"
              className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950/60 border border-zinc-800 rounded-2xl"
            >
              <button
                type="button"
                role="radio"
                aria-checked={localCountdownAudioStyle === 'beep'}
                onClick={() => handleSetCountdownAudioStyle('beep')}
                className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center ${
                  localCountdownAudioStyle === 'beep'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span>Klassisk pip</span>
                <span className={`text-[10px] font-normal ${localCountdownAudioStyle === 'beep' ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>Diskré (520 Hz)</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={localCountdownAudioStyle === 'buzzer'}
                onClick={() => handleSetCountdownAudioStyle('buzzer')}
                className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center ${
                  localCountdownAudioStyle === 'buzzer'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span>Gym-buzzer</span>
                <span className={`text-[10px] font-normal ${localCountdownAudioStyle === 'buzzer' ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>Boksing / Storskjerm</span>
              </button>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (localCountdownAudioStyle === 'buzzer') {
                    audioService.playCountdownBuzzer(true);
                  } else {
                    audioService.playCountdownBeep(true);
                  }
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 font-medium transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Test nedtelling</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (localCountdownAudioStyle === 'buzzer') {
                    audioService.playBuzzerStart(true);
                  } else {
                    audioService.playWorkStart(true);
                  }
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 font-medium transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test startsignal</span>
              </button>
            </div>
          </div>

          {/* Ukesmål for trening */}
          <div className="flex items-center justify-between py-2 border-t border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-white">Ukesmål for trening</p>
                <p className="text-[10px] text-zinc-400">Hvor mange økter du planlegger per uke</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 px-2 py-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => handleUpdateWeeklyGoal(weeklyGoal - 1)}
                className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black text-sm flex items-center justify-center transition-all active:scale-95"
              >
                -
              </button>
              <span className="text-xs font-black text-white w-8 text-center">{weeklyGoal} {weeklyGoal === 1 ? 'økt' : 'økter'}</span>
              <button
                onClick={() => handleUpdateWeeklyGoal(weeklyGoal + 1)}
                className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center transition-all active:scale-95"
              >
                +
              </button>
            </div>
          </div>
          {/* Språk / Language */}
          <div className="flex items-center justify-between py-2 border-t border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <Globe2 className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs font-bold text-white">Språk / Language</p>
                <p className="text-[10px] text-zinc-400">Bokmål, Nynorsk eller English</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setCurrentLang(lang.code);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.code.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2b. KONTEKSTPROFILER (KONTOR, BARN, ETC.) */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Kontekstprofiler</h2>
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-950 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-white">
                Aktive profiler:{' '}
                <span className="text-emerald-400 font-black capitalize">
                  {activeProfiles.map((p) => p.name.nb).join(', ')}
                </span>
              </p>
              <p className="text-[10px] text-zinc-400">Tilpass øvelser, stemmetone og hurtigvalg</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Velkomstoppsett (C2, spec § 3): flyten kan gjenåpnes herfra.
            Window-event i stedet for prop-drilling — App eier gate-staten,
            samme mønster som 'user-profiles-changed'. */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-welcome-onboarding'))}
          className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-950 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Mic className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-white">Kjør velkomstoppsett på nytt</p>
              <p className="text-[10px] text-zinc-400">Velg trenerstemme og ukesmål fra start</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>
      </section>

      {/* 3. SENSORER & HARDWARE */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Sensorer & Maskinvare</h2>
        <button
          onClick={() => setIsSensorModalOpen(true)}
          className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-950 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-white">
                Sensordiagnostikk{harBluetooth ? ' & Pulsbelte' : ''}
              </p>
              <p className="text-[10px] text-zinc-400">
                {harBluetooth
                  ? 'Bluetooth pulsmåler, bevegelse og GPS'
                  : 'Bevegelse og GPS. Pulsbelte krever Web Bluetooth, som ikke finnes på iPhone'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Fødselsår for aldersbasert makspuls og pulssoner (Tanaka-formelen) */}
        <div className="flex items-center justify-between py-2.5 px-3 bg-zinc-950 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2.5 pr-2">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <div>
              <label htmlFor="birth-year-input" className="text-xs font-bold text-white">
                Fødselsår
              </label>
              <p className="text-[10px] text-zinc-400">
                Gir riktige pulssoner (estimert makspuls: {getUserMaxHeartRate()} bpm)
              </p>
            </div>
          </div>
          <input
            id="birth-year-input"
            type="number"
            inputMode="numeric"
            min={new Date().getFullYear() - 110}
            max={new Date().getFullYear() - 10}
            placeholder="F.eks. 1975"
            value={birthYearInput}
            onChange={(e) => handleBirthYearChange(e.target.value)}
            className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono focus:border-emerald-500 focus:outline-none shrink-0"
          />
        </div>

        {/* Kontor-TV Kiosk */}
        <button
          onClick={() => setIsKioskOpen(true)}
          className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-950 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Tv className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-xs font-bold text-white">Kontor-TV & Kiosk-modus</p>
              <p className="text-[10px] text-zinc-400">Digital signage for storskjerm med faste mikropauser</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>
      </section>

      {/* 4. FELLESSKAPSSTATISTIKK (ANONYM TELEMETRI) */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
            Fellesskapsstatistikk
          </h2>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            100 % Anonymt
          </span>
        </div>

        {globalStats ? (
          <div className="space-y-3">
            {/* Nøkkeltall */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl">
                <p className="text-[10px] text-zinc-400 font-semibold">Økter gjennomført</p>
                <p className="text-lg font-black text-white">{globalStats.totalWorkouts.toLocaleString('nb-NO')}</p>
              </div>
              <div className="p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl">
                <p className="text-[10px] text-zinc-400 font-semibold">Timer trent sammen</p>
                <p className="text-lg font-black text-emerald-400">
                  {Math.round(globalStats.totalSecondsTrained / 3600).toLocaleString('nb-NO')} t
                </p>
              </div>
            </div>

            {/* Topp 3 øvelser */}
            {globalStats.topExercises.length > 0 && (
              <div className="p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2">
                <p className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Mest populære øvelser
                </p>
                <div className="space-y-1.5">
                  {globalStats.topExercises.slice(0, 3).map((ex, idx) => (
                    <div key={ex.exerciseId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 h-4 rounded-full bg-zinc-800 text-[10px] font-black text-zinc-300 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-zinc-200 truncate">{ex.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                        {ex.completedCount} økter
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-zinc-950/40 rounded-xl text-center text-xs text-zinc-400">
            Laster fellesskapets statistikk...
          </div>
        )}
      </section>

      {/* 5. DATA & PERSONVERN (GDPR) */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Data & Personvern</h2>

        {/* Anonym telemetri samtykke-bryter */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5 pr-2">
            <Activity className={`w-4 h-4 ${telemetryEnabled ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <div>
              <p className="text-xs font-bold text-white">Del anonym bruksstatistikk</p>
              <p className="text-[10px] text-zinc-400">Hjelper oss å se hvilke øvelser som er mest populære (ingen personopplysninger)</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={telemetryEnabled}
            aria-label="Del anonym bruksstatistikk"
            onClick={handleToggleTelemetry}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${telemetryEnabled ? 'bg-emerald-500' : 'bg-zinc-600'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${telemetryEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-950 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            {exportSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-emerald-400" />}
            <div>
              <p className="text-xs font-bold text-white">Eksporter all treningsdata (JSON)</p>
              <p className="text-[10px] text-zinc-400">Last ned fullstendig sikkerhetskopi av dine data</p>
            </div>
          </div>
          {exportSuccess && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full">Lagret!</span>}
        </button>

        <button
          onClick={() => setIsPrivacyModalOpen(true)}
          className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-950 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs font-bold text-white">Personvernerklæring & GDPR</p>
              <p className="text-[10px] text-zinc-400">Offline-first, dine data tilhører deg</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>

        {user && (
          <button
            onClick={() => setIsDeleteAccountModalOpen(true)}
            disabled={isDeleting}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-rose-950/30 hover:bg-rose-950/60 rounded-xl border border-rose-900/50 text-left transition-all text-rose-300"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <div>
                <p className="text-xs font-bold text-rose-200">Slett konto & alle data</p>
                <p className="text-[10px] text-rose-400/80">Permanent sletting fra nettsky og enhet</p>
              </div>
            </div>
          </button>
        )}
      </section>

      {/* 5. OM APPEN & HJELPEGUIDE */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Om Min Trener</h2>
        <button
          onClick={() => setIsAboutModalOpen(true)}
          className="w-full flex items-center justify-between py-2.5 px-3 bg-zinc-950 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 text-left transition-all"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-white">Hjelpeguide & funksjoner</p>
              <p className="text-[10px] text-zinc-400">Lær mer om hvordan programmet fungerer</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>



        {/* Tester-knapp eller Lås opp tester-status */}
        {testerAccess ? (
          <button
            onClick={() => setIsTesterModalOpen(true)}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-purple-950/40 hover:bg-purple-900/60 rounded-xl border border-purple-800/60 text-left transition-all text-purple-300"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">📋</span>
              <div>
                <p className="text-xs font-bold text-white">Betatester Tilbakemelding</p>
                <p className="text-[10px] text-purple-400">Testsjekkliste og fri innmelding</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </button>
        ) : (
          <button
            onClick={() => {
              const code = prompt('Skriv inn invitasjonskode for testere:');
              if (code) {
                const res = verifyAndSetTesterCode(code);
                alert(res.message);
                if (res.success) window.location.reload();
              }
            }}
            className="w-full flex items-center justify-between py-2 px-3 bg-zinc-950/60 hover:bg-zinc-800/60 rounded-xl border border-zinc-850 text-left transition-all text-zinc-400 hover:text-zinc-200 text-xs"
          >
            <span>Har du fått en tester-kode?</span>
            <span className="text-[10px] text-purple-400 font-bold">Lås opp her</span>
          </button>
        )}

        {/* Admin Kontrollpanel eller Lås opp admin */}
        {adminAccess ? (
          <button
            onClick={() => setIsAdminDashboardOpen(true)}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-amber-950/40 hover:bg-amber-900/60 rounded-xl border border-amber-800/60 text-left transition-all text-amber-300"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">🛡️</span>
              <div>
                <p className="text-xs font-bold text-white">Admin Kontrollpanel</p>
                <p className="text-[10px] text-amber-400">Bildegodkjenning og QA-oversikt</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        ) : (
          <button
            onClick={() => {
              if (!user) {
                alert('Administrator-adgang krever at du logger inn med en autorisert Google-konto.');
                return;
              }
              const res = unlockAdminAccess();
              alert(res.message);
              if (res.success) window.location.reload();
            }}
            className="w-full flex items-center justify-between py-2 px-3 bg-zinc-950/60 hover:bg-zinc-800/60 rounded-xl border border-zinc-850 text-left transition-all text-zinc-500 hover:text-zinc-300 text-xs"
          >
            <span>Administratoradgang</span>
            <span className="text-[10px] text-zinc-500 font-bold">Lås opp</span>
          </button>
        )}

        <div className="text-center pt-2">
          <p className="text-[10px] text-zinc-400 font-mono">Min Trener v1.3.0 · PWA & Offline-first</p>
        </div>
      </section>

      {/* Modal for å bekrefte sletting av konto */}
      {isDeleteAccountModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-700 p-5 rounded-2xl max-w-xs w-full space-y-4 shadow-xl text-center">
            <h3 id="delete-account-title" className="text-sm font-bold text-white">
              Slette konto permanent?
            </h3>
            <p className="text-xs text-zinc-400">
              Er du sikker på at du vil slette kontoen din og alle treningsdata? Denne handlingen kan ikke angres.
            </p>
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setIsDeleteAccountModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
              >
                Avbryt
              </button>
              <button
                onClick={handleConfirmDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-sm"
              >
                {isDeleting ? 'Sletter...' : 'Ja, slett alt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modaler */}
      {isSensorModalOpen && <SensorStatusModal onClose={() => setIsSensorModalOpen(false)} />}
      {isAboutModalOpen && <AboutGuideModal onClose={() => setIsAboutModalOpen(false)} />}
      {isPrivacyModalOpen && <PrivacyPolicyModal onClose={() => setIsPrivacyModalOpen(false)} />}
      {isProfileModalOpen && (
        <ProfileOnboardingModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
      {isKioskOpen && (
        <React.Suspense fallback={null}>
          <OfficeKioskScreen onClose={() => setIsKioskOpen(false)} />
        </React.Suspense>
      )}
      {isCoachPersonaModalOpen && (
        <CoachPersonaModal onClose={() => setIsCoachPersonaModalOpen(false)} />
      )}
      {isTesterModalOpen && (
        <TesterFeedbackModal onClose={() => setIsTesterModalOpen(false)} />
      )}
      {isAdminDashboardOpen && (
        <React.Suspense fallback={null}>
          <AdminDashboardModal onClose={() => setIsAdminDashboardOpen(false)} />
        </React.Suspense>
      )}
    </div>
  );
};
