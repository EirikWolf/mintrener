import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateShareUrl, getSharedWorkoutFromUrl } from '../shareWorkoutService';
import { WorkoutTemplate } from '../../types/workout';
import { PRESET_WORKOUTS } from '../../data/mockWorkouts';

/**
 * Lengden på delingslenken.
 *
 * Hele økten lå base64-kodet i URL-en. Målt på «Klassisk Tabata» med åtte
 * øvelser ble lenken rundt 2 200 tegn. Windows' delemeny nekter å lage QR-kode
 * over 400: «Kan ikke generere QR-kode. Bruk en kobling med 400 tegn eller
 * mindre.»
 *
 * QR er nettopp måten man deler en økt i et rom — instruktøren viser koden, og
 * alle scanner. At den slutter å virke jo flere øvelser økten har, rammer de
 * øktene det er mest verdt å dele.
 *
 * To grep, ingen backend:
 *
 * 1. En økt fra katalogen trenger bare ID-en. Da følger den dessuten med når
 *    øktens innhold rettes senere — dagens lenke fryser en kopi.
 * 2. En egen økt kodes kompakt. Øvelsens navn, engelske navn og kategori er
 *    utledbare fra øvelses-ID-en, og utgjorde mesteparten av payloaden.
 */

const QR_GRENSE = 400;

function settUrl(search: string) {
  Object.defineProperty(window, 'location', {
    value: new URL(`https://mintrener.web.app/${search}`),
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  settUrl('');
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});

describe('Delingslenken holder seg under QR-grensen', () => {
  it('deler en katalogøkt med ID, ikke med hele innholdet', () => {
    const tabata = PRESET_WORKOUTS.find((w) => w.items.length >= 8) ?? PRESET_WORKOUTS[0];
    const url = generateShareUrl(tabata);

    expect(url.length).toBeLessThan(120);
    expect(url).toContain(tabata.id);
  });

  it('holder en egendefinert økt med åtte øvelser under 400 tegn', () => {
    const egen: WorkoutTemplate = {
      id: 'custom-1',
      name: 'Min egen økt',
      description: 'Åtte øvelser',
      type: 'custom',
      prepareDurationSeconds: 10,
      rounds: 3,
      roundRestDurationSeconds: 30,
      items: Array.from({ length: 8 }, (_, i) => ({
        id: `i${i}`,
        exercise: { id: 'kneboy', name: 'Knebøy', nameEn: 'Squats', category: 'bodyweight' },
        workDurationSeconds: 20,
        restDurationSeconds: 10,
      })),
    };

    // Målt: 238 tegn. Var 1 855 med hele økten base64-kodet i lenken.
    expect(generateShareUrl(egen).length).toBeLessThan(QR_GRENSE);
  });
});

describe('Delte lenker kan leses tilbake', () => {
  it('henter en katalogøkt fra ID-en', () => {
    const tabata = PRESET_WORKOUTS[0];
    const url = new URL(generateShareUrl(tabata));
    settUrl(url.search);

    const lest = getSharedWorkoutFromUrl();
    expect(lest?.name).toBe(tabata.name);
    expect(lest?.items).toHaveLength(tabata.items.length);
  });

  it('henter en egendefinert økt med alle tider intakt', () => {
    const egen: WorkoutTemplate = {
      id: 'custom-2',
      name: 'Planke 1:40',
      description: '',
      type: 'custom',
      prepareDurationSeconds: 15,
      rounds: 2,
      roundRestDurationSeconds: 45,
      items: [
        {
          id: 'i1',
          exercise: { id: 'planke', name: 'Planke' },
          workDurationSeconds: 100,
          restDurationSeconds: 0,
        },
      ],
    };
    settUrl(new URL(generateShareUrl(egen)).search);

    const lest = getSharedWorkoutFromUrl();
    expect(lest?.name).toBe('Planke 1:40');
    expect(lest?.prepareDurationSeconds).toBe(15);
    expect(lest?.rounds).toBe(2);
    expect(lest?.roundRestDurationSeconds).toBe(45);
    expect(lest?.items[0].workDurationSeconds).toBe(100);
    expect(lest?.items[0].restDurationSeconds).toBe(0);
    expect(lest?.items[0].exercise.id).toBe('planke');
  });

  it('avviser det gamle base64-formatet i stedet for å bære en dekoder for det', () => {
    // Formatet ble delt i en kort periode da lenkene var for lange til QR.
    // Bevisst droppet: en avvist lenke sier fra, en halvveis lastet gjør ikke.
    const b64 = btoa('{"name":"Gammel"}');
    settUrl(`?w=${encodeURIComponent(b64)}&ref=share`);
    expect(getSharedWorkoutFromUrl()).toBeNull();
  });

  it('avviser en skadet lenke i stedet for å laste noe halvt', () => {
    settUrl('?w=dette-er-ikke-en-okt');
    expect(getSharedWorkoutFromUrl()).toBeNull();
  });
});
