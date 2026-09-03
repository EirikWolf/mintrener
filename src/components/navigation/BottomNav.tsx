import React from 'react';
import { Timer, Dumbbell, History, CalendarDays, Ellipsis } from 'lucide-react';

export type AppTab = 'timer' | 'programs' | 'builder' | 'exercises' | 'history' | 'settings' | 'curator';

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
    <nav
      aria-label="Hovedmeny"
      className="shrink-0 w-full z-40 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-lg px-1 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+6px)] select-none"
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* 1. Forsiden. Het «Timer» etter komponenten som tegner den. */}
        <button
          onClick={() => onTabChange('timer')}
          aria-label="I dag"
          aria-current={activeTab === 'timer' ? 'page' : undefined}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'timer'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <div className="relative">
            <Timer className="w-4 h-4" />
            {isTimerRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <span className="text-[9px] tracking-wider uppercase font-semibold">I dag</span>
        </button>

        {/* 2. Programmer Fane */}
        <button
          onClick={() => onTabChange('programs')}
          aria-label="Programmer"
          // Byggeren har ingen egen fane lenger; den nås fra Program og hører
          // til der. Uten dette ville ingen fane vært markert mens man bygger.
          aria-current={activeTab === 'programs' || activeTab === 'builder' ? 'page' : undefined}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'programs' || activeTab === 'builder'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="text-[9px] tracking-wider uppercase font-semibold">Program</span>
        </button>

        {/* 4. Øvelser Fane */}
        <button
          onClick={() => onTabChange('exercises')}
          aria-label="Øvelser"
          aria-current={activeTab === 'exercises' ? 'page' : undefined}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'exercises'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span className="text-[9px] tracking-wider uppercase font-semibold">Øvelser</span>
        </button>

        {/* 5. Historikk Fane */}
        <button
          onClick={() => onTabChange('history')}
          aria-label="Historikk"
          aria-current={activeTab === 'history' ? 'page' : undefined}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'history'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[9px] tracking-wider uppercase font-semibold">Historikk</span>
        </button>

        {/* 6. Mer / Innstillinger Fane */}
        <button
          onClick={() => onTabChange('settings')}
          aria-label="Mer"
          aria-current={activeTab === 'settings' ? 'page' : undefined}
          className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'text-emerald-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
        >
          <Ellipsis className="w-4 h-4" />
          <span className="text-[9px] tracking-wider uppercase font-semibold">Mer</span>
        </button>
      </div>
    </nav>
  );
};
