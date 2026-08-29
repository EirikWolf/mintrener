import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateShareUrl,
  getSharedWorkoutFromUrl,
} from '../shareWorkoutService';
import { getErrorToast, dismissErrorToast } from '../errorToastService';
import { WorkoutTemplate } from '../../types/workout';

/** Samme UTF-8 → base64-koding som generateShareUrl bruker */
function encodePayload(obj: unknown): string {
  const json = JSON.stringify(obj);
  return btoa(
    encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function stubLocationWithParam(wParam: string): void {
  const search = `?w=${encodeURIComponent(wParam)}`;
  vi.stubGlobal('location', {
    origin: 'https://mintrener.web.app',
    pathname: '/',
    href: `https://mintrener.web.app/${search}`,
    search,
  });
}

const sampleWorkout: WorkoutTemplate = {
  id: 'test-w1',
  name: 'Morgen Tabata',
  description: 'Rask morgenøkt',
  type: 'tabata',
  prepareDurationSeconds: 5,
  rounds: 2,
  roundRestDurationSeconds: 15,
  items: [
    {
      id: 'i1',
      exercise: { id: 'kneboy', name: 'Knebøy', category: 'bodyweight' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
  ],
};

describe('Share Workout Service (Deep-linking)', () => {
  beforeEach(() => {
    vi.stubGlobal('location', {
      origin: 'https://mintrener.web.app',
      pathname: '/',
      href: 'https://mintrener.web.app/',
      search: '',
    });
    vi.stubGlobal('history', {
      replaceState: vi.fn(),
    });
    dismissErrorToast();
  });

  it('genererer en gyldig dele-URL med base64 parameter', () => {
    const urlStr = generateShareUrl(sampleWorkout);
    expect(urlStr).toContain('https://mintrener.web.app/?w=');
  });

  it('dekoder økt fra URL korrekt', () => {
    const urlStr = generateShareUrl(sampleWorkout);
    const url = new URL(urlStr);
    const encoded = url.searchParams.get('w');

    vi.stubGlobal('location', {
      origin: 'https://mintrener.web.app',
      pathname: '/',
      href: urlStr,
      search: `?w=${encoded}`,
    });

    const parsed = getSharedWorkoutFromUrl();
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe('Morgen Tabata');
    expect(parsed?.rounds).toBe(2);
    expect(parsed?.items.length).toBe(1);
    expect(parsed?.items[0].exercise.name).toBe('Knebøy');
    // Gyldig payload skal IKKE utløse feil-toast
    expect(getErrorToast()).toBeNull();
  });

  it('runde-turer builder-økter med norske kategorier uten avvisning (BLOCKER-regresjon)', () => {
    const builderWorkout: WorkoutTemplate = {
      id: 'custom-1756400000000',
      name: 'Min bygde økt',
      description: '',
      type: 'custom',
      prepareDurationSeconds: 10,
      rounds: 3,
      roundRestDurationSeconds: 0,
      items: [
        {
          id: 'item-1',
          exercise: { id: 'kb-sving', name: 'Kettlebell-svinger', category: 'frivekt' },
          workDurationSeconds: 30,
          restDurationSeconds: 15,
        },
      ],
    };
    const urlStr = generateShareUrl(builderWorkout);
    const encoded = new URL(urlStr).searchParams.get('w');

    vi.stubGlobal('location', {
      origin: 'https://mintrener.web.app',
      pathname: '/',
      href: urlStr,
      search: `?w=${encoded}`,
    });

    const parsed = getSharedWorkoutFromUrl();
    expect(parsed).not.toBeNull();
    expect(parsed?.items[0].exercise.category).toBe('frivekt');
    expect(getErrorToast()).toBeNull();
  });

  it('avviser payload med feil form (skjemavalidering) og viser norsk feilmelding', () => {
    const hostile = {
      id: 'x',
      name: 'Ondsinnet',
      description: '',
      type: 'tabata',
      prepareDurationSeconds: 10,
      rounds: 2,
      roundRestDurationSeconds: 0,
      items: 'ikke-en-liste', // ugyldig
    };
    stubLocationWithParam(encodePayload(hostile));

    const parsed = getSharedWorkoutFromUrl();
    expect(parsed).toBeNull();
    expect(getErrorToast()?.message).toMatch(/ugyldig/i);
  });

  it('avviser payload med fiendtlige tallverdier (negative varigheter)', () => {
    const hostile = {
      id: 'x',
      name: 'Negativ',
      description: '',
      type: 'custom',
      prepareDurationSeconds: -100,
      rounds: 2,
      roundRestDurationSeconds: 0,
      items: [],
    };
    stubLocationWithParam(encodePayload(hostile));

    expect(getSharedWorkoutFromUrl()).toBeNull();
    expect(getErrorToast()).not.toBeNull();
  });

  it('håndterer korrupt base64/JSON uten kræsj — null + feilmelding', () => {
    stubLocationWithParam('%%%ikke-base64%%%');

    expect(getSharedWorkoutFromUrl()).toBeNull();
    expect(getErrorToast()?.message).toMatch(/ugyldig/i);
  });

  it('renser URL-en også når payloaden avvises, slik at korrupt lenke ikke blir liggende', () => {
    stubLocationWithParam(encodePayload({ tull: true }));

    expect(getSharedWorkoutFromUrl()).toBeNull();
    expect(history.replaceState).toHaveBeenCalled();
  });
});
