import React, { useState } from 'react';

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
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // A3-oppfølging: nedtellingens progress hopper brått tilbake mot 0 ved hvert
  // faseskifte (ny fase starter på 0% fremdrift). Med en generell 1s-transisjon på
  // stroke-dashoffset ville dette animert som en synlig BAKOVER-sveip av ringen –
  // ca. 16 slike "spol tilbake til null"-sveip gjennom en Tabata-økt. Vi detekterer
  // reset-framen ved å sammenligne med forrige renders progress (dokumentert
  // React-mønster for "lagre info fra forrige render": oppdater state under selve
  // rendringen, ikke i en effect – unngår en synlig ekstra frame) og slår av
  // transisjonen KUN for den ene framen. Fremover-bevegelse innad i en fase beholder
  // den jevne 1s-transisjonen.
  const [prevProgress, setPrevProgress] = useState(clampedProgress);
  const isResetFrame = clampedProgress < prevProgress;
  if (clampedProgress !== prevProgress) {
    setPrevProgress(clampedProgress);
  }

  // Inverter progress slik at ringen tømmes / fylles ned mot 0
  const strokeDashoffset = circumference * (1 - clampedProgress);

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
    <div className="relative flex items-center justify-center w-full max-w-[240px] xs:max-w-[270px] sm:max-w-[320px] aspect-square mx-auto select-none">
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
            // Oppgave A3: React-state for phaseRemaining oppdateres nå kun ~1x/sekund
            // (rendring gates på Math.ceil-endring, se useIntervalTimer sin tick()),
            // så ringen ville "hakket" ett hakk i sekundet uten denne. 1s lineær
            // transisjon bygger bro mellom de sjeldnere render-hoppene slik at ringen
            // fortsatt oppleves som en jevnt tømmende/fyllende sirkel, ikke en klokke
            // som hopper – unntatt på reset-framen ved faseskifte, se isResetFrame
            // over. index.css RESPEKTERER prefers-reduced-motion globalt (nuller
            // transition-duration), som gjør ringen til en steppende (ikke-animert)
            // indikator for brukere som har skrudd av bevegelseseffekter.
            transition: isResetFrame ? 'stroke 0.3s ease' : 'stroke-dashoffset 1s linear, stroke 0.3s ease',
            filter: `drop-shadow(0 0 8px ${colors.glow})`,
          }}
        />
      </svg>

      {/* Stor tallvisning i midten – lesbar på 1-2 meters avstand */}
      <div
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`${remainingSeconds} sekunder igjen`}
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        <span className={`font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-tight ${colors.text} drop-shadow-lg`}>
          {remainingSeconds}
        </span>
        <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold mt-1">
          sekunder
        </span>
      </div>
    </div>
  );
};
