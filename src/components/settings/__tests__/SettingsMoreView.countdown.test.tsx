import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { SettingsMoreView } from '../SettingsMoreView';
import { audioService } from '../../../services/audioService';

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

vi.mock('../../../services/audioService', () => ({
  audioService: {
    playCountdownBeep: vi.fn(),
    playCountdownBuzzer: vi.fn(),
    playWorkStart: vi.fn(),
    playBuzzerStart: vi.fn(),
    playRestStart: vi.fn(),
  },
}));

function renderSettings(
  props: Partial<React.ComponentProps<typeof SettingsMoreView>> = {}
) {
  const handlers = {
    onToggleVibrate: vi.fn(),
    onToggleWakeLock: vi.fn(),
    onSetSoundLevel: vi.fn(),
    onSetCountdownDurationSeconds: vi.fn(),
    onSetCountdownAudioStyle: vi.fn(),
  };
  render(
    <SettingsMoreView
      soundEnabled
      speechEnabled
      vibrateEnabled
      wakeLockEnabled
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('SettingsMoreView — Nedtelling og Varselsignal (CrossFit / Storskjerm)', () => {
  it('viser radiogruppe for nedtelling med 3s valgt som standard', () => {
    renderSettings();
    const group = screen.getByRole('radiogroup', { name: /Nedtelling/i });
    expect(group).toBeInTheDocument();

    const treSek = within(group).getByRole('radio', { name: /3 sekunder/i });
    const femSek = within(group).getByRole('radio', { name: /5 sekunder/i });

    expect(treSek).toHaveAttribute('aria-checked', 'true');
    expect(femSek).toHaveAttribute('aria-checked', 'false');
  });

  it('lar brukeren bytte nedtelling til 5 sekunder', () => {
    const handlers = renderSettings();
    const group = screen.getByRole('radiogroup', { name: /Nedtelling/i });
    const femSek = within(group).getByRole('radio', { name: /5 sekunder/i });

    fireEvent.click(femSek);

    expect(handlers.onSetCountdownDurationSeconds).toHaveBeenCalledWith(5);
    expect(femSek).toHaveAttribute('aria-checked', 'true');
  });

  it('viser radiogruppe for varselsignal med Klassisk pip som standard', () => {
    renderSettings();
    const group = screen.getByRole('radiogroup', { name: /Varselsignal/i });
    expect(group).toBeInTheDocument();

    const pip = within(group).getByRole('radio', { name: /Klassisk pip/i });
    const buzzer = within(group).getByRole('radio', { name: /Gym-buzzer/i });

    expect(pip).toHaveAttribute('aria-checked', 'true');
    expect(buzzer).toHaveAttribute('aria-checked', 'false');
  });

  it('lar brukeren bytte varselsignal til Gym-buzzer og trigger lyd', () => {
    const handlers = renderSettings();
    const group = screen.getByRole('radiogroup', { name: /Varselsignal/i });
    const buzzer = within(group).getByRole('radio', { name: /Gym-buzzer/i });

    fireEvent.click(buzzer);

    expect(handlers.onSetCountdownAudioStyle).toHaveBeenCalledWith('buzzer');
    expect(buzzer).toHaveAttribute('aria-checked', 'true');
    expect(audioService.playCountdownBuzzer).toHaveBeenCalledWith(true);
  });

  it('testknapp for nedtelling spiller riktig lyd for valgt profil', () => {
    renderSettings();
    const testNedtellingBtn = screen.getByRole('button', { name: /Test nedtelling/i });

    // Standard er beep
    fireEvent.click(testNedtellingBtn);
    expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);

    // Bytt til buzzer
    const group = screen.getByRole('radiogroup', { name: /Varselsignal/i });
    const buzzer = within(group).getByRole('radio', { name: /Gym-buzzer/i });
    fireEvent.click(buzzer);

    fireEvent.click(testNedtellingBtn);
    expect(audioService.playCountdownBuzzer).toHaveBeenCalledWith(true);
  });

  it('testknapp for startsignal spiller riktig startlyd for valgt profil', () => {
    renderSettings();
    const testStartBtn = screen.getByRole('button', { name: /Test startsignal/i });

    // Standard er work start
    fireEvent.click(testStartBtn);
    expect(audioService.playWorkStart).toHaveBeenCalledWith(true);

    // Bytt til buzzer
    const group = screen.getByRole('radiogroup', { name: /Varselsignal/i });
    const buzzer = within(group).getByRole('radio', { name: /Gym-buzzer/i });
    fireEvent.click(buzzer);

    fireEvent.click(testStartBtn);
    expect(audioService.playBuzzerStart).toHaveBeenCalledWith(true);
  });
});
