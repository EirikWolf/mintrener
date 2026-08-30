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
  // transisjonen for reset-framen. isResetFrame må ligge i EGEN state (ikke som en
  // plain const utledet av prevProgress før den oppdateres) – ellers forkaster React
  // det pågående rendersteget når setPrevProgress kalles under render og re-kjører
  // med prevProgress allerede lik clampedProgress, slik at en plain
  // `clampedProgress < prevProgress`-const alltid ville lest false i committed
  // resultat (funksjonell no-op, oppdaget ved DOM-probe i code review). Merk: IKKE
  // bytt til en useRef-mutasjon her – det bryter under StrictMode sin doble
  // dev-rendring. At flagget blir stående sant gjennom nyfasens gatede første
  // sekund er ufarlig (offset er uendret helt til neste gatede commit uansett, som
  // slår flagget tilbake til false i samme committed pass).
  const [prevProgress, setPrevProgress] = useState(clampedProgress);
  const [isResetFrame, setIsResetFrame] = useState(false);
  if (clampedProgress !== prevProgress) {
    setIsResetFrame(clampedProgress < prevProgress);
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
    <div className="relative flex items-center justify-center w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[360px] md:max-w-[400px] h-[28vh] max-h-[360px] landscape:max-h-[46vh] landscape:max-w-[46vh] aspect-square mx-auto select-none">
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

      {/* Stor tallvisning i midten – skalerer med viewport (minst 20-25% vh) for lesbarhet på 1-2 meters avstand. 3-sifrede tall (f.eks. 120s, 300s) justeres proporsjonalt for å passe trygt inne i sirkelen */}
      <div
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={`${remainingSeconds} sekunder igjen`}
        className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4"
      >
        <span
          className={`font-mono tabular-nums font-black tracking-tight ${colors.text} drop-shadow-lg leading-none ${
            remainingSeconds >= 100
              ? 'text-[clamp(3.5rem,15vh,7.5rem)]'
              : 'text-[clamp(4.5rem,22vh,10.5rem)]'
          }`}
        >
          {remainingSeconds}
        </span>
        <span className="text-[10px] xs:text-xs uppercase tracking-widest text-zinc-400 font-bold mt-0.5">
          sekunder
        </span>
      </div>
    </div>
  );
};
