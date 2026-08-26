import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HelpCircle,
  X,
  Zap,
  Star,
  Dumbbell,
  Navigation,
  Users,
  Activity,
  Shield,
  Volume2,
  Lock,
  Sparkles,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface AboutGuideModalProps {
  onClose: () => void;
}

export const AboutGuideModal: React.FC<AboutGuideModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<'oversikt' | 'funksjoner' | 'tips' | 'om'>('oversikt');

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[88vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-3.5 relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Om Min Trener</h2>
              <p className="text-[10px] text-zinc-400">Guide, funksjoner & smarte tips</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk hjelpeveiledning"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fanevelger */}
        <div className="grid grid-cols-4 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 shrink-0 text-center text-xs font-bold">
          <button
            onClick={() => setActiveSection('oversikt')}
            className={`py-1.5 rounded-xl transition-all ${
              activeSection === 'oversikt' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Oversikt
          </button>
          <button
            onClick={() => setActiveSection('funksjoner')}
            className={`py-1.5 rounded-xl transition-all ${
              activeSection === 'funksjoner' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Funksjoner
          </button>
          <button
            onClick={() => setActiveSection('tips')}
            className={`py-1.5 rounded-xl transition-all ${
              activeSection === 'tips' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tips
          </button>
          <button
            onClick={() => setActiveSection('om')}
            className={`py-1.5 rounded-xl transition-all ${
              activeSection === 'om' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Om appen
          </button>
        </div>

        {/* Scrollbart Innhold */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs text-zinc-300 leading-relaxed">
          {/* 1. OVERSIKT */}
          {activeSection === 'oversikt' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-gradient-to-br from-emerald-950/40 to-zinc-900 border border-emerald-800/40 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Treningsassistent uten friksjon
                </div>
                <p className="text-[11px] text-zinc-300">
                  <strong>Min Trener</strong> er bygget etter prinsippet <em>«Én hånd, ett blikk»</em>. Alt er optimalisert for mobilskjermen med store tall, tydelige farger og norsk stemmeveiledning.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Hovedområder</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                    <p className="font-bold text-white text-xs flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-current" /> Favoritter
                    </p>
                    <p className="text-[10px] text-zinc-400">Sveip mellom favoritt-øktene dine rett på forsiden.</p>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                    <p className="font-bold text-white text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400 fill-current" /> Microtrening
                    </p>
                    <p className="text-[10px] text-zinc-400">1 øvelse i 1–5 minutter på kontoret eller stua.</p>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                    <p className="font-bold text-white text-xs flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-cyan-400" /> Programmer
                    </p>
                    <p className="text-[10px] text-zinc-400">Ferdige økter, Tabata og 30-dagers progresjonsserier.</p>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                    <p className="font-bold text-white text-xs flex items-center gap-1">
                      <Users className="w-3 h-3 text-purple-400" /> Grupperom
                    </p>
                    <p className="text-[10px] text-zinc-400">Koble sammen flere mobiler for synkron trening.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. FUNKSJONER */}
          {activeSection === 'funksjoner' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Microtrening & «Hold til du gir opp»
                </div>
                <p className="text-[11px] text-zinc-400">
                  Raske hverdagsøkter (f.eks. planke, skulderrull eller knebøy ved pulten). «Hold til du gir opp» teller oppover og lagrer tiden som personlig rekord når du trykker stopp.
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
                  Styrkelogg & Hviletimer
                </div>
                <p className="text-[11px] text-zinc-400">
                  Loggfør kg og repetisjoner under «Øvelser → Styrkelogg». Starter automatisk en 60s hviletimer mellom sett og beregner estimert 1RM (maks-løft).
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  GPS Utendørsøkt & GPX-eksport
                </div>
                <p className="text-[11px] text-zinc-400">
                  Trykk «GPS» for å måle distanse, tempo (min/km) og fart på løpetur, gåtur eller sykling. Etter fullført økt kan du laste ned standard GPX-fil til Strava eller Garmin!
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  Synkroniserte Grupperom
                </div>
                <p className="text-[11px] text-zinc-400">
                  Trykk «Gruppe» for å opprette et rom med en 4-sifret kode. Kollegaer eller familie taster inn koden på sine mobiler, og timeren starter 100 % synkront hos alle.
                </p>
              </div>
            </div>
          )}

          {/* 3. SMARTE TIPS */}
          {activeSection === 'tips' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  1. Skjermlås mot lommestruping
                </div>
                <p className="text-[11px] text-zinc-400">
                  Trykk på hengelåsen under timeren for å låse skjermen. Timeren og stemmen kjører videre, uten fare for at mobilen i lomma eller hånden trykker feil.
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  2. Taleveileder & Lydsignaler
                </div>
                <p className="text-[11px] text-zinc-400">
                  Appen bruker Web Speech for å annonsere neste øvelse og telle ned 3-2-1. Du kan slå av/på tale eller lydpip når som helst i toppmenyen.
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  3. Bevegelsesteller & Bluetooth Puls
                </div>
                <p className="text-[11px] text-zinc-400">
                  Under «Puls & Sensorer» kan du koble til Bluetooth pulsbelte (f.eks. Polar/Garmin). Mobilen kan også telle repetisjoner via innebygde bevegelsessensorer.
                </p>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  4. Tilpass og lagre egne varianter
                </div>
                <p className="text-[11px] text-zinc-400">
                  Trykk «✏️ Tilpass» på et hvilket som helst program for å justere sekunder eller repetisjoner. Lagre på profilen din og stjernemerk som favoritt!
                </p>
              </div>
            </div>
          )}

          {/* 4. OM APPEN & PERSONVERN */}
          {activeSection === 'om' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                <h3 className="font-bold text-white text-xs">Min Trener (PWA)</h3>
                <p className="text-[11px] text-zinc-400">
                  <strong>Versjon:</strong> 1.0 (Mobil-først PWA)<br />
                  <strong>Plattform:</strong> Installerbar på hjemskjerm (Android & iOS)<br />
                  <strong>Backend:</strong> Google Firebase & Cloud Firestore
                </p>
              </div>

              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                  <Shield className="w-4 h-4" />
                  100 % Innebygd personvern (Privacy by Design)
                </div>
                <p className="text-[11px] text-zinc-400">
                  Ingen tredjeparts annonsesporing eller salg av data. Appen fungerer helt anonymt lokalt, eller med valgfri Google-innlogging for skysynk. Du kan når som helst laste ned alle dine data (CSV/JSON) eller slette kontoen permanent.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Lukk-knapp */}
        <div className="pt-2 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-2xl transition-all"
          >
            Lukk veiledning
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
