import React, { useState, useEffect } from 'react';
import { EXERCISE_LIBRARY } from '../../data/exercises';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { ExerciseIllustration } from '../exercises/ExerciseIllustration';
import {
  CheckCircle2,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Filter,
  Eye,
  Send,
} from 'lucide-react';

interface FeedbackMap {
  [exerciseIdPhase: string]: {
    feedback: string;
    status: 'mangler' | 'generert' | 'godkjent' | 'regenerer';
    updatedAt: string;
  };
}

const STORAGE_KEY = 'mintrener_image_curator_feedback';

export const ExerciseImageCuratorView: React.FC = () => {
  const [exercises] = useState<ExerciseItem[]>(EXERCISE_LIBRARY);
  const [selectedCategory, setSelectedCategory] = useState<string>('alle');
  const [feedbackMap, setFeedbackMap] = useState<FeedbackMap>({});
  const [reordering, setReordering] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFeedbackMap(JSON.parse(raw));
    } catch {}
  }, []);

  const saveFeedback = (key: string, feedback: string, status: 'mangler' | 'generert' | 'godkjent' | 'regenerer') => {
    const updated: FeedbackMap = {
      ...feedbackMap,
      [key]: {
        feedback,
        status,
        updatedAt: new Date().toISOString(),
      },
    };
    setFeedbackMap(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleApprove = (exerciseId: string, phaseIndex: number) => {
    const key = `${exerciseId}-${phaseIndex}`;
    const current = feedbackMap[key]?.feedback || '';
    saveFeedback(key, current, 'godkjent');
    setSuccessMsg(`Fase ${phaseIndex + 1} for ${exerciseId} er godkjent!`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleRequestRegeneration = async (exercise: ExerciseItem, phaseIndex: number) => {
    const key = `${exercise.id}-${phaseIndex}`;
    const currentFeedback = feedbackMap[key]?.feedback || '';
    saveFeedback(key, currentFeedback, 'regenerer');
    setReordering(key);

    setSuccessMsg(`Bestilling registrert for ${exercise.navn.nb} (Fase ${phaseIndex + 1})`);
    setTimeout(() => {
      setReordering(null);
      setSuccessMsg(null);
    }, 2000);
  };

  const categories = ['alle', 'kroppsvekt', 'kettlebell', 'frivekt', 'mobilitet', 'kondisjon'];

  const filtered = selectedCategory === 'alle'
    ? exercises
    : exercises.filter((e) => e.kategori === selectedCategory);

  const approvedCount = Object.values(feedbackMap).filter((v) => v.status === 'godkjent').length;
  const totalPhases = exercises.length * 2;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 pt-2 pb-6 select-none overflow-hidden">
      {/* Topplinje */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" />
            Bildekurator & QA-Dashboard
          </h1>
          <p className="text-xs text-zinc-400">
            Kuratér, gi tilbakemelding og bestill regenerering fra Kitor
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-2xl text-xs">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white">{approvedCount} / {totalPhases}</span>
          <span className="text-[10px] text-zinc-400 uppercase">Godkjent</span>
        </div>
      </div>

      {/* Filterknapper */}
      <div className="flex gap-1.5 py-2.5 overflow-x-auto scrollbar-none shrink-0">
        <Filter className="w-4 h-4 text-zinc-500 my-auto ml-1 mr-0.5" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`py-1 px-3 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Melding */}
      {successMsg && (
        <div className="mb-2 p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-bold text-center animate-in fade-in shrink-0">
          {successMsg}
        </div>
      )}

      {/* Scrollbar Øvelsesliste for kuratering */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {filtered.map((exercise) => (
          <div
            key={exercise.id}
            className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-3xl space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/50 mr-2">
                  {exercise.kategori}
                </span>
                <span className="font-black text-white text-base">{exercise.navn.nb}</span>
                {exercise.navn.en && (
                  <span className="text-xs text-zinc-400 ml-1.5">({exercise.navn.en})</span>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">ID: {exercise.id}</span>
            </div>

            {/* De to fasene side ved side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((phaseIdx) => {
                const key = `${exercise.id}-${phaseIdx}`;
                const cur = feedbackMap[key];
                const isApproved = cur?.status === 'godkjent';
                const isRegenerating = reordering === key;

                return (
                  <div
                    key={phaseIdx}
                    className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                      isApproved
                        ? 'bg-emerald-950/20 border-emerald-800/50'
                        : 'bg-zinc-950/60 border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">
                        {phaseIdx === 0 ? 'Fase 1: Startposisjon' : 'Fase 2: Sluttposisjon'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                            : cur?.status === 'regenerer'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {isApproved ? '✅ Godkjent' : cur?.status === 'regenerer' ? '⏳ Bestilt' : 'Ubehandlet'}
                      </span>
                    </div>

                    {/* Bildevisning */}
                    <div className="w-full h-52 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                      <ExerciseIllustration
                        exercise={exercise}
                        phaseIndex={phaseIdx}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Tilbakemeldingsfelt */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-zinc-500" />
                        Hva må forbedres på dette bildet?
                      </label>
                      <textarea
                        rows={2}
                        value={cur?.feedback || ''}
                        onChange={(e) => saveFeedback(key, e.target.value, cur?.status || 'mangler')}
                        placeholder="f.eks. Vis hele kroppen inkludert føtter i profil, dypere knebøy..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>

                    {/* Handlingsknapper */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(exercise.id, phaseIdx)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          isApproved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 hover:bg-emerald-950/80 hover:text-emerald-300 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isApproved ? 'Godkjent' : 'Godkjenn'}
                      </button>

                      <button
                        onClick={() => handleRequestRegeneration(exercise, phaseIdx)}
                        disabled={isRegenerating}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-amber-950/80 hover:text-amber-300 text-zinc-300 border border-zinc-700 flex items-center justify-center gap-1 transition-all"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                        Bestill ny (Kitor)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
