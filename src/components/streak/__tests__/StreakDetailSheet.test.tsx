import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreakDetailSheet } from '../StreakDetailSheet';
import type { WeekStreakResult } from '../../../services/streakService';
import { getWeeklyGoal } from '../../../services/weeklyGoalService';

function makeStreak(overrides: Partial<WeekStreakResult> = {}): WeekStreakResult {
  return {
    currentWeeks: 4,
    bestWeeks: 9,
    insuranceInBank: 0,
    insuranceUsedWeekKeys: [],
    currentWeekCompleted: false,
    reachedMilestones: [2, 4],
    lastBrokenWeeks: 0,
    breakWeekKey: null,
    ...overrides,
  };
}

function renderSheet(streak: WeekStreakResult = makeStreak()) {
  const onClose = vi.fn();
  const utils = render(<StreakDetailSheet streak={streak} onClose={onClose} />);
  return { ...utils, onClose };
}

beforeEach(() => {
  localStorage.clear();
});

describe('StreakDetailSheet', () => {
  it('viser nåværende og beste serie generert fra resultatet', () => {
    renderSheet(makeStreak({ currentWeeks: 4, bestWeeks: 9 }));
    expect(screen.getByText('Nåværende serie: 4 uker')).toBeInTheDocument();
    expect(screen.getByText('Beste serie: 9 uker')).toBeInTheDocument();
  });

  it('bruker entall ved 1 uke', () => {
    renderSheet(makeStreak({ currentWeeks: 1, bestWeeks: 1, reachedMilestones: [] }));
    expect(screen.getByText('Nåværende serie: 1 uke')).toBeInTheDocument();
    expect(screen.getByText('Beste serie: 1 uke')).toBeInTheDocument();
  });

  it('brudd re-frames som ny start (spec § 2.2, B1): 0 i serie + tidligere brudd → «Ny start»-tekst', () => {
    renderSheet(makeStreak({
      currentWeeks: 0,
      bestWeeks: 9,
      lastBrokenWeeks: 6,
      breakWeekKey: '2026-03-09',
      reachedMilestones: [],
    }));
    expect(
      screen.getByText('Ny start denne uka — forrige serie: 6 uker. Beste: 9.')
    ).toBeInTheDocument();
    // Aldri «Nåværende serie: 0 uker»-skam når det finnes en historie å bygge på
    expect(screen.queryByText(/Nåværende serie/)).not.toBeInTheDocument();
  });

  it('helt fersk bruker (aldri brutt) beholder ordinær serie-linje ved 0', () => {
    renderSheet(makeStreak({ currentWeeks: 0, bestWeeks: 0, lastBrokenWeeks: 0, reachedMilestones: [] }));
    expect(screen.getByText('Nåværende serie: 0 uker')).toBeInTheDocument();
    expect(screen.queryByText(/Ny start denne uka/)).not.toBeInTheDocument();
  });

  it('slinguke-status: bank 1 → «1 slinguke på lager»', () => {
    renderSheet(makeStreak({ insuranceInBank: 1 }));
    expect(screen.getByText('1 slinguke på lager')).toBeInTheDocument();
  });

  it('slinguke-status: bank 0 → «Opptjenes etter 4 fulle uker»', () => {
    renderSheet(makeStreak({ insuranceInBank: 0 }));
    expect(screen.getByText('Opptjenes etter 4 fulle uker')).toBeInTheDocument();
    expect(screen.queryByText(/på lager/)).not.toBeInTheDocument();
  });

  it('neste milepæl: currentWeeks 4 → «Neste milepæl: 8 uker»', () => {
    renderSheet(makeStreak({ currentWeeks: 4 }));
    expect(screen.getByText('Neste milepæl: 8 uker')).toBeInTheDocument();
  });

  it('neste milepæl etter 52 → alle nådd', () => {
    renderSheet(makeStreak({ currentWeeks: 52, bestWeeks: 52, reachedMilestones: [2, 4, 8, 12, 26, 52] }));
    expect(screen.getByText('Alle milepæler nådd')).toBeInTheDocument();
  });

  it('ukesmål-stepper endrer målet via setWeeklyGoal og viser «Gjelder fra neste uke»', () => {
    renderSheet();
    // Standardmål 3 vises; ingen endringsmelding før brukeren justerer
    expect(screen.getByText('3 økt')).toBeInTheDocument();
    expect(screen.queryByText('Gjelder fra neste uke')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Øk ukesmål' }));
    expect(screen.getByText('4 økt')).toBeInTheDocument();
    expect(getWeeklyGoal()).toBe(4); // persistert via setWeeklyGoal
    expect(screen.getByText('Gjelder fra neste uke')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reduser ukesmål' }));
    expect(screen.getByText('3 økt')).toBeInTheDocument();
    expect(getWeeklyGoal()).toBe(3);
  });

  it('X-knappen kaller onClose', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Lukk' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape kaller onClose', () => {
    const { onClose } = renderSheet();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('er en ordinær dialog med tilgjengelig navn (UU)', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Din streak' })).toBeInTheDocument();
  });
});
