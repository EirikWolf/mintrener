import React, { useState, useMemo, useEffect } from 'react';
import { EXERCISE_LIBRARY, filterExercises } from '../../data/exercises';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { CreateCustomExerciseModal } from './CreateCustomExerciseModal';
import { StrengthLoggerModal } from '../strength/StrengthLoggerModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchCustomExercises,
  deleteCustomExercise,
  CustomExerciseItem,
} from '../../services/customExercisesService';
import { fetchGlobalStats, GlobalTelemetryStats } from '../../services/telemetryService';
import { Search, Dumbbell, Sparkles, Plus, Trash2, Clock, Weight, Flame } from 'lucide-react';

const CATEGORIES = [
  { id: 'alle', label: 'Alle' },
  { id: 'populaere', label: '🔥 Populære' },
  { id: 'kroppsvekt', label: 'Kroppsvekt' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'frivekt', label: 'Frivekt' },
  { id: 'kondisjon', label: 'Kondisjon' },
  { id: 'mobilitet', label: 'Mobilitet' },
  { id: 'annet', label: 'Annet' },
  { id: 'egendefinert', label: 'Mine øvelser' },
];

interface ExerciseLibraryViewProps {
  onNavigateToTimer?: () => void;
}

export const ExerciseLibraryView: React.FC<ExerciseLibraryViewProps> = ({
  onNavigateToTimer,
}) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStrengthModalOpen, setIsStrengthModalOpen] = useState(false);
  const [customExercises, setCustomExercises] = useState<CustomExerciseItem[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalTelemetryStats | null>(null);

  const loadCustoms = () => {
    fetchCustomExercises(user?.uid).then((list) => {
      setCustomExercises(list);
    });
  };

  useEffect(() => {
    loadCustoms();
    fetchGlobalStats().then(setGlobalStats);
  }, [user]);

  const allExercises = useMemo(() => {
    return [...customExercises, ...EXERCISE_LIBRARY];
  }, [customExercises]);

  const popularityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (globalStats?.topExercises) {
      globalStats.topExercises.forEach((ex) => map.set(ex.exerciseId, ex.completedCount));
    }
    return map;
  }, [globalStats]);

  const filteredExercises = useMemo(() => {
    if (selectedCategory === 'egendefinert') {
      return customExercises.filter((e) =>
        e.navn.nb.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory === 'populaere') {
      return [...allExercises]
        .filter((e) => e.navn.nb.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => (popularityMap.get(b.id) || 0) - (popularityMap.get(a.id) || 0));
    }
    return filterExercises(allExercises, {
      kategori: selectedCategory,
      query: searchQuery,
    });
  }, [allExercises, customExercises, selectedCategory, searchQuery, popularityMap]);

  const handleDeleteCustom = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Vil du slette denne egendefinerte øvelsen?')) {
      await deleteCustomExercise(user?.uid, id);
      loadCustoms();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto px-4 pt-2 pb-2 select-none overflow-hidden">
      {/* 1. Header & Tittel + Ny øvelse knapp */}
      <div className="flex items-center justify-between pb-1 shrink-0">
        <div className="flex items-center gap-2">
          {onNavigateToTimer && (
            <button
              onClick={onNavigateToTimer}
              title="Tilbake til Timer / Forside"
              className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
            >
              <span className="text-xs font-bold text-emerald-400">← Timer</span>
            </button>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              <Dumbbell className="w-4.5 h-4.5 text-emerald-400" />
              Øvelser
            </h1>
            <p className="text-[10px] text-zinc-400">
              {allExercises.length} øvelser {customExercises.length > 0 ? `(${customExercises.length} egne)` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsStrengthModalOpen(true)}
            className="py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-cyan-400 font-bold text-xs rounded-xl flex items-center gap-1 transition-all border border-cyan-900/50 shadow-sm"
          >
            <Weight className="w-3.5 h-3.5" />
            <span>Styrkelogg</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Ny øvelse</span>
          </button>
        </div>
      </div>

      {/* 2. Søkefelt */}
      <div className="relative my-2 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Søk på øvelse, muskel..."
          className="w-full pl-9 pr-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
        />
      </div>

      {/* 3. Kategori Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`py-1 px-3 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80'
            }`}
          >
            {cat.label} {cat.id === 'egendefinert' && customExercises.length > 0 ? `(${customExercises.length})` : ''}
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
          filteredExercises.map((ex) => {
            const customItem = ex as CustomExerciseItem;
            const isCustom = Boolean(customItem.isCustom || customItem.id.startsWith('custom-'));

            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className={`p-3 border rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                  isCustom
                    ? 'bg-zinc-900/90 border-emerald-900/50 hover:border-emerald-500/70'
                    : 'bg-zinc-900/70 hover:bg-zinc-800/90 border-zinc-800/80'
                }`}
              >
                <div className="space-y-1 overflow-hidden pr-2 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isCustom ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-zinc-950">
                        Egendefinert
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                        {ex.kategori}
                      </span>
                    )}

                    {customItem.defaultDurationSeconds && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">
                        <Clock className="w-3 h-3" />
                        {Math.floor(customItem.defaultDurationSeconds / 60) > 0 ? `${Math.floor(customItem.defaultDurationSeconds / 60)}m ` : ''}
                        {customItem.defaultDurationSeconds % 60 > 0 || Math.floor(customItem.defaultDurationSeconds / 60) === 0 ? `${customItem.defaultDurationSeconds % 60}s` : ''}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-white truncate">{ex.navn.nb}</h3>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {ex.muskler.primær.join(', ')} • {ex.utstyr.join(', ')}
                  </p>
                </div>

                {isCustom && (
                  <button
                    onClick={(e) => handleDeleteCustom(e, ex.id)}
                    title="Slett egendefinert øvelse"
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all mr-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modaler */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}

      {isCreateModalOpen && (
        <CreateCustomExerciseModal
          onClose={() => setIsCreateModalOpen(false)}
          onSaved={() => loadCustoms()}
        />
      )}

      {isStrengthModalOpen && (
        <StrengthLoggerModal
          onClose={() => setIsStrengthModalOpen(false)}
        />
      )}
    </div>
  );
};
