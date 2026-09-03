import { WorkoutTemplate } from '../types/workout';
import { WorkoutTemplateSchema } from '../schemas/workoutSchema';
import { kodKompakt, dekodKompakt } from './shareCodec';
import { recordShareLinkOpen } from './telemetryService';
import { showErrorToast } from './errorToastService';
import { PRESET_WORKOUTS } from '../data/mockWorkouts';
import { TRAINING_PROGRAMS } from '../data/programs';

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

/** Alle økter som kan deles med ren ID. */
function katalogØkter(): WorkoutTemplate[] {
  return [...PRESET_WORKOUTS, ...TRAINING_PROGRAMS.map((p) => p.workout)];
}

function finnKatalogØkt(id: string): WorkoutTemplate | undefined {
  return katalogØkter().find((w) => w.id === id);
}


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
 * To former: katalog-ID (`?p=`) og kompakt (`?w=1~…`).
 *
 * Det gamle base64-formatet leses IKKE lenger. Det ble delt i en periode da
 * lenkene var for lange til å bli QR-koder, og er bevisst droppet framfor å
 * bære en dekoder for det. En gammel lenke avvises med feilmelding, ikke i
 * stillhet.
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
      const rå = dekodKompakt(encoded);
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
