import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StrengthLoggerModal } from '../StrengthLoggerModal';
import { audioService } from '../../../services/audioService';

vi.mock('../../../services/firebase', () => ({
  app: {},
  auth: {},
  db: {},
  googleProvider: {},
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid' },
    profile: null,
    loading: false,
  }),
}));

vi.mock('../../../services/strengthLogService', () => ({
  calculateOneRepMax: vi.fn(() => 20),
  saveStrengthLog: vi.fn(async () => {}),
  getLastStrengthLogForExercise: vi.fn(async () => null),
}));

vi.mock('../../../services/audioService', () => ({
  audioService: {
    playCountdownBeep: vi.fn(),
    playWorkStart: vi.fn(),
  },
}));

describe('StrengthLoggerModal – Hviletimer & Lydharmonisering (Fase 4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starter automatisk 60s pause ved fullføring av et sett og spiller nedtellingspip og startsignal', () => {
    render(<StrengthLoggerModal onClose={vi.fn()} initialExerciseId="goblet-squat" />);

    // Finn første checkbox for sett 1
    const set1Checkbox = screen.getByRole('checkbox', { name: /Sett 1/i });
    expect(set1Checkbox).toBeInTheDocument();

    // Marker sett 1 som fullført
    act(() => {
      fireEvent.click(set1Checkbox);
    });

    // Skal vise hviletimer og knapp for å hoppe over
    expect(screen.getByText(/Hviletid mellom sett/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hopp over/i })).toBeInTheDocument();

    // Spol frem til 3 sekunder igjen (57 sekunder passert)
    act(() => {
      vi.advanceTimersByTime(57_000);
    });

    expect(audioService.playCountdownBeep).toHaveBeenCalled();

    // Spol frem til fullført pause (3 sekunder til)
    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(audioService.playWorkStart).toHaveBeenCalled();
  });
});
