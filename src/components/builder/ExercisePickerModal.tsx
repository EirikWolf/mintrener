import React, { useState, useMemo } from 'react';
import { EXERCISE_LIBRARY, filterExercises } from '../../data/exercises';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { Search, X, Plus, Dumbbell } from 'lucide-react';

interface ExercisePickerModalProps {
  onSelect: (exercise: ExerciseItem) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'alle', label: 'Alle' },
  { id: 'kroppsvekt', label: 'Kroppsvekt' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'frivekt', label: 'Frivekt' },
  { id: 'kondisjon', label: 'Kondisjon' },
  { id: 'mobilitet', label: 'Mobilitet' },
];

export const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  onSelect,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredExercises = useMemo(() => {
    return filterExercises(EXERCISE_LIBRARY, {
      kategori: selectedCategory,
      query: searchQuery,
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-black text-white">Velg øvelse</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk modal"
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Søkefelt */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk i biblioteket..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Kategori chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`py-1 px-2.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Liste med øvelser */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 mt-1">
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => {
                onSelect(ex);
                onClose();
              }}
              className="p-2.5 bg-zinc-950/60 hover:bg-zinc-800 active:scale-[0.99] border border-zinc-800/80 rounded-xl flex items-center justify-between cursor-pointer transition-all"
            >
              <div className="overflow-hidden pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-950 text-emerald-400">
                    {ex.kategori}
                  </span>
                  <span className="text-[10px] text-zinc-400 capitalize">{ex.utstyr.join(', ')}</span>
                </div>
                <h4 className="text-xs font-bold text-white truncate mt-0.5">{ex.navn.nb}</h4>
              </div>

              <button
                aria-label={`Legg til ${ex.navn.nb}`}
                className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
