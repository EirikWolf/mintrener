import React, { useState } from 'react';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { Dumbbell, Eye } from 'lucide-react';

interface ExerciseIllustrationProps {
  exercise: ExerciseItem;
  phaseIndex?: number;
  className?: string;
}

export const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exercise,
  phaseIndex = 0,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Forventet filsti til generert bilde
  const imageUrl = exercise.bildeUrl || `/images/exercises/${exercise.id}-${phaseIndex}.webp`;
  const isImageReady = exercise.bildeStatus === 'godkjent' && !imageError;

  if (isImageReady) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 ${className}`}>
        <img
          src={imageUrl}
          alt={`${exercise.navn.nb} fase ${phaseIndex + 1}`}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-[10px] font-bold text-zinc-300">
          Fase {phaseIndex + 1} ({exercise.bildeVinkel || 'side'})
        </div>
      </div>
    );
  }

  // Minimalistisk, stilig SVG-placeholder i henhold til designstil (mørk bakgrunn, smaragd/cyan aksenter)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 flex flex-col items-center justify-center p-4 text-center select-none shadow-inner ${className}`}
    >
      {/* Bakgrunnsmønster */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0,transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-md">
          <Dumbbell className="w-6 h-6" />
        </div>

        <div>
          <span className="text-xs font-bold text-zinc-200">
            Fase {phaseIndex + 1}
          </span>
          <p className="text-[10px] text-zinc-400 font-mono capitalize">
            {exercise.bildeVinkel ? `${exercise.bildeVinkel}vinkel` : 'Sidevinkel'}
          </p>
        </div>

        {exercise.bildePrompt && exercise.bildePrompt[phaseIndex.toString()] && (
          <p className="text-[10px] text-zinc-400 italic line-clamp-1 max-w-[180px]">
            «{exercise.bildePrompt[phaseIndex.toString()]}»
          </p>
        )}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800">
        <Eye className="w-3 h-3 text-emerald-400" />
        <span>Kitor Pipeline</span>
      </div>
    </div>
  );
};
