import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, Lock, Eye, Trash2, Smartphone, Download } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  const modal = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-modal-title"
        className="w-full max-w-md max-h-[88vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4 relative z-[111] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 id="privacy-modal-title" className="text-base font-black text-white">Personvernerklæring & Vilkår</h2>
              <p className="text-[10px] text-zinc-400">Min Trener (GDPR Art. 13/14 etterlevelse)</p>
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
              100 % Innebygd personvern (Privacy by Design)
            </div>
            <p className="text-[11px] text-zinc-300">
              Min Trener selger aldri dine data, benytter ingen tredjeparts annonsesporing eller kommersielle profileringsverktøy, og lagrer data primært lokalt på din enhet.
            </p>
          </div>

          {/* 2. Hvilke data behandles */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              1. Hvilke data som behandles
            </h3>
            <p className="text-[11px] text-zinc-400 space-y-1">
              • <strong>Treningshistorikk & mål:</strong> Varighet, fullførte runder, egne øvelser og progresjonslogger lagres lokalt (og synkes kryptert i Firestore ved innlogging).<br />
              • <strong>Helsedata (GDPR Art. 9):</strong> Valgfritt fødselsår, puls (Bluetooth LE) og intensitetssoner behandles for personlig tilpasset pulsvisning.<br />
              • <strong>GPS & Posisjon:</strong> Geolokasjon ved utendørsøkter brukes kun lokalt for rute og distanseberegning under aktiv økt.<br />
              • <strong>Bevegelsessensorer:</strong> Akselerometer og gyroskop for repetisjonstelling kjører 100 % lokalt i nettleseren og sendes aldri over nettverket.
            </p>
          </div>

          {/* 3. Grupperom & Sikkerhet */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              2. Grupperom og databehandlere
            </h3>
            <p className="text-[11px] text-zinc-400">
              Sanntids gruppeøkter synkroniseres via sikre 6-tegns romkoder uten at fullt navn eller e-postadresse eksponeres for andre deltakere. Skylagring kjøres i Google Firebase (europeiske datasentre, GDPR-databehandleravtale).
            </p>
          </div>

          {/* 4. Dine rettigheter: Innsyn & Eksport */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" />
              3. Dine rettigheter (GDPR Art. 15, 17, 20)
            </h3>
            <p className="text-[11px] text-zinc-400">
              Du kan når som helst <strong>eksportere alle dine data</strong> som en strukturert JSON- eller CSV-fil (dataportabilitet), eller kreve <strong>permanent sletting</strong> av alle lokale og skylagrede data.
            </p>
          </div>

          {/* 5. Sletting */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5 text-rose-400">
              <Trash2 className="w-4 h-4" />
              4. Sletting av konto og data
            </h3>
            <p className="text-[11px] text-zinc-400">
              Ved å trykke på «Slett alle data» i innstillingene fjernes samtlige lokale lagringsnøkler, Firestore-dokumenter og brukerkonto umiddelbart og ugjenkallelig.
            </p>
          </div>
        </div>

        {/* Lukk-knapp */}
        <div className="pt-2 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-2xl transition-all"
          >
            Lukk personvernerklæring
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
