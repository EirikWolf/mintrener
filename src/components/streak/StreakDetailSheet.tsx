import React from 'react';
import { X, Flame } from 'lucide-react';
import type { WeekStreakResult } from '../../services/streakService';

interface StreakDetailSheetProps {
  streak: WeekStreakResult;
  onClose: () => void;
}

/**
 * Detaljark for uke-streaken (spec § 2.2): åpnes fra ukesmål-pillen.
 * Minimal dialog-skall i Task 6; fylles med serie/slinguke/milepæl/ukesmål
 * i Task 7.
 */
export const StreakDetailSheet: React.FC<StreakDetailSheetProps> = ({ streak, onClose }) => {
  void streak; // fylles ut i Task 7
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Din streak"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <h2 className="text-base font-black text-white">Din streak</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Lukk"
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
