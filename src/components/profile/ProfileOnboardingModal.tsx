import React, { useState } from 'react';
import { CONTEXT_PROFILES } from '../../data/profiles';
import { ContextProfileId, UserProfilesState } from '../../schemas/profileSchema';
import { saveUserProfilesState, getUserProfilesState } from '../../services/profileCompositionService';
import { Briefcase, Heart, Music, Armchair, Trophy, Users, Check, Sparkles } from 'lucide-react';

interface ProfileOnboardingModalProps {
  isOpen: boolean;
  onClose: (state: UserProfilesState) => void;
}

const PROFILE_ICONS: Record<ContextProfileId, React.ReactNode> = {
  kontor: <Briefcase className="w-5 h-5" />,
  barn: <Heart className="w-5 h-5" />,
  kor: <Music className="w-5 h-5" />,
  senior: <Armchair className="w-5 h-5" />,
  idrettslag: <Trophy className="w-5 h-5" />,
  møte: <Users className="w-5 h-5" />,
};

export const ProfileOnboardingModal: React.FC<ProfileOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedProfiles, setSelectedProfiles] = useState<ContextProfileId[]>(() => {
    const state = getUserProfilesState();
    return state.profiles.length > 0 ? state.profiles : ['kontor'];
  });

  if (!isOpen) return null;

  const toggleProfile = (id: ContextProfileId) => {
    const profile = CONTEXT_PROFILES[id];
    if (profile.status !== 'active') return; // Ikke valgbar ennå

    setSelectedProfiles((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Må ha minst én profil
        return prev.filter((p) => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = () => {
    const primary = selectedProfiles[0] || 'kontor';
    const newState: UserProfilesState = {
      profiles: selectedProfiles,
      primaryProfile: primary,
      hasCompletedOnboarding: true,
    };
    saveUserProfilesState(newState);
    onClose(newState);
  };

  const handleSkip = () => {
    const defaultState: UserProfilesState = {
      profiles: ['kontor'],
      primaryProfile: 'kontor',
      hasCompletedOnboarding: true,
    };
    saveUserProfilesState(defaultState);
    onClose(defaultState);
  };

  const activeProfiles = Object.values(CONTEXT_PROFILES).filter((p) => p.status === 'active');
  const plannedProfiles = Object.values(CONTEXT_PROFILES).filter((p) => p.status === 'planned');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 text-zinc-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Tilpass din opplevelse
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Hvor skal du bruke Min Trener?
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Velg én eller flere sammenhenger. Appen tilpasser øvelser, stemmetone og hurtigvalg automatisk.
          </p>
        </div>

        {/* Aktive profiler */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Aktive profiler (Velg de som passer)
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            {activeProfiles.map((p) => {
              const isSelected = selectedProfiles.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProfile(p.id)}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      isSelected ? 'bg-emerald-500 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {PROFILE_ICONS[p.id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{p.name.nb}</span>
                      {isSelected && (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-zinc-950">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      {p.description?.nb}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Planlagte profiler (synlige, men 'kommer') */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Kommende kontekster
          </span>
          <div className="grid grid-cols-2 gap-2">
            {plannedProfiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-850/60 text-zinc-500 opacity-70 cursor-not-allowed"
              >
                <div className="p-1.5 rounded-lg bg-zinc-800/60 text-zinc-500">
                  {PROFILE_ICONS[p.id]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{p.name.nb}</div>
                  <span className="text-[9px] text-zinc-600 font-bold uppercase">Kommer</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Handlingsknapper */}
        <div className="space-y-2 pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-950 transition-all text-sm flex items-center justify-center gap-2"
          >
            Start med valgte profiler ({selectedProfiles.length})
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300 font-semibold transition-colors"
          >
            Hopp over (bruk standard kontor-profil)
          </button>
        </div>
      </div>
    </div>
  );
};
