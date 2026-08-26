import React from 'react';
import { Timer, Dumbbell, Layers } from 'lucide-react';

export type AppTab = 'timer' | 'builder' | 'exercises';

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  isTimerRunning?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isTimerRunning,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-lg px-4 py-2 select-none">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* 1. Timer Fane */}
        <button
          onClick={() => onTabChange('timer')}
          aria-label="Gå til Timer"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'timer'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="relative">
            <Timer className="w-5 h-5" />
            {isTimerRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <span className="text-[10px] tracking-wider uppercase font-semibold">Timer</span>
        </button>

        {/* 2. Bygg økt Fane */}
        <button
          onClick={() => onTabChange('builder')}
          aria-label="Gå til Bygg økt"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'builder'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] tracking-wider uppercase font-semibold">Bygg økt</span>
        </button>

        {/* 3. Øvelser Fane */}
        <button
          onClick={() => onTabChange('exercises')}
          aria-label="Gå til Øvelser"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'exercises'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-[10px] tracking-wider uppercase font-semibold">Øvelser</span>
        </button>
      </div>
    </nav>
  );
};
