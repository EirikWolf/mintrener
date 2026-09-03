import { WorkoutTemplate, IntervalItem } from '../types/workout';
import { EXERCISE_LIBRARY } from '../data/exercises';

/**
 * Kodek for det kompakte delingsformatet — bevisst uten sideeffekter.
 *
 * Ligger for seg selv fordi shareWorkoutService drar inn telemetryService og
 * dermed firebase.ts, som kaller initializeApp() og getAuth() ved modullast.
 * Playwright-testene kjører i node uten Firebase-nøkler, så et slikt kall
 * kaster «auth/invalid-api-key» før første assert. Med kodeken skilt ut kan
 * e2e-testene kode lenker med APPENS egen kode i stedet for en kopi av
 * formatet — kopien gikk ut av takt 2026-09-01 (3993534) og lot røyktesten
 * feile på noe som så ut som en manglende knapp.
 */

/** Feltskille i det kompakte formatet. Ikke prosentkodet av URLSearchParams. */
const SEP = '~';
const ITEM_SEP = ':';
const KOMPAKT_VERSJON = '1';

/** `~` overlever ikke feltskillet, og encodeURIComponent rører den ikke. */
function kodFelt(s: string): string {
  return encodeURIComponent(s).replace(/~/g, '%7E');
}

function dekodFelt(s: string): string {
  return decodeURIComponent(s);
}

/**
 * Kompakt form: `1~navn~klargjøring~runder~rundepause~id:arbeid:pause~…`
 *
 * En øvelse som ikke finnes i biblioteket bærer navn og kategori som fjerde og
 * femte felt. Uten det mister mottakeren begge — og kategorien er nettopp det
 * en tidligere feil avviste builder-økter på (BLOCKER-regresjonen).
 */
export function kodKompakt(workout: WorkoutTemplate): string {
  const kjente = new Set(EXERCISE_LIBRARY.map((e) => e.id));
  const deler = [
    KOMPAKT_VERSJON,
    kodFelt(workout.name),
    String(workout.prepareDurationSeconds),
    String(workout.rounds),
    String(workout.roundRestDurationSeconds),
    ...workout.items.map((i) => {
      const base = [i.exercise.id, i.workDurationSeconds, i.restDurationSeconds].join(ITEM_SEP);
      if (kjente.has(i.exercise.id)) return base;
      return [base, kodFelt(i.exercise.name), kodFelt(i.exercise.category ?? '')].join(ITEM_SEP);
    }),
  ];
  return deler.join(SEP);
}

export function dekodKompakt(rå: string): WorkoutTemplate | null {
  const deler = rå.split(SEP);
  if (deler.length < 6 || deler[0] !== KOMPAKT_VERSJON) return null;

  const [, navn, klargjøring, runder, rundepause, ...itemDeler] = deler;
  const items: IntervalItem[] = [];

  for (const [idx, d] of itemDeler.entries()) {
    const [exId, arbeid, pause, egetNavn, egenKategori] = d.split(ITEM_SEP);
    if (!exId) return null;
    const fra = EXERCISE_LIBRARY.find((e) => e.id === exId);
    items.push({
      id: `delt-${idx}`,
      exercise: fra
        ? {
            id: fra.id,
            name: fra.navn.nb,
            nameEn: fra.navn.en,
            category: fra.kategori,
          }
        : {
            id: exId,
            name: egetNavn ? dekodFelt(egetNavn) : exId,
            ...(egenKategori ? { category: dekodFelt(egenKategori) } : {}),
          },
      workDurationSeconds: Number(arbeid),
      restDurationSeconds: Number(pause),
    });
  }

  return {
    id: `shared-${Date.now()}`,
    name: dekodFelt(navn),
    description: '',
    type: 'custom',
    prepareDurationSeconds: Number(klargjøring),
    rounds: Number(runder),
    roundRestDurationSeconds: Number(rundepause),
    items,
  };
}

/** Bygger delelenken — kort nok til en QR-kode. */