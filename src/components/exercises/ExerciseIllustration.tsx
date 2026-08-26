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

  // Filstier (sjekker først om det finnes generert bilde for øvelsen og fasen)
  const imageUrl = exercise.bildeUrl || `/images/exercises/${exercise.id}-${phaseIndex}.png`;
  const isImageReady = !imageError;

  if (isImageReady) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center ${className}`}>
        <img
          key={`${exercise.id}-${phaseIndex}`}
          src={imageUrl}
          alt={`${exercise.navn.nb} fase ${phaseIndex + 1}`}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain max-h-72 drop-shadow-md transition-all duration-300"
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-[10px] font-bold text-zinc-300 shadow-sm">
          {phaseIndex === 0 ? 'Fase 1: Start' : 'Fase 2: Slutt'} ({exercise.bildeVinkel || 'side'})
        </div>
      </div>
    );
  }

  // Fallback placeholder hvis bilde ikke finnes
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 flex flex-col items-center justify-center p-4 text-center select-none shadow-inner ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0,transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-md">
          <Dumbbell className="w-6 h-6" />
        </div>

        <div>
          <span className="text-xs font-bold text-zinc-200">
            Fase {phaseIndex + 1}: {phaseIndex === 0 ? 'Startposisjon' : 'Sluttposisjon'}
          </span>
          <p className="text-[10px] text-zinc-400 font-mono capitalize">
            {exercise.bildeVinkel ? `${exercise.bildeVinkel}vinkel` : 'Sidevinkel'}
          </p>
        </div>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800">
        <Eye className="w-3 h-3 text-emerald-400" />
        <span>Kitor Pipeline</span>
      </div>
    </div>
  );
};
