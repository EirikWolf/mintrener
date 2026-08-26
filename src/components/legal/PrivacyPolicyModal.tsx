import React from 'react';
import { ShieldCheck, X, Lock, Eye, Trash2, Smartphone, Award } from 'lucide-react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-black text-white">Personvernerklæring & Vilkår</h2>
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

          {/* 2. Sensordata */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              1. Lokal behandling av sensordata
            </h3>
            <p className="text-[11px] text-zinc-400">
              Alle sensordata (som bevegelse, skritt, vibrasjon og lydsignaler) behandles <strong>kun lokalt i sanntid på din egen telefon</strong>. Ingen rå sensordata overføres eller lagres eksternt.
            </p>
          </div>

          {/* 3. Innlogging og lagring */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Eye className="w-4 h-4 text-emerald-400" />
              2. Hvilke data vi lagrer
            </h3>
            <p className="text-[11px] text-zinc-400">
              Hvis du velger å logge inn med Google, lagres kun følgende sikkert i Google Cloud / Firebase (europeiske servere):
            </p>
            <ul className="list-disc list-inside text-[11px] text-zinc-400 space-y-0.5 pl-1">
              <li>Ditt navn, e-postadresse og bruker-ID.</li>
              <li>Dine egendefinerte treningsmaler.</li>
              <li>Historikk over fullførte økter (dato, varighet og antall runder).</li>
            </ul>
          </div>

          {/* 4. Retten til sletting (GDPR) */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
              <Trash2 className="w-4 h-4 text-rose-400" />
              3. Retten til å bli glemt (GDPR art. 17)
            </h3>
            <p className="text-[11px] text-zinc-400">
              Du kan når som helst slette din konto og alle tilhørende data med ett enkelt klikk under <em>«Min profil → Slett min konto og alle treningsdata»</em>. Slettingen er umiddelbar og permanent.
            </p>
          </div>

          {/* 5. Brukervilkår */}
          <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
            <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Award className="w-4 h-4 text-amber-400" />
              4. Ansvar og treningshelse
            </h3>
            <p className="text-[11px] text-zinc-400">
              Trening utføres på eget ansvar. Lytt alltid til kroppen din og konsulter helsepersonell dersom du er usikker på om høyintensiv intervalltrening passer for deg.
            </p>
          </div>
        </div>

        {/* Lukk-knapp */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold rounded-2xl text-xs transition-all"
        >
          Forstått og lukk
        </button>
      </div>
    </div>
  );
};
