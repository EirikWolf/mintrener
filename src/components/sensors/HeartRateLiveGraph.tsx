import React, { useState, useEffect } from 'react';
import { getHeartRateZone } from '../../services/heartRateZoneService';
import { Activity, Heart } from 'lucide-react';

interface HeartRateLiveGraphProps {
  currentBpm: number | null;
  maxHr?: number;
  isRestPhase?: boolean;
}

export const HeartRateLiveGraph: React.FC<HeartRateLiveGraphProps> = ({
  currentBpm,
  maxHr = 190,
  isRestPhase = false,
}) => {
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    if (currentBpm && currentBpm > 30) {
      setHistory((prev) => {
        const next = [...prev, currentBpm];
        if (next.length > 40) next.shift(); // Siste 40 datapunkter
        return next;
      });
    }
  }, [currentBpm]);

  if (!currentBpm || history.length < 2) {
    return null;
  }

  const zone = getHeartRateZone(currentBpm, maxHr);
  const minVal = Math.min(...history, 60);
  const maxVal = Math.max(...history, 180);
  const range = maxVal - minVal || 1;

  const width = 240;
  const height = 48;

  const points = history
    .map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="w-full max-w-sm p-3 bg-zinc-950/80 border border-zinc-850 rounded-2xl space-y-2 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-current animate-pulse" />
          <span className="text-sm font-black font-mono text-white">{currentBpm} <span className="text-[10px] text-zinc-400 font-sans font-bold">BPM</span></span>
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
            style={{ backgroundColor: `${zone.color}25`, color: zone.color, border: `1px solid ${zone.color}60` }}
          >
            {zone.label} ({zone.name.split(' / ')[0]})
          </span>
        </div>

        {isRestPhase && (
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            Restitusjon
          </span>
        )}
      </div>

      {/* SVG Graf */}
      <div className="w-full h-12 relative overflow-hidden rounded-lg bg-zinc-900/50 border border-zinc-800/40">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d">
          <defs>
            <linearGradient id="hrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={zone.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={zone.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Fylt flate */}
          <polygon points={areaPoints} fill="url(#hrGrad)" />
          {/* Kurvelinje */}
          <polyline
            fill="none"
            stroke={zone.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
};
