import React from 'react';
import { Timer, Dumbbell, Layers, History, Sparkles } from 'lucide-react';

export type AppTab = 'timer' | 'programs' | 'builder' | 'exercises' | 'history' | 'curator';

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
    <nav className="shrink-0 w-full z-40 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-lg px-1.5 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] select-none">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* 1. Timer Fane */}
        <button
          onClick={() => onTabChange('timer')}
          aria-label="Gå til Timer"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'timer'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="relative">
            <Timer className="w-4 h-4" />
            {isTimerRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <span className="text-[9px] tracking-wider uppercase font-semibold">Timer</span>
        </button>

        {/* 2. Programmer Fane */}
        <button
          onClick={() => onTabChange('programs')}
          aria-label="Gå til Programmer"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'programs'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[9px] tracking-wider uppercase font-semibold">Programmer</span>
        </button>

        {/* 3. Bygg økt Fane */}
        <button
          onClick={() => onTabChange('builder')}
          aria-label="Gå til Bygg økt"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'builder'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px] tracking-wider uppercase font-semibold">Bygg økt</span>
        </button>

        {/* 4. Øvelser Fane */}
        <button
          onClick={() => onTabChange('exercises')}
          aria-label="Gå til Øvelser"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'exercises'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span className="text-[9px] tracking-wider uppercase font-semibold">Øvelser</span>
        </button>

        {/* 5. Historikk Fane */}
        <button
          onClick={() => onTabChange('history')}
          aria-label="Gå til Historikk"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            activeTab === 'history'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[9px] tracking-wider uppercase font-semibold">Historikk</span>
        </button>
      </div>
    </nav>
  );
};
