import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, Lock, Eye, Trash2, Smartphone, Award } from 'lucide-react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  // WCAG: Lukk ved trykk på Escape-tast
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        className="w-full max-w-md max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[111]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 id="privacy-modal-title" className="text-base font-black text-white">Personvernerklæring & Vilkår</h2>
              <p className="text-[10px] text-zinc-400">Min Trener (GDPR-etterlevelse)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk personvernmodal"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollbart Innhold */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs text-zinc-300 leading-relaxed">
          {/* 1. Hovedprinsipp */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              Ditt personvern er 100 % ivaretatt
            </div>
            <p className="text-[11px] text-zinc-300">
              Min Trener er bygget etter prinsippet om <strong>innebygd personvern (Privacy by Design)</strong>. Vi selger aldri dine data, og appen inneholder ingen tredjeparts annonsesporing eller analyseverktøy.
            </p>
          </div>

          {/* 2. Hva lagres */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              1. Hvilke data vi samler inn
            </h3>
            <p className="text-[11px] text-zinc-400">
              • <strong>Brukerkonto (Google):</strong> Navn, e-postadresse og profilbilde for identifisering og innlogging.
              <br />
              • <strong>Treningsdata:</strong> Tidspunkt, varighet, fullførte intervaller og antall repetisjoner for historikk og statistikk.
              <br />
              • <strong>Sensorer:</strong> Bevegelsesdata (akselerometer/gyroskop) behandles lokalt i sanntid på din enhet for rep-telling og lagres aldri eksternt.
            </p>
          </div>

          {/* 3. Lagring & Sikkerhet */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              2. Lagring og sikkerhet
            </h3>
            <p className="text-[11px] text-zinc-400">
              Dataene dine lagres kryptert i Google Firebase Cloud Firestore (i europeiske datasentre). Tilgang er sikret gjennom strenge sikkerhetsregler (Security Rules), slik at kun du har tilgang til dine egne treningsøkter.
            </p>
          </div>

          {/* 4. Dine rettigheter (GDPR) */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              3. Dine rettigheter (GDPR)
            </h3>
            <p className="text-[11px] text-zinc-400">
              Du har full rett til innsyn, retting og permanent sletting («retten til å bli glemt») av alle dine data.
            </p>
          </div>

          {/* 5. Sletting */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5 text-rose-400">
              <Trash2 className="w-4 h-4" />
              4. Sletting av konto og data
            </h3>
            <p className="text-[11px] text-zinc-400">
              Du kan når som helst slette din brukerkonto og alle tilknyttede treningslogger direkte fra profilmenyen i appen. Handlingen er umiddelbar og ugjenkallelig.
            </p>
          </div>
        </div>

        {/* Lukk-knapp */}
        <div className="pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-2xl transition-all"
          >
            Jeg forstår og godtar
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
