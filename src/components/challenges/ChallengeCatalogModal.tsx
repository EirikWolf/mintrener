import React, { useState } from 'react';
import { STARTER_CHALLENGES } from '../../data/challenges';
import { ChallengeCategory, ChallengeItem } from '../../schemas/challengeSchema';
import { ChallengeDetailModal } from './ChallengeDetailModal';
import { getActiveChallengeId, getChallengeProgress } from '../../services/challengeService';
import { WorkoutTemplate } from '../../types/workout';
import { Trophy, X, ChevronRight } from 'lucide-react';

interface ChallengeCatalogModalProps {
  onClose: () => void;
  onStartWorkout: (workout: WorkoutTemplate, dayNumber: number) => void;
}

const CATEGORIES: Array<{ id: 'alle' | ChallengeCategory; label: string }> = [
  { id: 'alle', label: 'Alle' },
  { id: 'styrke', label: 'Styrke' },
  { id: 'kontor', label: 'Kontor' },
  { id: 'mobilitet', label: 'Mobilitet' },
  { id: 'kondisjon', label: 'Kondisjon' },
  { id: 'barn', label: 'Barn & Familie' },
];

export const ChallengeCatalogModal: React.FC<ChallengeCatalogModalProps> = ({
  onClose,
  onStartWorkout,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'alle' | ChallengeCategory>('alle');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(null);
  const activeChallengeId = getActiveChallengeId();

  const filtered = STARTER_CHALLENGES.filter((c) => {
    if (selectedCategory === 'alle') return true;
    return c.category === selectedCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Treningsutfordringer</h2>
              <p className="text-xs text-zinc-400">28 & 30 dagers programmer med faste hviledager</p>
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

        {/* Kategori-tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-zinc-950 font-black shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Utfordringsliste */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filtered.map((ch) => {
            const prog = getChallengeProgress(ch.id);
            const isActive = ch.id === activeChallengeId;
            const completedCount = prog.completedDays.length;
            const percent = Math.round((completedCount / ch.durationDays) * 100);

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChallenge(ch)}
                className={`w-full p-4 rounded-2xl border text-left transition-all space-y-2.5 ${
                  isActive
                    ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/30'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ch.badgeReward.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white">{ch.title}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-black uppercase">
                            Aktiv
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 capitalize font-medium">
                        {ch.durationDays} dager • {ch.category}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 mt-1" />
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {ch.description}
                </p>

                {completedCount > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Fullført {completedCount} av {ch.durationDays} dager</span>
                      <span className="font-bold text-emerald-400">{percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detaljmodal for valgt utfordring */}
      {selectedChallenge && (
        <ChallengeDetailModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          onStartWorkout={onStartWorkout}
        />
      )}
    </div>
  );
};
