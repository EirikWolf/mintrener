import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { exportFullUserDataset } from '../../services/exportDataService';
import { SensorStatusModal } from '../sensors/SensorStatusModal';
import { AboutGuideModal } from '../help/AboutGuideModal';
import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';
import {
  Volume2,
  VolumeX,
  Smartphone,
  Sun,
  Moon,
  Mic,
  MicOff,
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
  Dumbbell
} from 'lucide-react';

interface SettingsMoreViewProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  vibrateEnabled: boolean;
  onToggleVibrate: () => void;
  wakeLockEnabled: boolean;
  onToggleWakeLock: () => void;
  speechEnabled: boolean;
  onToggleSpeech: () => void;
  onOpenCurator?: () => void;
}

export const SettingsMoreView: React.FC<SettingsMoreViewProps> = ({
  soundEnabled,
  onToggleSound,
  vibrateEnabled,
  onToggleVibrate,
  wakeLockEnabled,
  onToggleWakeLock,
  speechEnabled,
  onToggleSpeech,
  onOpenCurator,
}) => {
  const { user, signInWithGoogle, logout, deleteAccount } = useAuth();
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    const confirm = window.confirm(
      'Er du helt sikker på at du vil slette kontoen din og alle lagrede treningsdata permanent? Denne handlingen kan ikke angres.'
    );
    if (!confirm) return;

    setIsDeleting(true);
    try {
      await deleteAccount();
      alert('Kontoen og alle dine treningsdata har blitt slettet.');
    } catch (err: any) {
      alert('Kunne ikke slette konto: ' + (err.message || 'Ukjent feil'));
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
          {/* Lyd */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              <div>
                <p className="text-xs font-bold text-white">Lydsignaler (Pip)</p>
                <p className="text-[10px] text-zinc-400">Varsler start, pause og 3-2-1 nedtelling</p>
              </div>
            </div>
            <button
              onClick={onToggleSound}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${soundEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Stemmeveiledning */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              {speechEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-zinc-500" />}
              <div>
                <p className="text-xs font-bold text-white">Norsk stemmeveiledning</p>
                <p className="text-[10px] text-zinc-400">Leser opp øvelsesnavn og instruksjoner</p>
              </div>
            </div>
            <button
              onClick={onToggleSpeech}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${speechEnabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${speechEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Vibrasjon */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              <Smartphone className={`w-4 h-4 ${vibrateEnabled ? 'text-amber-400' : 'text-zinc-500'}`} />
              <div>
                <p className="text-xs font-bold text-white">Vibrasjon</p>
                <p className="text-[10px] text-zinc-400">Haptisk feedback ved faseoverganger</p>
              </div>
            </div>
            <button
              onClick={onToggleVibrate}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${vibrateEnabled ? 'bg-amber-500' : 'bg-zinc-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${vibrateEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Hold skjermen våken */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              {wakeLockEnabled ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
              <div>
                <p className="text-xs font-bold text-white">Hold skjermen våken</p>
                <p className="text-[10px] text-zinc-400">Forhindrer at mobilen slukker under økten</p>
              </div>
            </div>
            <button
              onClick={onToggleWakeLock}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${wakeLockEnabled ? 'bg-amber-500' : 'bg-zinc-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${wakeLockEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
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
              <p className="text-xs font-bold text-white">Sensordiagnostikk & Pulsbelte</p>
              <p className="text-[10px] text-zinc-400">Bluetooth pulsmåler, bevegelse og GPS</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </button>
      </section>

      {/* 4. DATA & PERSONVERN (GDPR) */}
      <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Data & Personvern</h2>
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
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </button>

        {user && (
          <button
            onClick={handleDeleteAccount}
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
            <ChevronRight className="w-4 h-4 text-rose-500" />
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
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </button>

        {onOpenCurator && (
          <button
            onClick={onOpenCurator}
            className="w-full flex items-center justify-between py-2 px-3 bg-zinc-950/50 hover:bg-zinc-800/50 rounded-xl border border-zinc-800/50 text-left text-zinc-400 hover:text-zinc-300 text-xs transition-all"
          >
            <span>Bildekurator (Utviklerverktøy)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="text-center pt-2">
          <p className="text-[10px] text-zinc-500 font-mono">Min Trener v1.3.0 · PWA & Offline-first</p>
        </div>
      </section>

      {/* Modaler */}
      {isSensorModalOpen && <SensorStatusModal onClose={() => setIsSensorModalOpen(false)} />}
      {isAboutModalOpen && <AboutGuideModal onClose={() => setIsAboutModalOpen(false)} />}
      {isPrivacyModalOpen && <PrivacyPolicyModal onClose={() => setIsPrivacyModalOpen(false)} />}
    </div>
  );
};
