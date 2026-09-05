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
import { MuscleIcon } from '../icons/MuscleIcon';
import { EquipmentIcon } from '../icons/EquipmentIcon';
import { Search, Dumbbell, SearchX, Plus, Trash2, Weight } from 'lucide-react';

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isStrengthModalOpen, setIsStrengthModalOpen] = useState<boolean>(false);
  const [customExercises, setCustomExercises] = useState<CustomExerciseItem[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalTelemetryStats | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseItem | null>(null);

  const loadCustoms = () => {
    fetchCustomExercises(user?.uid).then(setCustomExercises);
  };

  useEffect(() => {
    loadCustoms();
    fetchGlobalStats().then(setGlobalStats);
  }, [user]);

  // Slå sammen offisielle øvelser og egendefinerte øvelser
  const allExercises = useMemo(() => {
    return [...customExercises, ...EXERCISE_LIBRARY];
  }, [customExercises]);

  // Popularitets-map for 'populaere'
  const popularityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (globalStats?.topExercises) {
      globalStats.topExercises.forEach((item) => {
        map.set(item.name.toLowerCase(), item.completedCount);
      });
    }
    return map;
  }, [globalStats]);

  // Filtrer listen
  const filtered = useMemo(() => {
    if (selectedCategory === 'egendefinert') {
      return customExercises.filter((e) =>
        e.navn.nb.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory === 'populaere') {
      return allExercises
        .filter((e) => e.navn.nb.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => (popularityMap.get(b.id) || 0) - (popularityMap.get(a.id) || 0));
    }
    return filterExercises(allExercises, {
      kategori: selectedCategory,
      query: searchQuery,
    });
  }, [allExercises, customExercises, selectedCategory, searchQuery, popularityMap]);

  const handleConfirmDelete = async () => {
    if (!exerciseToDelete) return;
    await deleteCustomExercise(user?.uid, exerciseToDelete.id);
    loadCustoms();
    setExerciseToDelete(null);
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto px-4 pt-2 pb-2 select-none overflow-hidden">
      {/* 1. Header & Tittel + Ny øvelse knapp */}
      <div className="flex items-center justify-between pb-1 shrink-0">
        <div className="flex items-center gap-2">
          {onNavigateToTimer && (
            <button
              onClick={onNavigateToTimer}
              title="Tilbake til I dag / Forside"
              aria-label="Tilbake til I dag"
              className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
            >
              <span className="text-xs font-bold text-emerald-400">← I dag</span>
            </button>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              <Dumbbell className="w-4.5 h-4.5 text-emerald-400" />
              Øvelser
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsStrengthModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <Weight className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Styrkelogg</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Ny</span>
          </button>
        </div>
      </div>

      {/* 2. Søkefelt */}
      <div className="relative my-2 shrink-0">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Søk etter øvelse eller muskel"
          placeholder="Søk på øvelse, muskel..."
          className="w-full pl-9 pr-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* 3. Kategori Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. Øvelsesliste */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 mt-1 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-zinc-400">
            <SearchX className="w-8 h-8 mx-auto text-zinc-500" />
            <p className="text-sm font-semibold">Ingen øvelser matcher søket.</p>
          </div>
        ) : (
          filtered.map((ex) => {
            const isCustom = Boolean((ex as CustomExerciseItem).isCustom || ex.id.startsWith('custom-'));
            return (
              // Raden er en ekte <button> (WCAG 2.1.1, nivå A). Slettekontrollen
              // ligger som søsken, ikke nestet — nestede knapper er ugyldig HTML
              // og gir uforutsigbar fokusrekkefølge.
              <div
                key={ex.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all flex items-center justify-between gap-2 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setSelectedExercise(ex)}
                  aria-label={`Åpne øvelsen ${ex.navn.nb}`}
                  className="p-3 flex items-center gap-2 flex-1 text-left cursor-pointer active:scale-[0.99] transition-transform min-w-0"
                >
                <div className="space-y-0.5 overflow-hidden flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      {ex.kategori}
                    </span>
                    {isCustom && (
                      <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/40">
                        Egendefinert
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-white truncate">{ex.navn.nb}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate">
                    <span className="flex items-center gap-1">
                      <MuscleIcon name={ex.muskler.primær[0] || 'kjerne'} className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{ex.muskler.primær.join(', ')}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 capitalize">
                      <EquipmentIcon name={ex.utstyr[0] || 'egenvekt'} className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{ex.utstyr.join(', ')}</span>
                    </span>
                  </div>
                </div>

                </button>

                {isCustom && (
                  <button
                    type="button"
                    onClick={() => setExerciseToDelete(ex)}
                    aria-label={`Slett ${ex.navn.nb}`}
                    title="Slett egendefinert øvelse"
                    className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all mr-1 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal for å bekrefte sletting */}
      {exerciseToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-exercise-title"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-700 p-5 rounded-2xl max-w-xs w-full space-y-4 shadow-xl text-center">
            <h3 id="delete-exercise-title" className="text-sm font-bold text-white">
              Slette øvelse?
            </h3>
            <p className="text-xs text-zinc-400">
              Er du sikker på at du vil slette <strong className="text-zinc-200">«{exerciseToDelete.navn.nb}»</strong>?
            </p>
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setExerciseToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
              >
                Avbryt
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-sm"
              >
                Ja, slett
              </button>
            </div>
          </div>
        </div>
      )}

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
