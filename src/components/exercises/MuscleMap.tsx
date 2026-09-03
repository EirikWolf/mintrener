import React from 'react';
import { MuskelGruppe, muskelgrupperFor } from '../../data/muskler';

/**
 * Muskelkart — hvilke muskler øvelsen aktiverer.
 *
 * ÉN figur som serverer alle 75 øvelsene, ikke 75 filer. Den drives av
 * `muskler`-feltet gjennom det kontrollerte ordforrådet (Beslutning 50), så en
 * ny øvelse får kartet gratis så snart musklene er ført.
 *
 * Dette er også argumentet som avgjorde Beslutning 49: et fotografi kan ikke
 * vise hvilke muskler som jobber. Med det kravet er ikke foto og illustrasjon
 * likeverdige lenger.
 *
 * TEGNINGEN er bevisst stilisert. Målet er at regionen skal være gjenkjennelig
 * ved 120 px bredde i en modal, ikke at figuren skal være anatomisk korrekt.
 * En detaljert muskelplansje leser som grøt i den størrelsen.
 */

/** Avrundet boks som path — alle regioner er paths, så tegningen er ensartet. */
const boks = (x: number, y: number, b: number, h: number, r = 3): string => {
  const rr = Math.min(r, b / 2, h / 2);
  return (
    `M${x + rr},${y} h${b - 2 * rr} a${rr},${rr} 0 0 1 ${rr},${rr} v${h - 2 * rr}` +
    ` a${rr},${rr} 0 0 1 ${-rr},${rr} h${-(b - 2 * rr)} a${rr},${rr} 0 0 1 ${-rr},${-rr}` +
    ` v${-(h - 2 * rr)} a${rr},${rr} 0 0 1 ${rr},${-rr} z`
  );
};

