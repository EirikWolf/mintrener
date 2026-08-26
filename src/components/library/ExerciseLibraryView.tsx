import React, { useState, useMemo } from 'react';
import { EXERCISE_LIBRARY, filterExercises } from '../../data/exercises';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { Search, ChevronRight, Dumbbell, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { id: 'alle', label: 'Alle' },
  { id: 'kroppsvekt', label: 'Kroppsvekt' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'frivekt', label: 'Frivekt' },
  { id: 'kondisjon', label: 'Kondisjon' },
  { id: 'mobilitet', label: 'Mobilitet' },
];

export const ExerciseLibraryView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);

  const filteredExercises = useMemo(() => {
    return filterExercises(EXERCISE_LIBRARY, {
      kategori: selectedCategory,
      query: searchQuery,
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full max-h-[100dvh] max-w-md mx-auto px-4 pt-3 pb-20 select-none overflow-hidden">
      {/* 1. Header & Tittel */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            Øvelsesbibliotek
          </h1>
          <p className="text-[11px] text-zinc-400">
            {filteredExercises.length} av {EXERCISE_LIBRARY.length} øvelser
          </p>
        </div>
      </div>

      {/* 2. Søkefelt */}
      <div className="relative my-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Søk på øvelse, muskel..."
          className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
        />
      </div>

      {/* 3. Kategori Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. Scrollbar Øvelsesliste */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 mt-1 pb-4">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-zinc-500">
            <Sparkles className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-xs">Ingen øvelser matcher søket ditt.</p>
          </div>
        ) : (
          filteredExercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className="p-3 bg-zinc-900/70 hover:bg-zinc-800/90 active:scale-[0.99] border border-zinc-800/80 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-sm"
            >
              <div className="space-y-1 overflow-hidden pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                    {ex.kategori}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono capitalize">
                    {ex.utstyr.join(', ')}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white truncate">{ex.navn.nb}</h3>
                <p className="text-[10px] text-zinc-400 truncate">
                  {ex.muskler.primær.join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0 text-zinc-500">
                <span className="text-[10px] text-zinc-400 capitalize font-medium hidden xs:inline">
                  {ex.nivå}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detaljmodal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
};
