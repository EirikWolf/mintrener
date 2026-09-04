import React, { useState, useRef } from 'react';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { Dumbbell, Maximize2, ExternalLink, X, Film, Image as ImageIcon } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ENABLE_EXERCISE_IMAGES } from '../../constants/featureFlags';

import { getApprovedExerciseImageUrl } from '../../services/exerciseContributionService';

interface ExerciseIllustrationProps {
  exercise: ExerciseItem;
  phaseIndex?: number;
  className?: string;
  enableZoom?: boolean;
}

export const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exercise,
  phaseIndex = 0,
  className = '',
  enableZoom = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [viewMode, setViewMode] = useState<'video' | 'image'>(() => (exercise.videoUrl ? 'video' : 'image'));
  const [isZoomed, setIsZoomed] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useFocusTrap(lightboxRef, { isActive: isZoomed, onClose: () => setIsZoomed(false) });

  if (!ENABLE_EXERCISE_IMAGES) {
    return null;
  }

  // Sjekk om det finnes et godkjent bilde fra brukerinnsending / admin
  const approvedCustomImage = getApprovedExerciseImageUrl(exercise.id, phaseIndex as 0 | 1);

  // Filstier (sjekker video, godkjent bilde eller generert bilde for øvelsen og fasen)
  const videoUrl = exercise.videoUrl || `/videos/exercises/${exercise.id}.mp4`;
  const imageUrl = approvedCustomImage || exercise.bildeUrl || `/images/exercises/${exercise.id}-${phaseIndex}.png?v=20260827_2`;
  const isVideoAvailable = !videoError && (Boolean(exercise.videoUrl) || viewMode === 'video');
  const isImageReady = !imageError;

  if (viewMode === 'video' && isVideoAvailable) {
    return (
      <>
        <div
          className={`relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center group ${className}`}
        >
          <video
            src={videoUrl}
            poster={imageUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={() => {
              setVideoError(true);
              setViewMode('image');
            }}
            className="w-full h-full object-contain max-h-72 drop-shadow-md"
          />

          <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-[10px] font-bold text-emerald-400 flex items-center gap-1 shadow-sm pointer-events-none">
            <Film className="w-3 h-3" />
            <span>Video ({exercise.bildeVinkel || 'side'})</span>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('image');
              }}
              title="Bytt til stillbilder"
              aria-label="Bytt til stillbilder"
              className="p-1.5 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 shadow-md transition-all text-xs flex items-center gap-1"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
            {enableZoom && (
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                title="Forstørr"
                aria-label="Forstørr"
                className="p-1.5 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 shadow-md transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Fullskjerm / Zoom modal (Lightbox) */}
        {isZoomed && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
            onClick={() => setIsZoomed(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`Forstørret video av ${exercise.navn.nb}`}
          >
            <div
              ref={lightboxRef}
              tabIndex={-1}
              className="relative max-w-2xl w-full max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col items-center gap-3 shadow-2xl overflow-hidden focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Topplinje */}
              <div className="w-full flex items-center justify-between border-b border-zinc-800 pb-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-emerald-400" />
                    <span>{exercise.navn.nb}</span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 capitalize">
                    {exercise.kategori} • {exercise.bildeVinkel || 'side'}vinkel
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsZoomed(false)}
                    title="Lukk forstørret visning (Esc)"
                    aria-label="Lukk forstørret visning"
                    className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Forstørret video */}
              <div className="w-full flex-1 min-h-[300px] max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/80 p-2">
                <video
                  src={videoUrl}
                  poster={imageUrl}
                  autoPlay
                  loop
                  muted
                  controls
                  playsInline
                  className="max-h-[65vh] w-auto object-contain rounded-xl drop-shadow-2xl select-auto"
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (isImageReady) {
    return (
      <>
        <div
          onClick={() => {
            if (enableZoom) setIsZoomed(true);
          }}
          className={`relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center group ${
            enableZoom ? 'cursor-zoom-in' : ''
          } ${className}`}
        >
          <img
            key={`${exercise.id}-${phaseIndex}`}
            src={imageUrl}
            alt={`${exercise.navn.nb} fase ${phaseIndex + 1}`}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain max-h-72 drop-shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />

          <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-[10px] font-bold text-zinc-300 shadow-sm pointer-events-none">
            {phaseIndex === 0 ? 'Fase 1: Start' : 'Fase 2: Slutt'} ({exercise.bildeVinkel || 'side'})
          </div>

          {enableZoom && (
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Fullskjerm / Zoom modal (Lightbox) */}
        {isZoomed && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
            onClick={() => setIsZoomed(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`Forstørret bilde av ${exercise.navn.nb}`}
          >
            <div
              className="relative max-w-2xl w-full max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col items-center gap-3 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Topplinje */}
              <div className="w-full flex items-center justify-between border-b border-zinc-800 pb-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>{exercise.navn.nb}</span>
                    <span className="text-xs text-zinc-400 font-normal">
                      ({phaseIndex === 0 ? 'Fase 1: Startposisjon' : 'Fase 2: Sluttposisjon'})
                    </span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 capitalize">
                    {exercise.kategori} • {exercise.bildeVinkel || 'side'}vinkel
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Åpne bilde i ny fane"
                    className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-all flex items-center gap-1 text-xs font-bold"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Ny fane</span>
                  </a>
                  <button
                    onClick={() => setIsZoomed(false)}
                    title="Lukk forstørret bilde (Esc)"
                    className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Forstørret bilde */}
              <div className="w-full flex-1 min-h-[300px] max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/80 p-2">
                <img
                  src={imageUrl}
                  alt={`${exercise.navn.nb} forstørret`}
                  className="max-h-[65vh] w-auto object-contain rounded-xl drop-shadow-2xl select-auto"
                />
              </div>

              <div className="w-full text-center">
                <p className="text-[11px] text-zinc-400">
                  Tips: Du kan også høyreklikke på bildet og velge <em>«Åpne bilde i ny fane»</em>.
                </p>
              </div>
            </div>
          </div>
        )}
      </>
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
    </div>
  );
};
