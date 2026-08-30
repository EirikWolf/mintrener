import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  getUserOrganization,
  joinOrganizationByCode,
  leaveOrganization,
  getOrganizationStats,
  PRESET_ORGANIZATIONS,
} from '../../services/organizationService';
import { Organization } from '../../schemas/organizationSchema';
import {
  Building2,
  X,
  Users,
  Clock,
  ShieldCheck,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface OrganizationPortalModalProps {
  onClose: () => void;
}

export const OrganizationPortalModal: React.FC<OrganizationPortalModalProps> = ({
  onClose,
}) => {
  const [org, setOrg] = useState<Organization | null>(() => getUserOrganization());
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  useEffect(() => {
    const handler = () => {
      setOrg(getUserOrganization());
    };
    window.addEventListener('organization-changed', handler);
    return () => window.removeEventListener('organization-changed', handler);
  }, []);

  const stats = org ? getOrganizationStats(org.id) : null;

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
    setSuccessMsg('Du er nå koblet fra organisasjonen.');
  };

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
        className="w-full max-w-md max-h-[88vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[111] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="org-portal-title" className="text-base font-black text-white">
                Bedrift, Kor & Organisasjon
              </h2>
              <p className="text-[10px] text-zinc-400">Fellespause og anonym aktivitetsstatistikk</p>
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
          {/* Personvernsgaranti */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              100 % Anonymt (Ingen sjefs-overvåking)
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Arbeidsgiver eller instruktør ser <strong>kun aggregerte fellestall</strong> (over terskel 3). Ingen personlige treningslogger, helsedata eller fravær deles.
            </p>
          </div>

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

          {/* Aktiv Tilknytning */}
          {org ? (
            <div className="space-y-3">
              <div className="p-4 bg-zinc-950 border border-blue-500/40 rounded-2xl space-y-3 shadow-lg shadow-blue-500/10">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                      Tilknyttet avtale
                    </span>
                    <h3 className="text-base font-black text-white">{org.name}</h3>
                    {org.department && (
                      <p className="text-xs text-zinc-400">{org.department}</p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold font-mono">
                    {org.joinCode}
                  </span>
                </div>

                {/* Aggregerte nøkkeltall. Uten backend-aggregering finnes ingen
                    tall å vise — da sier vi det, framfor å vise oppdiktede. */}
                {!stats && (
                  <div className="pt-1 border-t border-zinc-800/80">
                    <p className="text-[10px] text-zinc-400 text-center leading-relaxed py-1.5">
                      Felles statistikk vises når minst tre medlemmer har trent i samme
                      periode. Enkeltpersoners økter vises aldri.
                    </p>
                  </div>
                )}

                {stats && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80 text-center">
                    <div className="p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-center gap-1 text-blue-400 text-sm font-black">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{stats.totalMinutesThisWeek} min</span>
                      </div>
                      <span className="text-[9px] text-zinc-400 uppercase font-bold">Trent denne uken</span>
                    </div>

                    <div className="p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-center gap-1 text-emerald-400 text-sm font-black">
                        <Users className="w-3.5 h-3.5" />
                        <span>{stats.activeMembersCount} aktive</span>
                      </div>
                      <span className="text-[9px] text-zinc-400 uppercase font-bold">Fellesinnsats</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleLeave}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-300 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Koble fra denne organisasjonen
              </button>
            </div>
          ) : (
            /* Bli med i organisasjon */
            <div className="space-y-3">
              <form onSubmit={handleJoin} className="space-y-2">
                <label htmlFor="org-code-input" className="text-xs font-bold text-zinc-300">
                  Tast inn organisasjonskode
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
