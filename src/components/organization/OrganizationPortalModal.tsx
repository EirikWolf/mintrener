import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getUserOrganization,
  joinOrganizationByCode,
  leaveOrganization,
  PRESET_ORGANIZATIONS,
  getMemberCompetitionProfile,
  saveMemberCompetitionProfile,
  getTeamLeaderboard,
  getIndividualLeaderboard,
  ANONYMOUS_ALIASES,
  AVATAR_ICONS,
} from '../../services/organizationService';
import { Organization, CompetitionPrivacyMode, MemberCompetitionProfile } from '../../schemas/organizationSchema';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building2,
  X,
  LogOut,
  ArrowRight,
  Trophy,
  Flame,
  Eye,
  EyeOff,
  UserCheck,
  Medal,
  Sparkles,
  Share2,
  Check,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface OrganizationPortalModalProps {
  onClose: () => void;
}

export const OrganizationPortalModal: React.FC<OrganizationPortalModalProps> = ({
  onClose,
}) => {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(() => getUserOrganization());
  const [activeTab, setActiveTab] = useState<'kamp' | 'profil'>('kamp');
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Konkurranseprofil for innlogget / aktiv bruker
  const [profile, setProfile] = useState<MemberCompetitionProfile | null>(() =>
    getMemberCompetitionProfile(user?.uid)
  );

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  useEffect(() => {
    const handler = () => {
      setOrg(getUserOrganization());
      setProfile(getMemberCompetitionProfile(user?.uid));
    };
    window.addEventListener('organization-changed', handler);
    window.addEventListener('organization-profile-changed', handler);
    return () => {
      window.removeEventListener('organization-changed', handler);
      window.removeEventListener('organization-profile-changed', handler);
    };
  }, [user]);

  // Initialiser standardprofil hvis mangler
  useEffect(() => {
    if (org && !profile) {
      const defaultTeamId = org.teams && org.teams.length > 0 ? org.teams[0].id : 'team-generell';
      const initial: MemberCompetitionProfile = {
        userId: user?.uid || 'local-user',
        orgId: org.id,
        teamId: defaultTeamId,
        privacyMode: 'anonym',
        alias: ANONYMOUS_ALIASES[Math.floor(Math.random() * ANONYMOUS_ALIASES.length)],
        avatarIcon: AVATAR_ICONS[Math.floor(Math.random() * AVATAR_ICONS.length)],
        points: 0,
        minutes: 0,
        sessions: 0,
        updatedAt: new Date().toISOString(),
      };
      saveMemberCompetitionProfile(initial);
      setProfile(initial);
    }
  }, [org, profile, user]);

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    const res = joinOrganizationByCode(inputCode);
    if (res.success) {
      setSuccessMsg(res.message);
      setInputCode('');
      setOrg(res.organization || null);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleLeave = () => {
    leaveOrganization();
    setOrg(null);
    setProfile(null);
    setSuccessMsg('Du er nå koblet fra organisasjonen.');
  };

  const updatePrivacyMode = (mode: CompetitionPrivacyMode) => {
    if (!profile) return;
    const updated = { ...profile, privacyMode: mode, updatedAt: new Date().toISOString() };
    saveMemberCompetitionProfile(updated);
    setProfile(updated);
  };

  const updateTeam = (teamId: string) => {
    if (!profile) return;
    const updated = { ...profile, teamId, updatedAt: new Date().toISOString() };
    saveMemberCompetitionProfile(updated);
    setProfile(updated);
  };

  const updateAlias = (newAlias: string) => {
    if (!profile) return;
    const updated = { ...profile, alias: newAlias, updatedAt: new Date().toISOString() };
    saveMemberCompetitionProfile(updated);
    setProfile(updated);
  };

  const updateAvatar = (icon: string) => {
    if (!profile) return;
    const updated = { ...profile, avatarIcon: icon, updatedAt: new Date().toISOString() };
    saveMemberCompetitionProfile(updated);
    setProfile(updated);
  };

  const teamLeaderboard = org ? getTeamLeaderboard(org.id) : [];
  const individualLeaderboard = org ? getIndividualLeaderboard(org.id, user?.displayName) : [];

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 text-white"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-portal-title"
        className="w-full max-w-md max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[111] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="org-portal-title" className="text-base font-black text-white">
                Bedrift, Kor & Konkurranse
              </h2>
              <p className="text-[10px] text-zinc-400">Fellespause og sunn aktivitet på arbeidsplassen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollbart Innhold */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs text-zinc-300">
          {errorMsg && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300">
              {successMsg}
            </div>
          )}

          {org ? (
            <div className="space-y-3">
              {/* Organisasjons-info header */}
              <div className="p-3 bg-zinc-950 border border-blue-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-400">
                    Aktiv bedriftsavtale
                  </span>
                  <h3 className="text-sm font-black text-white">{org.name}</h3>
                  {org.department && <p className="text-[10px] text-zinc-400">{org.department}</p>}
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                  {org.joinCode}
                </span>
              </div>

              {/* Faner: Lag & Konkurranse vs Min profil & Personvern */}
              <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
                <button
                  onClick={() => setActiveTab('kamp')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'kamp'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Lag & Resultater</span>
                </button>
                <button
                  onClick={() => setActiveTab('profil')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'profil'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Mitt lag & Personvern</span>
                </button>
              </div>

              {/* FANE 1: LAG & RESULTATER */}
              {activeTab === 'kamp' && (
                <div className="space-y-3">
                  {/* Lagkonkurranse (Hovedfokus) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        Lokasjons- og Lagkampen
                      </span>
                      <span className="text-[10px] text-zinc-400">Sortert på poeng</span>
                    </div>

                    <div className="space-y-1.5">
                      {teamLeaderboard.map((team, idx) => {
                        const isMyTeam = profile?.teamId === team.teamId;
                        return (
                          <div
                            key={team.teamId}
                            className={`p-2.5 rounded-2xl border transition-all ${
                              isMyTeam
                                ? 'bg-blue-950/40 border-blue-500/60 shadow-md shadow-blue-500/10'
                                : 'bg-zinc-950 border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    idx === 0
                                      ? 'bg-amber-400 text-black'
                                      : idx === 1
                                      ? 'bg-zinc-300 text-black'
                                      : idx === 2
                                      ? 'bg-amber-700 text-white'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-white text-xs">{team.teamName}</p>
                                    {isMyTeam && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-300 font-semibold">
                                        Mitt lag
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-400">
                                    {team.activeMembersCount} aktive · {team.totalMinutes} min · {team.totalSessions} økter
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-black text-amber-400 text-sm">
                                  {team.totalPoints}
                                </span>
                                <span className="text-[9px] text-zinc-400 block -mt-0.5">poeng</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Individuell Hederstavle */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                        <Medal className="w-3.5 h-3.5 text-emerald-400" />
                        Individuell Innsatstavle
                      </span>
                      <span className="text-[10px] text-zinc-400">Innsats & konsistens</span>
                    </div>

                    <div className="space-y-1.5">
                      {individualLeaderboard.length === 0 ? (
                        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850 text-center space-y-2">
                          <p className="text-xs text-zinc-300 font-medium">
                            Ingen har registrert økter denne uken ennå.
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            Gjennomfør en trenings- eller mikroøkt for å ta ledelsen!
                          </p>
                        </div>
                      ) : (
                        individualLeaderboard.map((item) => {
                          const isMe = profile && item.id === profile.userId;
                          return (
                            <div
                              key={item.id}
                              className={`p-2 rounded-xl flex items-center justify-between border ${
                                isMe
                                  ? 'bg-emerald-950/30 border-emerald-500/50'
                                  : 'bg-zinc-950/70 border-zinc-850'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs">{item.avatarIcon}</span>
                                <div>
                                  <div className="flex items-center gap-1">
                                    <p className="font-bold text-white text-xs">{item.displayName}</p>
                                    {isMe && (
                                      <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300">
                                        Deg
                                      </span>
                                    )}
                                    {item.isAnonymous && (
                                      <span className="text-[8px] text-zinc-400">(anonym)</span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-zinc-400">
                                    {item.teamName} · {item.minutes} min
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-emerald-400 text-xs">
                                  {item.points} p
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {individualLeaderboard.length <= 1 && (
                        <div className="mt-3 p-3 rounded-xl bg-blue-950/20 border border-blue-800/40 text-center space-y-2">
                          <p className="text-xs text-blue-200 font-bold">
                            {individualLeaderboard.length === 1 ? 'Du er først ute på laget denne uka! 🏆' : 'Bli den første på ledertavlen!'}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            Inviter en kollega til å bli med med organisasjonskoden <span className="font-mono text-white font-bold">{org.joinCode}</span>.
                          </p>
                          <button
                            onClick={() => {
                              const shareUrl = `${window.location.origin}${window.location.pathname}?org=${encodeURIComponent(org.joinCode)}`;
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(shareUrl);
                                setCopiedShareLink(true);
                                setTimeout(() => setCopiedShareLink(false), 3000);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all active:scale-95 shadow-sm"
                          >
                            {copiedShareLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Share2 className="w-3.5 h-3.5" />}
                            <span>{copiedShareLink ? 'Invitasjonslenke kopiert!' : 'Del laglenke med kollega'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {profile?.privacyMode === 'skjult' && (
                      <p className="text-[10px] text-zinc-400 text-center italic py-1">
                        Du deltar som «Skjult bidragsyter». Poengene dine telles med i lagets pott, men du er skjult på denne listen.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* FANE 2: MITT LAG & PERSONVERN */}
              {activeTab === 'profil' && (
                <div className="space-y-3.5">
                  {/* Valg av lag / lokasjon */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">
                      Velg din lokasjon / avdeling:
                    </label>
                    <select
                      value={profile?.teamId || ''}
                      onChange={(e) => updateTeam(e.target.value)}
                      className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      {org.teams?.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} {team.location ? `(${team.location})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Valg av Synlighet & Personvern */}
                  <div className="space-y-2 pt-1 border-t border-zinc-800">
                    <label className="text-xs font-bold text-zinc-300 block">
                      Hvordan vil du vises i konkurransen?
                    </label>

                    <div className="grid grid-cols-3 gap-1.5">
                      {/* 1. Fullt navn */}
                      <button
                        onClick={() => updatePrivacyMode('navn')}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                          profile?.privacyMode === 'navn'
                            ? 'bg-blue-600/30 border-blue-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-bold">Fullt navn</span>
                        <span className="text-[8px] text-zinc-400">Åpen profil</span>
                      </button>

                      {/* 2. Anonym avatar */}
                      <button
                        onClick={() => updatePrivacyMode('anonym')}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                          profile?.privacyMode === 'anonym'
                            ? 'bg-amber-600/30 border-amber-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Eye className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-bold">Anonym</span>
                        <span className="text-[8px] text-zinc-400">Med maskot</span>
                      </button>

                      {/* 3. Skjult bidragsyter */}
                      <button
                        onClick={() => updatePrivacyMode('skjult')}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                          profile?.privacyMode === 'skjult'
                            ? 'bg-purple-600/30 border-purple-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <EyeOff className="w-4 h-4 text-purple-400" />
                        <span className="text-[10px] font-bold">Skjult</span>
                        <span className="text-[8px] text-zinc-400">Kun lagpott</span>
                      </button>
                    </div>
                  </div>

                  {/* Tilpasning for Anonym modus */}
                  {profile?.privacyMode === 'anonym' && (
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Tilpass din anonyme maskot
                      </span>

                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Kallenavn:</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={profile.alias || ''}
                            onChange={(e) => updateAlias(e.target.value)}
                            placeholder="f.eks. Morgenfuglen"
                            className="flex-1 py-1.5 px-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
                          />
                          <button
                            onClick={() => {
                              const rnd = ANONYMOUS_ALIASES[Math.floor(Math.random() * ANONYMOUS_ALIASES.length)];
                              updateAlias(rnd);
                            }}
                            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-bold"
                          >
                            Tilfeldig
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 block mb-1">Ikon:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {AVATAR_ICONS.map((icon) => (
                            <button
                              key={icon}
                              onClick={() => updateAvatar(icon)}
                              className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                                profile.avatarIcon === icon
                                  ? 'bg-amber-500/30 border border-amber-400 scale-110'
                                  : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800'
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dine personlige bidrag */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Dine bidrag til laget
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 bg-zinc-900 rounded-xl">
                        <span className="font-black text-amber-400 text-sm block">{profile?.points || 0}</span>
                        <span className="text-[8px] uppercase text-zinc-400 font-bold">Poeng</span>
                      </div>
                      <div className="p-2 bg-zinc-900 rounded-xl">
                        <span className="font-black text-blue-400 text-sm block">{profile?.minutes || 0}</span>
                        <span className="text-[8px] uppercase text-zinc-400 font-bold">Minutter</span>
                      </div>
                      <div className="p-2 bg-zinc-900 rounded-xl">
                        <span className="font-black text-emerald-400 text-sm block">{profile?.sessions || 0}</span>
                        <span className="text-[8px] uppercase text-zinc-400 font-bold">Økter</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleLeave}
                    className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-rose-300 font-bold text-xs rounded-xl border border-zinc-800 transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Koble fra denne organisasjonen
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Bli med i organisasjon */
            <div className="space-y-3">
              <form onSubmit={handleJoin} className="space-y-2">
                <label htmlFor="org-code-input" className="text-xs font-bold text-zinc-300">
                  Tast inn bedrifts- eller avtalekode
                </label>
                <div className="flex gap-2">
                  <input
                    id="org-code-input"
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="f.eks. HMS2026, KOR2026"
                    className="flex-1 py-2.5 px-3 font-mono text-sm font-bold bg-zinc-950 border border-zinc-800 rounded-2xl text-white tracking-wider focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1"
                  >
                    <span>Bli med</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Hurtigvalg for piloter */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400">
                  Pilotavtaler for testing:
                </span>
                <div className="space-y-1.5">
                  {PRESET_ORGANIZATIONS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setInputCode(preset.joinCode);
                        joinOrganizationByCode(preset.joinCode);
                      }}
                      className="w-full p-2.5 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-left transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-blue-300">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-zinc-400">{preset.department}</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300">
                        {preset.joinCode}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lukk-knapp */}
        <div className="pt-2 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-2xl transition-all"
          >
            Lukk portal
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};

