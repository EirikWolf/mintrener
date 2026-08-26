import React from 'react';

interface CircularProgressProps {
  progress: number; // 0 to 1
  remainingSeconds: number;
  phase: 'prepare' | 'work' | 'rest' | 'round_rest' | 'complete';
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  remainingSeconds,
  phase,
}) => {
  const radius = 42;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  // Inverter progress slik at ringen tømmes / fylles ned mot 0
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  // Farger basert på fase
  const getPhaseColors = () => {
    switch (phase) {
      case 'work':
        return {
          stroke: '#10b981', // Emerald 500
          track: 'rgba(16, 185, 129, 0.15)',
          glow: 'rgba(16, 185, 129, 0.45)',
          text: 'text-emerald-400',
        };
      case 'rest':
      case 'round_rest':
        return {
          stroke: '#f59e0b', // Amber 500
          track: 'rgba(245, 158, 11, 0.15)',
          glow: 'rgba(245, 158, 11, 0.45)',
          text: 'text-amber-400',
        };
      case 'prepare':
        return {
          stroke: '#3b82f6', // Blue 500
          track: 'rgba(59, 130, 246, 0.15)',
          glow: 'rgba(59, 130, 246, 0.45)',
          text: 'text-blue-400',
        };
      case 'complete':
        return {
          stroke: '#8b5cf6', // Violet 500
          track: 'rgba(139, 92, 246, 0.15)',
          glow: 'rgba(139, 92, 246, 0.45)',
          text: 'text-violet-400',
        };
      default:
        return {
          stroke: '#71717a',
          track: 'rgba(113, 113, 122, 0.15)',
          glow: 'transparent',
          text: 'text-zinc-300',
        };
    }
  };

  const colors = getPhaseColors();

  return (
    <div className="relative flex items-center justify-center w-full max-w-[200px] xs:max-w-[230px] sm:max-w-[270px] aspect-square mx-auto select-none">
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
        {/* Bakgrunnsspor */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Aktiv fremdriftslinje */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease',
            filter: `drop-shadow(0 0 6px ${colors.glow})`,
          }}
        />
      </svg>

      {/* Stor tallvisning i midten – lesbar på 1 meters avstand */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`font-mono text-6xl xs:text-7xl sm:text-8xl font-black tracking-tight ${colors.text} drop-shadow-md`}>
          {remainingSeconds}
        </span>
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-400 font-semibold mt-0.5">
          sekunder
        </span>
      </div>
    </div>
  );
};
