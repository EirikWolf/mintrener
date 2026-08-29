import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFavoriteProgramIds,
  toggleFavoriteProgramId,
  DEFAULT_FAVORITE_IDS,
} from '../favoritesService';

const KEY = 'mintrener_favorite_program_ids';

describe('Favorites Service — skjemavalidering ved lasting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returnerer standardfavoritter uten lagret verdi', () => {
    expect(getFavoriteProgramIds()).toEqual(DEFAULT_FAVORITE_IDS);
  });

  it('returnerer lagrede favoritter når de er gyldige', () => {
    localStorage.setItem(KEY, JSON.stringify(['a', 'b']));
    expect(getFavoriteProgramIds()).toEqual(['a', 'b']);
  });

  it('faller tilbake til standard ved korrupt JSON', () => {
    localStorage.setItem(KEY, '{{{');
    expect(getFavoriteProgramIds()).toEqual(DEFAULT_FAVORITE_IDS);
  });

  it('faller tilbake til standard når lagret liste inneholder ikke-strenger', () => {
    localStorage.setItem(KEY, JSON.stringify(['a', 42, { x: 1 }]));
    expect(getFavoriteProgramIds()).toEqual(DEFAULT_FAVORITE_IDS);
  });

  it('toggle fungerer fortsatt oppå validert lasting', () => {
    localStorage.setItem(KEY, JSON.stringify(['a']));
    expect(toggleFavoriteProgramId('b')).toEqual(['a', 'b']);
    expect(toggleFavoriteProgramId('a')).toEqual(['b']);
  });
});
