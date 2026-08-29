import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  showErrorToast,
  dismissErrorToast,
  getErrorToast,
  subscribeErrorToast,
} from '../errorToastService';

describe('Error Toast Service', () => {
  beforeEach(() => {
    dismissErrorToast();
  });

  it('starter uten aktiv toast', () => {
    expect(getErrorToast()).toBeNull();
  });

  it('viser en feilmelding og varsler abonnenter', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeErrorToast(listener);

    showErrorToast('Kunne ikke lagre økten.');

    expect(getErrorToast()?.message).toBe('Kunne ikke lagre økten.');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('viser kun én toast av gangen — siste melding vinner', () => {
    showErrorToast('Første feil');
    const first = getErrorToast();
    showErrorToast('Andre feil');
    const second = getErrorToast();

    expect(second?.message).toBe('Andre feil');
    // Ny identitet slik at UI kan restarte auto-dismiss-timeren
    expect(second?.id).not.toBe(first?.id);
  });

  it('dismiss fjerner toasten og varsler abonnenter', () => {
    showErrorToast('Feil');
    const listener = vi.fn();
    const unsubscribe = subscribeErrorToast(listener);

    dismissErrorToast();

    expect(getErrorToast()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    // Dismiss uten aktiv toast skal ikke støye
    dismissErrorToast();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('avmeldte abonnenter varsles ikke', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeErrorToast(listener);
    unsubscribe();

    showErrorToast('Feil');
    expect(listener).not.toHaveBeenCalled();
  });
});
