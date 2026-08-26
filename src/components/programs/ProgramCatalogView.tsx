import React, { useState } from 'react';
import { TRAINING_PROGRAMS } from '../../data/programs';
import { CONTEXT_PROFILES, TrainingMode } from '../../data/contextProfiles';
import { WorkoutTemplate } from '../../types/workout';
import {
  Play,
  Clock,
  Zap,
  Users,
  User,
  Radio,
  Briefcase,
  Smile,
  Heart,
  Music,
  Trophy,
  Sparkles,
} from 'lucide-react';

interface ProgramCatalogViewProps {
  onStartProgram: (workout: WorkoutTemplate) => void;
}

export const ProgramCatalogView: React.FC<ProgramCatalogViewProps> = ({ onStartProgram }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('alene');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('alle');

  const getProfileIcon = (iconName: string) => {
    switch (iconName) {
      case 'Briefcase': return <Briefcase className="w-4 h-4" />;
      case 'Smile': return <Smile className="w-4 h-4" />;
      case 'Heart': return <Heart className="w-4 h-4" />;
      case 'Music': return <Music className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const filteredPrograms = TRAINING_PROGRAMS.filter((p) => {
    if (selectedProfileId !== 'alle') {
      return p.targetProfileId === selectedProfileId;
    }
    if (selectedCategory !== 'alle') {
      return p.category === selectedCategory;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full max-w-md mx-auto px-4 pt-2 pb-2 select-none overflow-hidden">
      {/* 1. Modusvelger (Alene, Sammen, Led en gruppe) */}
      <div className="flex p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl shrink-0 mb-2.5 shadow-sm">
        <button
          onClick={() => setTrainingMode('alene')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            trainingMode === 'alene'
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Alene
        </button>

        <button
          onClick={() => setTrainingMode('sammen')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            trainingMode === 'sammen'
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Sammen
        </button>

        <button
          onClick={() => setTrainingMode('led_gruppe')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            trainingMode === 'led_gruppe'
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Led gruppe
        </button>
      </div>

      {/* 2. Kontekstprofiler (Kontor, Barn, etc.) */}
      <div className="space-y-1.5 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Målgruppe & Profiler</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => {
              setSelectedProfileId('alle');
              setSelectedCategory('alle');
            }}
            className={`py-1 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              selectedProfileId === 'alle'
                ? 'bg-emerald-500 text-zinc-950'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Alle
          </button>
          {CONTEXT_PROFILES.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                setSelectedProfileId(profile.id);
                setSelectedCategory('alle');
              }}
              className={`py-1 px-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedProfileId === profile.id
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : profile.status === 'active'
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-zinc-950/60 border border-zinc-900 text-zinc-600 opacity-60'
              }`}
            >
              {getProfileIcon(profile.icon)}
              <span>{profile.name.split(' ')[0]}</span>
              {profile.status === 'planned' && (
                <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 rounded uppercase font-semibold">snart</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Programliste */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 mt-1 pb-4">
        {filteredPrograms.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-zinc-500">
            <Sparkles className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-xs">Ingen programmer matcher valgt filter.</p>
          </div>
        ) : (
          filteredPrograms.map((prog) => (
            <div
              key={prog.id}
              className="p-3.5 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl flex flex-col justify-between space-y-3 shadow-sm hover:border-zinc-700 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    {prog.category}
                  </span>
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono font-bold">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {prog.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-400">
                      <Zap className="w-3 h-3 text-amber-400" />
                      {prog.intensity}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-black text-white">{prog.name}</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{prog.description}</p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                <span className="text-[10px] text-zinc-400 font-medium">
                  {prog.workout.items.length} øvelser {prog.workout.rounds > 1 ? `(${prog.workout.rounds} runder)` : ''}
                </span>

                <button
                  onClick={() => onStartProgram(prog.workout)}
                  className="py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start økt
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
