import React, { useState, useEffect } from 'react';
import { BadgeItem, getAllUserBadges } from '../../services/badgeService';
import { CompletedWorkoutLog } from '../../types/models';
import { ShareCardModal } from '../social/ShareCardModal';
import { Trophy, X, Lock, CheckCircle2, Share2, Sparkles } from 'lucide-react';

interface BadgeShowcaseModalProps {
  history?: CompletedWorkoutLog[];
  onClose: () => void;
}

export const BadgeShowcaseModal: React.FC<BadgeShowcaseModalProps> = ({
  history,
  onClose,
}) => {
  const [badges, setBadges] = useState<BadgeItem[]>(() => getAllUserBadges(history));
  const [filter, setFilter] = useState<'alle' | 'opplåst' | 'låst'>('alle');
  const [selectedBadgeToShare, setSelectedBadgeToShare] = useState<BadgeItem | null>(null);

  useEffect(() => {
    setBadges(getAllUserBadges(history));
  }, [history]);

  // WCAG: Lukk ved Escape-tast
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalCount = badges.length;
  const percentage = Math.round((unlockedCount / totalCount) * 100);

  const filteredBadges = badges.filter((b) => {
    if (filter === 'opplåst') return b.isUnlocked;
    if (filter === 'låst') return !b.isUnlocked;
    return true;
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-showcase-title"
        className="w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden text-white space-y-4"
      >
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 id="badge-showcase-title" className="text-lg sm:text-xl font-black text-white">
                Trofé- og Merkeskap
              </h2>
              <p className="text-xs text-zinc-400">
                Dine oppnådde merker og fremtidige milepæler
              </p>
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

        {/* 2. Samlet Status & Fremdriftslinje */}
        <div className="p-3.5 bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">
                Opplåst: <strong className="text-amber-400">{unlockedCount}</strong> av <strong>{totalCount}</strong> merker
              </span>
            </div>
            <span className="text-xs font-black font-mono text-amber-400">{percentage}%</span>
          </div>

          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* 3. Filter-knapper */}
        <div className="grid grid-cols-3 p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl shrink-0 text-xs font-bold shadow-sm">
          <button
            onClick={() => setFilter('alle')}
            className={`py-1.5 rounded-xl transition-all ${
              filter === 'alle' ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Alle ({totalCount})
          </button>
          <button
            onClick={() => setFilter('opplåst')}
            className={`py-1.5 rounded-xl transition-all ${
              filter === 'opplåst' ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Opplåste ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter('låst')}
            className={`py-1.5 rounded-xl transition-all ${
              filter === 'låst' ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Låste ({totalCount - unlockedCount})
          </button>
        </div>

        {/* 4. Merkeliste */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 pb-2">
          {filteredBadges.map((badge) => {
            const isDone = badge.isUnlocked;
            const pct = Math.round((badge.progress / badge.maxProgress) * 100);

            return (
              <div
                key={badge.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                  isDone
                    ? 'bg-amber-950/25 border-amber-500/60 shadow-sm ring-1 ring-amber-500/20'
                    : 'bg-zinc-900/70 border-zinc-800 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner border ${
                        isDone
                          ? 'bg-amber-500/20 border-amber-500/40 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 grayscale'
                      }`}
                    >
                      {badge.icon}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white">{badge.title}</h3>
                        {isDone ? (
                          <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-amber-500 text-zinc-950 rounded flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Fullført
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            Låst
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{badge.description}</p>
                    </div>
                  </div>

                  {isDone && (
                    <button
                      onClick={() => setSelectedBadgeToShare(badge)}
                      title="Del ditt oppnådde merke"
                      aria-label={`Del merke ${badge.title}`}
                      className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition-all shrink-0 active:scale-95 border border-amber-500/30"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Fremdriftslinje for merke */}
                <div className="space-y-1 pt-1 border-t border-zinc-850/80">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>{badge.progressLabel || `${badge.progress}/${badge.maxProgress}`}</span>
                    <span className={isDone ? 'font-bold text-amber-400' : 'text-zinc-500'}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone ? 'bg-amber-400' : 'bg-zinc-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delingsmodal for merke */}
      {selectedBadgeToShare && (
        <ShareCardModal
          cardData={{
            type: 'challenge',
            title: selectedBadgeToShare.title,
            subtitle: selectedBadgeToShare.description,
            statMain: selectedBadgeToShare.progressLabel || `${selectedBadgeToShare.progress}/${selectedBadgeToShare.maxProgress}`,
            statLabel: 'Fullført',
            badgeIcon: selectedBadgeToShare.icon,
            badgeName: selectedBadgeToShare.title,
            accentColor: '#f59e0b',
          }}
          onClose={() => setSelectedBadgeToShare(null)}
        />
      )}
    </div>
  );
};
