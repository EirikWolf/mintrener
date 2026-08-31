import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { SettingsMoreView } from '../SettingsMoreView';

/**
 * Lydnivå i innstillingene.
 *
 * To uavhengige brytere ga fire kombinasjoner. Brukeren fant to av dem: alt på
 * og alt av. Nivået «diskrete pip uten stemme» — det arbeidsplassen faktisk
 * ba om — krevde at man skjønte at «Lydsignaler» og «Stemmeveiledning» var to
 * forskjellige ting og satte dem i riktig kombinasjon.
 *
 * Ett valg med tre navngitte nivåer sier hva du får.
 */

vi.mock('../../../services/firebase', () => ({
  app: {},
  auth: {},
  db: {},
  googleProvider: {},
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

function renderSettings(
  overrides: { soundEnabled?: boolean; speechEnabled?: boolean } = {}
) {
  const handlers = {
    onToggleSound: vi.fn(),
    onToggleVibrate: vi.fn(),
    onToggleWakeLock: vi.fn(),
    onToggleSpeech: vi.fn(),
    onSetSoundLevel: vi.fn(),
  };
  render(
    <SettingsMoreView
      soundEnabled={overrides.soundEnabled ?? true}
      speechEnabled={overrides.speechEnabled ?? true}
      vibrateEnabled
      wakeLockEnabled
      {...handlers}
    />
  );
  return handlers;
}

function nivåvelger() {
  return screen.getByRole('radiogroup', { name: /Lydnivå/i });
}

beforeEach(() => {
  localStorage.clear();
});

describe('Innstillinger — lydnivå', () => {
  it('tilbyr tre navngitte nivåer i stedet for to brytere', () => {
    renderSettings();

    const velger = nivåvelger();
    expect(within(velger).getAllByRole('radio')).toHaveLength(3);
    expect(within(velger).getByRole('radio', { name: /Stille/ })).toBeInTheDocument();
    expect(within(velger).getByRole('radio', { name: /Signal/ })).toBeInTheDocument();
    expect(within(velger).getByRole('radio', { name: /Trener/ })).toBeInTheDocument();
  });

  it('viser hvilket nivå som gjelder nå', () => {
    renderSettings({ soundEnabled: true, speechEnabled: false });

    expect(within(nivåvelger()).getByRole('radio', { name: /Signal/ })).toBeChecked();
  });

  it('leser lyd av som Stille, selv om talebryteren står igjen på', () => {
    // Nåbar med de gamle uavhengige bryterne
    renderSettings({ soundEnabled: false, speechEnabled: true });

    expect(within(nivåvelger()).getByRole('radio', { name: /Stille/ })).toBeChecked();
  });

  it('melder fra om nivået brukeren velger', () => {
    const handlers = renderSettings({ soundEnabled: true, speechEnabled: true });

    fireEvent.click(within(nivåvelger()).getByRole('radio', { name: /Signal/ }));
    expect(handlers.onSetSoundLevel).toHaveBeenCalledWith('signal');
  });

  it('forklarer nivået som er valgt, med brukerens ord', () => {
    // Kun det aktive nivået forklares — tre forklaringer side om side får
    // ikke plass på 375 px, og ville gjort velgeren til en tekstblokk.
    renderSettings({ soundEnabled: true, speechEnabled: false });
    expect(screen.getByText(/Diskrete pip ved start og slutt/)).toBeInTheDocument();

    renderSettings({ soundEnabled: false, speechEnabled: false });
    expect(screen.getByText(/Ingen lyd/)).toBeInTheDocument();
  });

  it('har ikke lenger to konkurrerende brytere for det samme', () => {
    renderSettings();

    expect(screen.queryByRole('switch', { name: 'Lydsignaler' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Norsk stemmeveiledning' })
    ).not.toBeInTheDocument();
  });
});
