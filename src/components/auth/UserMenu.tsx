import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';
import { User as UserIcon, LogOut, Trash2, X, Shield } from 'lucide-react';

interface UserMenuProps {
  onOpenCurator?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenCurator }) => {
  const { user, loading, signInWithGoogle, logout, deleteAccount } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

        {onOpenCurator && (
          <button
            onClick={onOpenCurator}
            title="Bildekurator (Kitor QA)"
            className="p-1.5 rounded-full text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        )}

        {isPrivacyOpen && (
          <PrivacyPolicyModal onClose={() => setIsPrivacyOpen(false)} />
        )}
      </div>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsOpen(false);
      setIsConfirmingDelete(false);
    } catch (err) {
      console.error('Feil ved sletting av konto:', err);
      alert('Kunne ikke slette kontoen. Vennligst logg inn på nytt og prøv igjen.');
    } finally {
      setIsDeleting(false);
    }
  };

  const modal = isOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-emerald-400" />
            Min Profil
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsConfirmingDelete(false);
            }}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
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
              className="w-12 h-12 rounded-full border-2 border-emerald-500"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-lg font-black text-white">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="overflow-hidden">
            <h3 className="font-bold text-white text-base truncate">
              {user.displayName || 'Navnløs bruker'}
            </h3>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
          </div>
        </div>

        {/* Handlinger */}
        <div className="space-y-2.5 pt-2">
          {/* Bildekurator */}
          {onOpenCurator && (
            <button
              onClick={() => {
                onOpenCurator();
                setIsOpen(false);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-800 text-emerald-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-emerald-900/40"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Bildekurator & QA (Kitor)
            </button>
          )}

          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logg ut
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
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
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
      {/* Avatar-knapp i topplinjen */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Åpne brukerprofil"
        className="relative rounded-full p-0.5 border border-zinc-700 hover:border-emerald-500 transition-all active:scale-95 shadow-sm"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Bruker'}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
        )}
      </button>

      {/* Profil Modal (Portal til document.body) */}
      {typeof document !== 'undefined' && modal && createPortal(modal, document.body)}

      {/* Personvern Modal */}
      {isPrivacyOpen && (
        <PrivacyPolicyModal onClose={() => setIsPrivacyOpen(false)} />
      )}
    </>
  );
};
