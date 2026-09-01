import { WorkoutTemplate, IntervalItem } from '../types/workout';
import { WorkoutTemplateSchema } from '../schemas/workoutSchema';
import { recordShareLinkOpen } from './telemetryService';
import { showErrorToast } from './errorToastService';
import { PRESET_WORKOUTS } from '../data/mockWorkouts';
import { TRAINING_PROGRAMS } from '../data/programs';
import { EXERCISE_LIBRARY } from '../data/exercises';

/**
 * Delingslenker som får plass i en QR-kode.
 *
 * Hele økten lå base64-kodet i URL-en. Målt på «Klassisk Tabata» med åtte
 * øvelser ble lenken 2 111 tegn. Windows' delemeny nekter å lage QR over 400:
 * «Kan ikke generere QR-kode. Bruk en kobling med 400 tegn eller mindre.»
 *
 * QR er nettopp måten man deler en økt i et rom — instruktøren viser koden og
 * alle scanner. At den sluttet å virke jo flere øvelser økten hadde, rammet
 * nettopp de øktene det er mest verdt å dele.
 *
 * To grep, ingen backend:
 *
 * 1. En økt fra katalogen deles med ID: `?p=tabata-klassisk`. Da følger den
 *    dessuten med når øktens innhold rettes senere — den gamle lenken frøs en
 *    kopi av innholdet slik det var den dagen den ble delt.
 * 2. En egen økt kodes kompakt. Øvelsens navn, engelske navn og kategori er
 *    utledbare fra øvelses-ID-en, og utgjorde mesteparten av payloaden.
 */

/** Feltskille i det kompakte formatet. Ikke prosentkodet av URLSearchParams. */
const SEP = '~';
const ITEM_SEP = ':';
const KOMPAKT_VERSJON = '1';

/** Alle økter som kan deles med ren ID. */
function katalogØkter(): WorkoutTemplate[] {
  return [...PRESET_WORKOUTS, ...TRAINING_PROGRAMS.map((p) => p.workout)];
}

function finnKatalogØkt(id: string): WorkoutTemplate | undefined {
  return katalogØkter().find((w) => w.id === id);
}

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
function kodKompakt(workout: WorkoutTemplate): string {
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

function dekodKompakt(rå: string): WorkoutTemplate | null {
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

/** Bakoverkompatibel lesing av lenker som allerede er delt. */
function dekodBase64(encoded: string): unknown {
  const json = decodeURIComponent(
    Array.prototype.map
      .call(atob(encoded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(json);
}

/** Bygger delelenken — kort nok til en QR-kode. */
export function generateShareUrl(workout: WorkoutTemplate): string {
  try {
    const url = new URL(window.location.origin + window.location.pathname);
    if (finnKatalogØkt(workout.id)) {
      url.searchParams.set('p', workout.id);
    } else {
      url.searchParams.set('w', kodKompakt(workout));
    }
    // Attribusjonsparameter: gjør åpninger av delte lenker målbare (K-faktor)
    url.searchParams.set('ref', 'share');
    return url.toString();
  } catch (err) {
    console.error('Feil ved generering av delelenke:', err);
    return window.location.href;
  }
}

/**
 * Deler økt via systemets delemeny (mobil) eller kopierer lenke til utklippstavle
 */
export async function shareWorkout(workout: WorkoutTemplate): Promise<{ shared: boolean; copied: boolean }> {
  const url = generateShareUrl(workout);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Bli med på en økt: ${workout.name}`,
        text: `Prøv denne treningsøkten i Min Trener: ${workout.name}! Ingen innlogging nødvendig.`,
        url,
      });
      return { shared: true, copied: false };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, copied: false };
      }
    }
  }

  // Fallback til utklippstavle
  try {
    await navigator.clipboard.writeText(url);
    return { shared: false, copied: true };
  } catch (err) {
    console.warn('Kunne ikke kopiere til utklippstavle:', err);
    return { shared: false, copied: false };
  }
}

/**
 * Leser en delt økt fra URL-en ved oppstart.
 *
 * Tre former må forstås: katalog-ID (`?p=`), kompakt (`?w=1~…`) og gamle
 * base64-lenker (`?w=<base64>`). De gamle ligger allerede i kalenderinvitasjoner
 * og meldinger, og skal ikke slutte å virke fordi vi kortet ned formatet.
 *
 * `~` er skillet mellom dem: base64-alfabetet inneholder den ikke.
 */
export function getSharedWorkoutFromUrl(): WorkoutTemplate | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const presetId = params.get('p');
  const encoded = params.get('w');
  if (!presetId && !encoded) return null;

  let workout: WorkoutTemplate | null = null;
  try {
    if (presetId) {
      // Katalogøkten leses fra dataene våre, ikke fra lenken: da følger
      // senere rettelser i øvelser og tider med.
      workout = finnKatalogØkt(presetId) ?? null;
      if (!workout) console.warn('Delt katalog-ID finnes ikke:', presetId);
    } else if (encoded) {
      const rå = encoded.includes(SEP) ? dekodKompakt(encoded) : dekodBase64(encoded);
      // Skjemavalider uansett form: en fiendtlig eller korrupt lenke skal
      // aldri legge vilkårlige objekter i state (revisjon § 2.4).
      const result = WorkoutTemplateSchema.safeParse(rå);
      if (result.success) {
        workout = result.data;
      } else {
        console.warn('Delt økt avvist av skjemavalidering:', result.error.issues);
      }
    }
  } catch (err) {
    console.warn('Kunne ikke dekode delt økt fra URL:', err);
  }

  if (workout === null) {
    showErrorToast('Delingslenken er ugyldig eller skadet — økten kunne ikke lastes.');
  } else if (params.get('ref') === 'share') {
    // Tell anonymt at en delt lenke faktisk ble åpnet (fire-and-forget)
    recordShareLinkOpen().catch(() => {});
  }

  // Rens URL uten å reloade siden — også ved avvist payload, slik at den
  // korrupte lenken ikke blir liggende og trigge feilen på nytt
  try {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('w');
    cleanUrl.searchParams.delete('p');
    cleanUrl.searchParams.delete('ref');
    window.history.replaceState({}, document.title, cleanUrl.toString());
  } catch (err) {
    console.warn('Kunne ikke rense delings-URL:', err);
  }

  return workout;
}
