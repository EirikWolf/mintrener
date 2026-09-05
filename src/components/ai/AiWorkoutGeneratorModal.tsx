import React, { useState, useRef } from 'react';
import {
  generateCustomAiWorkout,
  AiWorkoutPrompt,
  WorkoutPacingRatio,
} from '../../services/aiWorkoutGeneratorService';
import {
  getInjuryProfile,
  translatePainPointsToAvoidList,
} from '../../services/injuryAlternativeService';
import { WorkoutTemplate } from '../../types/workout';
import {
  Bot,
  Sparkles,
  Play,
  X,
  Clock,
  Battery,
  ShieldAlert,
  Flame,
  Check,
  Timer,
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AiWorkoutGeneratorModalProps {
  onClose: () => void;
  onStartWorkout: (workout: WorkoutTemplate) => void;
}

export const AiWorkoutGeneratorModal: React.FC<AiWorkoutGeneratorModalProps> = ({
  onClose,
  onStartWorkout,
}) => {
  const [duration, setDuration] = useState<number>(7);
  const [focus, setFocus] = useState<AiWorkoutPrompt['focus']>('helkropp');
  const [energy, setEnergy] = useState<'lav' | 'middels' | 'høy'>('middels');
  const [pacing, setPacing] = useState<WorkoutPacingRatio>('standard_2_1');
  const [avoidList, setAvoidList] = useState<string[]>(() =>
    translatePainPointsToAvoidList(getInjuryProfile().painPoints)
  );
  const [generatedWorkout, setGeneratedWorkout] = useState<WorkoutTemplate | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { onClose });

  const toggleAvoid = (tag: string) => {
    setAvoidList((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerate = () => {
    const workout = generateCustomAiWorkout({
      durationMinutes: duration,
      focus,
      energyLevel: energy,
      pacingRatio: pacing,
      avoidInjuries: avoidList,
    });
    setGeneratedWorkout(workout);
  };

  const handleStart = () => {
    if (generatedWorkout) {
      onStartWorkout(generatedWorkout);
      onClose();
    } else {
      const workout = generateCustomAiWorkout({
        durationMinutes: duration,
        focus,
        energyLevel: energy,
        pacingRatio: pacing,
        avoidInjuries: avoidList,
      });
      onStartWorkout(workout);
      onClose();
    }
  };

  // WCAG: Lukk ved trykk på Escape-tast
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 text-white"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-generator-title"
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 id="ai-generator-title" className="font-black text-base text-white">Smart øktbygger</h3>
              <p className="text-xs text-zinc-400">Skreddersydd økt på sekunder</p>
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

        {/* 1. Varighet */}
        <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Tilgjengelig tid:
            </span>
            <span className="text-emerald-400 font-mono font-black text-sm">{duration} minutter</span>
          </div>

          {/* Hurtigvalg for mikropauser vs. fulle økter */}
          <div role="radiogroup" aria-label="Varighet" className="grid grid-cols-7 gap-1">
            {[3, 5, 10, 20, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                role="radio"
                aria-checked={duration === mins}
                onClick={() => setDuration(mins)}
                className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  duration === mins
                    ? 'bg-emerald-500 text-zinc-950 font-black border-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Finjustering slider fra 3 til 60 min */}
          <div className="pt-1">
            <input
              type="range"
              min={3}
              max={60}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>3 min (mikropause)</span>
              <span>20 min</span>
              <span>45 min</span>
              <span>60 min (full økt)</span>
            </div>
          </div>
        </div>

        {/* 2. Fokusområde */}
        <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Hva vil du trene?
          </span>
          <div role="radiogroup" aria-label="Fokusområde" className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { id: 'helkropp', label: '🏋️ Helkropp' },
              { id: 'kontor_nakke', label: '💻 Nakke & Kontor' },
              { id: 'kjerne', label: '🛡️ Kjerne / Mage' },
              { id: 'bein', label: '🦵 Bein & Sete' },
              { id: 'puls', label: '⚡ Kondisjon / Puls' },
              { id: 'rolig_strekk', label: '🧘 Rolig Mobilitet' },
            ].map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={focus === f.id}
                onClick={() => setFocus(f.id as any)}
                className={`p-2 rounded-xl text-left border transition-all ${
                  focus === f.id
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Energinivå & Skånsomhet */}
        <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            Energinivå i dag:
          </span>
          <div role="radiogroup" aria-label="Energinivå" className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'lav', label: '🌱 Lav / Rolig' },
              { id: 'middels', label: '🔥 Middels' },
              { id: 'høy', label: '⚡ Full gass' },
            ].map((e) => (
              <button
                key={e.id}
                role="radio"
                aria-checked={energy === e.id}
                onClick={() => setEnergy(e.id as any)}
                className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  energy === e.id
                    ? 'bg-emerald-600 text-white font-black border-emerald-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-850 space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              Ta hensyn til (valgfritt):
            </span>
            <div role="group" aria-label="Hensyn til skader" className="flex flex-wrap gap-1">
              {['hopp', 'knær', 'korsrygg', 'skuldre'].map((issue) => {
                const isSelected = avoidList.includes(issue);
                return (
                  <button
                    key={issue}
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleAvoid(issue)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      isSelected
                        ? 'bg-amber-950 border-amber-500 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    Unngå {issue}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Intervalltempo & Arbeids-/hvile-ratio (Horisont 2) */}
        <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-cyan-400" />
            Intervalltempo & Pause:
          </span>
          <div role="radiogroup" aria-label="Intervalltempo og ratio" className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              { id: 'standard_2_1', label: '⚖️ Standard (40s / 20s)', desc: 'Balansert styrke & puls' },
              { id: 'rolig_1_1', label: '🌱 Rolig (30s / 30s)', desc: 'God tid til pust & teknikk' },
              { id: 'tabata_2_1', label: '🔥 Tabata (20s / 10s)', desc: 'Høy puls & korte pauser' },
              { id: 'emom_5_1', label: '⏱️ EMOM (50s / 10s)', desc: 'Maks arbeidstid per runde' },
            ].map((r) => (
              <button
                key={r.id}
                role="radio"
                aria-checked={pacing === r.id}
                onClick={() => setPacing(r.id as any)}
                className={`p-2 rounded-xl text-left border transition-all ${
                  pacing === r.id
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-[11px]">{r.label}</div>
                <div className="text-[9.5px] opacity-75">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Forhåndsvisning hvis generert */}
        {generatedWorkout && (
          <div className="p-3 bg-zinc-900 border border-emerald-500/60 rounded-2xl space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {generatedWorkout.name}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {generatedWorkout.items.length} øvelser • {generatedWorkout.rounds} runder
              </span>
            </div>
            <div className="flex flex-wrap gap-1 text-[10px] text-zinc-300">
              {generatedWorkout.items.map((item, idx) => (
                <span key={idx} className="bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                  {item.exercise.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Handlingsknapper */}
        <div className="pt-2 border-t border-zinc-850 flex gap-2">
          {!generatedWorkout ? (
            <button
              onClick={handleGenerate}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black rounded-2xl shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Sett sammen økt
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Start generert økt nå!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
