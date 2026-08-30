import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';
import { AboutGuideModal } from '../help/AboutGuideModal';
import { OrganizationPortalModal } from '../organization/OrganizationPortalModal';
import { User as UserIcon, LogOut, Trash2, X, Shield, HelpCircle, Building2 } from 'lucide-react';
import { showErrorToast } from '../../services/errorToastService';

interface UserMenuProps {
  onOpenCurator?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenCurator }) => {
  const { user, loading, signInWithGoogle, logout, deleteAccount } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isOrgOpen, setIsOrgOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // WCAG: Lukk ved trykk på Escape-tast (Må ligge før tidlige returer jf. Rules of Hooks)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsConfirmingDelete(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsOpen(false);
      setIsConfirmingDelete(false);
    } catch (err) {
      console.error('Feil ved sletting av konto:', err);
      showErrorToast('Kunne ikke slette kontoen. Logg inn på nytt og prøv igjen.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => signInWithGoogle()}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-bold text-zinc-300 transition-all shadow-sm active:scale-95"
        >
          <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Logg inn</span>
        </button>

        {isPrivacyOpen && (
          <PrivacyPolicyModal onClose={() => setIsPrivacyOpen(false)} />
        )}
      </div>
    );
  }

  const modal = isOpen ? (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
          setIsConfirmingDelete(false);
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-title"
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <h2 id="user-profile-title" className="text-lg font-bold text-white">
            Din Profil
          </h2>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsConfirmingDelete(false);
            }}
            aria-label="Lukk profil"
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Brukerinfo */}
        <div className="flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Bruker'}
              className="w-12 h-12 rounded-full border border-emerald-500"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-lg font-bold text-white">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-white truncate">
              {user.displayName || 'Navnløs bruker'}
            </p>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
          </div>
        </div>

        {/* Handlinger */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          {/* Kurator-snarvei for trenere/innholdsskapere */}
          {onOpenCurator && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCurator();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-amber-900/40"
            >
              <span>⭐</span>
              <span>Treningskurator & Validering</span>
            </button>
          )}

          {/* Logg ut */}
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logg ut
          </button>

          {/* Organisasjon & Bedriftsavtale */}
          <button
            onClick={() => setIsOrgOpen(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-800 text-blue-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-blue-900/40"
          >
            <Building2 className="w-3.5 h-3.5" />
            Bedrift, Kor & Organisasjon
          </button>

          {/* Om Min Trener & Veiledning */}
          <button
            onClick={() => setIsAboutOpen(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-800 text-emerald-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-emerald-900/40"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Om Min Trener & Veiledning (?)
          </button>

          {/* Personvernerklæring & Vilkår */}
          <button
            onClick={() => setIsPrivacyOpen(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-zinc-800"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Personvernerklæring & Vilkår
          </button>

          {/* Slett konto (GDPR-krav) */}
          {!isConfirmingDelete ? (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="w-full py-2 px-4 rounded-2xl bg-zinc-900/50 hover:bg-rose-950/30 text-rose-400/70 hover:text-rose-400 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Slett min konto og treningsdata
            </button>
          ) : (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-2xl space-y-3">
              <p className="text-xs text-rose-200 font-medium">
                Er du sikker? Alle dine treningslogger og innstillinger blir slettet permanent.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                >
                  {isDeleting ? 'Sletter...' : 'Ja, slett alt'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Profil og innstillinger"
        className="p-1 rounded-full hover:bg-zinc-800 transition-colors flex items-center gap-2"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Bruker'}
            className="w-7 h-7 rounded-full border border-emerald-500"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
        )}
      </button>

      {/* Profil Modal (Portal til document.body) */}
      {typeof document !== 'undefined' && isOpen && createPortal(modal, document.body)}

      {/* Organisasjonsportal Modal */}
      {isOrgOpen && (
        <OrganizationPortalModal onClose={() => setIsOrgOpen(false)} />
      )}

      {/* Personvern Modal */}
      {isPrivacyOpen && (
        <PrivacyPolicyModal onClose={() => setIsPrivacyOpen(false)} />
      )}

      {/* Om Min Trener Modal */}
      {isAboutOpen && (
        <AboutGuideModal onClose={() => setIsAboutOpen(false)} />
      )}
    </>
  );
};
