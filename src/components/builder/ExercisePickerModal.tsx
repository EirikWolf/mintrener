import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EXERCISE_LIBRARY, filterExercises } from '../../data/exercises';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchCustomExercises,
  CustomExerciseItem,
} from '../../services/customExercisesService';
import { Search, X, Plus, Dumbbell, Clock } from 'lucide-react';

interface ExercisePickerModalProps {
  onSelect: (exercise: ExerciseItem & { defaultDurationSeconds?: number }) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'alle', label: 'Alle' },
  { id: 'kroppsvekt', label: 'Kroppsvekt' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'frivekt', label: 'Frivekt' },
  { id: 'kondisjon', label: 'Kondisjon' },
  { id: 'mobilitet', label: 'Mobilitet' },
  { id: 'annet', label: 'Annet' },
  { id: 'egendefinert', label: 'Mine øvelser' },
];

export const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  onSelect,
  onClose,
}) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customExercises, setCustomExercises] = useState<CustomExerciseItem[]>([]);

  useEffect(() => {
    fetchCustomExercises(user?.uid).then(setCustomExercises);
  }, [user]);

  const allExercises = useMemo(() => {
    return [...customExercises, ...EXERCISE_LIBRARY];
  }, [customExercises]);

  const filteredExercises = useMemo(() => {
    if (selectedCategory === 'egendefinert') {
      return customExercises.filter((e) =>
        e.navn.nb.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filterExercises(allExercises, {
      kategori: selectedCategory,
      query: searchQuery,
    });
  }, [allExercises, customExercises, selectedCategory, searchQuery]);

  // WCAG: Lukk ved trykk på Escape-tast
  useEffect(() => {
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-modal-title"
        className="w-full max-w-md max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden space-y-3 relative z-[101]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 id="picker-modal-title" className="text-base font-black text-white">Legg til øvelse</h2>
            </div>
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
            placeholder="Søk i biblioteket og mine øvelser..."
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
              {cat.label} {cat.id === 'egendefinert' && customExercises.length > 0 ? `(${customExercises.length})` : ''}
            </button>
          ))}
        </div>

        {/* Liste med øvelser */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 mt-1">
          {filteredExercises.map((ex) => {
            const customItem = ex as CustomExerciseItem;
            const isCustom = Boolean(customItem.isCustom || customItem.id.startsWith('custom-'));

            return (
              <div
                key={ex.id}
                onClick={() => {
                  onSelect(ex);
                  onClose();
                }}
                className={`p-2.5 bg-zinc-950/60 hover:bg-zinc-800 active:scale-[0.99] border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                  isCustom ? 'border-emerald-800/60 bg-zinc-950/90' : 'border-zinc-800/80'
                }`}
              >
                <div className="overflow-hidden pr-2">
                  <div className="flex items-center gap-1.5">
                    {isCustom ? (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500 text-zinc-950">
                        Egendefinert
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-950 text-emerald-400">
                        {ex.kategori}
                      </span>
                    )}

                    {customItem.defaultDurationSeconds && (
                      <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-900/40">
                        <Clock className="w-2.5 h-2.5" />
                        {Math.floor(customItem.defaultDurationSeconds / 60) > 0 ? `${Math.floor(customItem.defaultDurationSeconds / 60)}m ` : ''}
                        {customItem.defaultDurationSeconds % 60 > 0 || Math.floor(customItem.defaultDurationSeconds / 60) === 0 ? `${customItem.defaultDurationSeconds % 60}s` : ''}
                      </span>
                    )}
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
            );
          })}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
};