/** Ellipse som path. */
const oval = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${cx - rx},${cy} a${rx},${ry} 0 1 0 ${2 * rx},0 a${rx},${ry} 0 1 0 ${-2 * rx},0 z`;

export interface Muskelregion {
  gruppe: MuskelGruppe;
  side: 'front' | 'bak';
  d: string;
}

/**
 * Regionene på figuren.
 *
 * Hver av de 18 gruppene i ordforrådet må finnes her — en gruppe uten region
 * ville betydd at en øvelse lyste opp ingenting uten at noe sa fra. Noen
 * grupper opptrer på begge sider (skuldre, underarmer, legger, nakke), fordi de
 * er synlige forfra og bakfra.
 */
export const MUSKELREGIONER: Muskelregion[] = [
  // ---------- FORSIDE ----------
  { gruppe: 'nakke', side: 'front', d: boks(43, 27, 14, 8, 3) },
  { gruppe: 'skuldre', side: 'front', d: oval(29, 43, 9, 7) },
  { gruppe: 'skuldre', side: 'front', d: oval(71, 43, 9, 7) },
  { gruppe: 'bryst', side: 'front', d: boks(38, 38, 10, 15, 4) },
  { gruppe: 'bryst', side: 'front', d: boks(52, 38, 10, 15, 4) },
  { gruppe: 'pustemuskulatur', side: 'front', d: boks(40, 55, 20, 7, 3) },
  { gruppe: 'biceps', side: 'front', d: boks(23, 50, 9, 22, 4) },
  { gruppe: 'biceps', side: 'front', d: boks(68, 50, 9, 22, 4) },
  { gruppe: 'underarmer', side: 'front', d: boks(23, 74, 9, 22, 4) },
  { gruppe: 'underarmer', side: 'front', d: boks(68, 74, 9, 22, 4) },
  { gruppe: 'kjerne', side: 'front', d: boks(43, 64, 14, 24, 3) },
  { gruppe: 'skrå magemuskler', side: 'front', d: boks(37, 66, 6, 20, 3) },
  { gruppe: 'skrå magemuskler', side: 'front', d: boks(57, 66, 6, 20, 3) },
  { gruppe: 'hoftebøyere', side: 'front', d: boks(39, 90, 22, 8, 3) },
  { gruppe: 'forside lår', side: 'front', d: boks(35, 100, 12, 34, 5) },
  { gruppe: 'forside lår', side: 'front', d: boks(53, 100, 12, 34, 5) },
  { gruppe: 'adduktorer', side: 'front', d: boks(47, 100, 6, 26, 3) },
  { gruppe: 'legger', side: 'front', d: boks(36, 142, 10, 30, 4) },
  { gruppe: 'legger', side: 'front', d: boks(54, 142, 10, 30, 4) },

  // ---------- BAKSIDE ----------
  { gruppe: 'nakke', side: 'bak', d: boks(43, 27, 14, 8, 3) },
  { gruppe: 'skuldre', side: 'bak', d: oval(29, 43, 9, 7) },
  { gruppe: 'skuldre', side: 'bak', d: oval(71, 43, 9, 7) },
  { gruppe: 'øvre rygg', side: 'bak', d: boks(39, 38, 22, 16, 4) },
  { gruppe: 'latissimus', side: 'bak', d: boks(36, 55, 12, 20, 4) },
  { gruppe: 'latissimus', side: 'bak', d: boks(52, 55, 12, 20, 4) },
  { gruppe: 'triceps', side: 'bak', d: boks(23, 50, 9, 22, 4) },
  { gruppe: 'triceps', side: 'bak', d: boks(68, 50, 9, 22, 4) },
  { gruppe: 'underarmer', side: 'bak', d: boks(23, 74, 9, 22, 4) },
  { gruppe: 'underarmer', side: 'bak', d: boks(68, 74, 9, 22, 4) },
  { gruppe: 'korsrygg', side: 'bak', d: boks(41, 77, 18, 11, 3) },
  { gruppe: 'sete', side: 'bak', d: boks(37, 90, 12, 16, 5) },
  { gruppe: 'sete', side: 'bak', d: boks(51, 90, 12, 16, 5) },
  { gruppe: 'bakside lår', side: 'bak', d: boks(35, 108, 12, 28, 5) },
  { gruppe: 'bakside lår', side: 'bak', d: boks(53, 108, 12, 28, 5) },
  { gruppe: 'legger', side: 'bak', d: boks(36, 142, 10, 30, 4) },
  { gruppe: 'legger', side: 'bak', d: boks(54, 142, 10, 30, 4) },
];

/** Kroppssilhuetten under regionene, så figuren leses selv når ingenting lyser. */
const SILHUETT = [
  oval(50, 17, 11, 13), // hode
  boks(43, 27, 14, 10, 3), // hals
  // Overkroppen smalner mot midjen og vider seg mot hoftene. Første utkast var
  // et rektangel, og figuren leste som en kloss.
  'M34,36 L66,36 L63,74 L67,94 L33,94 L37,74 Z',
  // Armene lå 3 enheter fra kroppen og hang løst i lufta. De henger nå inntil.
  boks(22, 40, 11, 58, 5),
  boks(67, 40, 11, 58, 5),
  boks(34, 90, 14, 84, 7), // venstre bein
  boks(52, 90, 14, 84, 7), // høyre bein
].join(' ');

type Nivå = 'primær' | 'sekundær' | 'hvilende';

interface MuscleMapProps {
  muskler: { primær: string[]; sekundær?: string[] };
  className?: string;
  /** Norske navn til skjermleseren. Kartet alene er ikke informasjon. */
  visTekst?: boolean;
}

const FYLL: Record<Nivå, string> = {
  primær: 'fill-emerald-400',
  sekundær: 'fill-emerald-400/35',
  // Hvilende muskler tegnes ikke bort — de viser hva som IKKE jobber, og det er
  // halve informasjonen i et muskelkart.
  hvilende: 'fill-zinc-800',
};

const Figur: React.FC<{ side: 'front' | 'bak'; nivåFor: (g: MuskelGruppe) => Nivå }> = ({
  side,
  nivåFor,
}) => (
  <g>
    <path d={SILHUETT} className="fill-zinc-900" />
    {MUSKELREGIONER.filter((r) => r.side === side).map((r, i) => {
      const nivå = nivåFor(r.gruppe);
      return (
        <path
          key={`${r.gruppe}-${i}`}
          d={r.d}
          data-gruppe={r.gruppe}
          data-niva={nivå}
          className={FYLL[nivå]}
        />
      );
    })}
  </g>
);

export const MuscleMap: React.FC<MuscleMapProps> = ({
  muskler,
  className = '',
  visTekst = false,
}) => {
  const { primær, sekundær } = muskelgrupperFor(muskler);

  const nivåFor = (g: MuskelGruppe): Nivå =>
    primær.includes(g) ? 'primær' : sekundær.includes(g) ? 'sekundær' : 'hvilende';

  const beskrivelse = primær.length
    ? `Muskelkart. Jobber mest: ${primær.join(', ')}.` +
      (sekundær.length ? ` Bidrar: ${sekundær.join(', ')}.` : '')
    : 'Muskelkart. Ingen enkeltmuskler markert for denne øvelsen.';

  return (
    <div className={className}>
      <svg
        viewBox="0 0 210 185"
        role="img"
        aria-label={beskrivelse}
        className="w-full h-auto"
      >
        <Figur side="front" nivåFor={nivåFor} />
        <g transform="translate(110,0)">
          <Figur side="bak" nivåFor={nivåFor} />
        </g>
        <text x="50" y="183" textAnchor="middle" className="fill-zinc-500 text-[7px]">
          Forfra
        </text>
        <text x="160" y="183" textAnchor="middle" className="fill-zinc-500 text-[7px]">
          Bakfra
        </text>
      </svg>

      {visTekst && primær.length > 0 && (
        <p className="mt-1 text-[10px] text-zinc-400">
          <span className="text-emerald-400 font-bold">{primær.join(', ')}</span>
          {sekundær.length > 0 && <> · {sekundær.join(', ')}</>}
        </p>
      )}
    </div>
  );
};
