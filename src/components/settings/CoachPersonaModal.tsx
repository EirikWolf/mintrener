import React, { useState, useEffect } from 'react';
import { X, Play, Square, Check, Mic } from 'lucide-react';
import {
  COACH_PERSONAS,
  CoachPersonaId,
  getActiveCoachPersona,
  setActiveCoachPersona,
  preloadPersonaAudio,
  playPersonaPreview,
  stopCurrentPersonaAudio
} from '../../services/coachPersonaService';

interface CoachPersonaModalProps {
  onClose: () => void;
}

export const CoachPersonaModal: React.FC<CoachPersonaModalProps> = ({ onClose }) => {
  const [selectedPersona, setSelectedPersona] = useState<CoachPersonaId>(getActiveCoachPersona);
  const [playingId, setPlayingId] = useState<CoachPersonaId | null>(null);

  useEffect(() => {
    return () => {
      stopCurrentPersonaAudio();
    };
  }, []);

  const handleSelect = (id: CoachPersonaId) => {
    setSelectedPersona(id);
    setActiveCoachPersona(id);
    // β6 (spec § 5, offline-garantien): varm hele personaens lydsett idet
    // valget tas — nedlastingene lander samtidig i workbox' runtime-cache, så
    // lydbanken er offline-tilgjengelig før første økt. Fire-and-forget:
    // preload feiler aldri kalleren (motoren logger og hopper over), UI
    // blokkeres ikke.
    void preloadPersonaAudio(id);
  };

  const handleTogglePreview = async (e: React.MouseEvent, id: CoachPersonaId) => {
    e.stopPropagation();

    if (playingId === id) {
      stopCurrentPersonaAudio();
      setPlayingId(null);
      return;
    }

    setPlayingId(id);
    const audio = await playPersonaPreview(id);
    if (audio) {
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
    } else {
      setPlayingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-persona-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 id="coach-persona-title" className="text-base font-black text-white">
                Trenerstemmer & Dialekter
              </h2>
              <p className="text-[11px] text-zinc-400">
                Velg personlighet, dialekt og energi under øktene
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Personaer Liste */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
          {COACH_PERSONAS.map((persona) => {
            const isSelected = selectedPersona === persona.id;
            const isPlaying = playingId === persona.id;

            return (
              <div
                key={persona.id}
                onClick={() => handleSelect(persona.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
                }`}
              >
                {/* Topprad: Ikon, Navn, Badge, Forhåndshør-knapp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">{persona.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-white truncate">{persona.name}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {persona.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{persona.dialectOrStyle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {persona.previewUrl && (
                      <button
                        type="button"
                        onClick={(e) => handleTogglePreview(e, persona.id)}
                        aria-label={`Forhåndshør ${persona.name}`}
                        title="Hør stemmeprøve"
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ${
                          isPlaying
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black animate-pulse'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stopp</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Hør</span>
                          </>
                        )}
                      </button>
                    )}

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-zinc-950'
                          : 'border-zinc-700 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>
                </div>

                {/* Sitat / Tagline */}
                <p className="text-[11px] font-semibold text-amber-300/90 italic">
                  {persona.tagline}
                </p>

                {/* Beskrivelse */}
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {persona.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bunn-knapp */}
        <div className="pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all"
          >
            Bruk denne treneren
          </button>
        </div>
      </div>
    </div>
  );
};
