import React, { useState, useEffect } from 'react';
import { WorkoutTemplate, IntervalItem } from '../../types/workout';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import {
  calculateWorkoutDuration,
  applyUniformDurations,
  saveCustomWorkout,
  fetchCustomWorkouts,
  deleteCustomWorkout,
} from '../../services/customWorkoutsService';
import { ExercisePickerModal } from './ExercisePickerModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus,
  Play,
  Save,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Dumbbell,
  Zap,
} from 'lucide-react';

interface WorkoutBuilderViewProps {
  onStartCustomWorkout: (workout: WorkoutTemplate) => void;
}

export const WorkoutBuilderView: React.FC<WorkoutBuilderViewProps> = ({
  onStartCustomWorkout,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('Min egendefinerte økt');
  const [rounds, setRounds] = useState(1);
  const [prepareSeconds, setPrepareSeconds] = useState(10);
  const [items, setItems] = useState<IntervalItem[]>([
    {
      id: 'default-1',
      exercise: { id: 'kneboy', name: 'Knebøy' },
      workDurationSeconds: 30,
      restDurationSeconds: 15,
    },
    {
      id: 'default-2',
      exercise: { id: 'push-ups', name: 'Armhevinger (Push-ups)' },
      workDurationSeconds: 30,
      restDurationSeconds: 15,
    },
  ]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutTemplate[]>([]);
  const [isSavedToast, setIsSavedToast] = useState(false);

  useEffect(() => {
    fetchCustomWorkouts(user?.uid).then(setSavedWorkouts);
  }, [user]);

  // Nåværende økt-objekt
  const currentWorkout: WorkoutTemplate = {
    id: `custom-${Date.now()}`,
    name: name.trim() || 'Uten navn',
    description: `${items.length} øvelser, ${rounds} ${rounds === 1 ? 'runde' : 'runder'}`,
    type: 'custom',
    prepareDurationSeconds: prepareSeconds,
    rounds,
    roundRestDurationSeconds: 0,
    items,
  };

  const totalDurationSeconds = calculateWorkoutDuration(currentWorkout);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins} min ${secs.toString().padStart(2, '0')} sek`;
  };

  // Legg til ny øvelse
  const handleAddExercise = (exercise: ExerciseItem) => {
    const newItem: IntervalItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      exercise: {
        id: exercise.id,
        name: exercise.navn.nb,
        nameEn: exercise.navn.en,
        category: exercise.kategori as any,
      },
      workDurationSeconds: items.length > 0 ? items[items.length - 1].workDurationSeconds : 30,
      restDurationSeconds: items.length > 0 ? items[items.length - 1].restDurationSeconds : 15,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Fjern øvelse
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Flytt øvelse opp / ned
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setItems(newItems);
  };

  // Oppdater tider for én øvelse
  const handleUpdateDuration = (
    id: string,
    field: 'work' | 'rest',
    seconds: number
  ) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              workDurationSeconds: field === 'work' ? seconds : it.workDurationSeconds,
              restDurationSeconds: field === 'rest' ? seconds : it.restDurationSeconds,
            }
          : it
      )
    );
  };

  // «Bruk samme på alle» (Tabata / Intervall preset)
  const handleApplyPreset = (work: number, rest: number) => {
    setItems((prev) => applyUniformDurations(prev, work, rest));
  };

  // Lagre mal
  const handleSave = async () => {
    const workoutToSave: WorkoutTemplate = {
      ...currentWorkout,
      id: `custom-${Date.now()}`,
    };
    await saveCustomWorkout(workoutToSave, user?.uid);
    const updated = await fetchCustomWorkouts(user?.uid);
    setSavedWorkouts(updated);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  // Last inn lagret mal
  const handleLoadWorkout = (w: WorkoutTemplate) => {
    setName(w.name);
    setRounds(w.rounds);
    setPrepareSeconds(w.prepareDurationSeconds);
    setItems(w.items);
  };

  // Slett lagret mal
  const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteCustomWorkout(id, user?.uid);
    setSavedWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div className="flex flex-col h-full max-h-[100dvh] max-w-md mx-auto px-4 pt-2 pb-20 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 shrink-0">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            Bygg treningsøkt
          </h1>
          <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Beregnet totaltid: <strong className="text-emerald-300 font-bold">{formatTime(totalDurationSeconds)}</strong>
          </span>
        </div>

        {/* Start Nå Knapp */}
        <button
          onClick={() => onStartCustomWorkout(currentWorkout)}
          disabled={items.length === 0}
          className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-zinc-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          Start økt
        </button>
      </div>

      {/* Scrollbart Skjema */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 mt-1 pb-4">
        {/* 1. Navn & Runder */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 space-y-2.5 shadow-sm">
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Øktens navn
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-xs">
            <span className="font-semibold text-zinc-300">Antall runder:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRounds((r) => Math.max(1, r - 1))}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold flex items-center justify-center"
              >
                -
              </button>
              <span className="font-black text-white font-mono w-4 text-center">{rounds}</span>
              <button
                onClick={() => setRounds((r) => Math.min(20, r + 1))}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-xs">
            <span className="font-semibold text-zinc-300">Klargjøring før start:</span>
            <div className="flex gap-1">
              {[5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setPrepareSeconds(sec)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    prepareSeconds === sec
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Hurtigvalg («Bruk samme på alle») */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Sett intervalltid på alle øvelser:
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { work: 20, rest: 10, label: '20s / 10s' },
              { work: 30, rest: 15, label: '30s / 15s' },
              { work: 45, rest: 15, label: '45s / 15s' },
              { work: 40, rest: 20, label: '40s / 20s' },
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(p.work, p.rest)}
                className="py-1 px-1 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 rounded-xl text-[10px] font-bold text-zinc-300 transition-all text-center"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Øvelsesliste */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Øvelser i runden ({items.length})
            </span>
            <button
              onClick={() => setIsPickerOpen(true)}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Legg til øvelse
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-2.5 space-y-2 shadow-sm"
              >
                {/* Øvelsestittel og flytt/slett-knapper */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-white truncate">{item.exercise.name}</h4>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === items.length - 1}
                      className="p-1 rounded text-zinc-500 hover:text-white disabled:opacity-20"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 rounded text-rose-500/70 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tidsjustering per øvelse */}
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-zinc-800/50">
                  {/* Arbeidstid */}
                  <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-900/30 rounded-xl px-2 py-1">
                    <span className="text-emerald-400 font-bold">Arbeid:</span>
                    <div className="flex gap-1">
                      {[20, 30, 45].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => handleUpdateDuration(item.id, 'work', sec)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.workDurationSeconds === sec
                              ? 'bg-emerald-500 text-zinc-950'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pausetid */}
                  <div className="flex items-center justify-between bg-amber-950/20 border border-amber-900/30 rounded-xl px-2 py-1">
                    <span className="text-amber-400 font-bold">Pause:</span>
                    <div className="flex gap-1">
                      {[0, 10, 15].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => handleUpdateDuration(item.id, 'rest', sec)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.restDurationSeconds === sec
                              ? 'bg-amber-500 text-zinc-950'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legg til øvelse stor knapp */}
          <button
            onClick={() => setIsPickerOpen(true)}
            className="w-full py-2.5 border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-2xl text-xs font-bold text-zinc-400 hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Legg til flere øvelser
          </button>
        </div>

        {/* 4. Lagre mal knapp */}
        <button
          onClick={handleSave}
          disabled={items.length === 0}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Save className="w-4 h-4 text-emerald-400" />
          Lagre som egen mal
        </button>

        {isSavedToast && (
          <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs text-center font-bold animate-in fade-in">
            Økten er lagret!
          </div>
        )}

        {/* 5. Mine lagrede maler */}
        {savedWorkouts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Mine lagrede maler ({savedWorkouts.length})
            </span>
            <div className="space-y-1.5">
              {savedWorkouts.map((w) => (
                <div
                  key={w.id}
                  onClick={() => handleLoadWorkout(w)}
                  className="p-2.5 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="overflow-hidden pr-2">
                    <h4 className="text-xs font-bold text-white truncate">{w.name}</h4>
                    <p className="text-[10px] text-zinc-400">
                      {w.items.length} øvelser • {formatTime(calculateWorkoutDuration(w))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCustomWorkout(w);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSaved(w.id, e)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal for å plukke øvelser */}
      {isPickerOpen && (
        <ExercisePickerModal
          onSelect={handleAddExercise}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
};
