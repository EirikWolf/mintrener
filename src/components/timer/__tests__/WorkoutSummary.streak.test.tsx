import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WorkoutSummary } from '../WorkoutSummary';
import { WorkoutTemplate } from '../../../types/workout';
import type { CompletedWorkoutLog } from '../../../types/models';
import { recordEngagementEvent } from '../../../services/telemetryService';
import { WORKOUT_HISTORY_KEY } from '../../../services/workoutHistoryStorage';

// Firebase-appen skal aldri initialiseres i komponenttester — flere av
// WorkoutSummarys tjenesteavhengigheter (telemetri, firestore, PR) importerer
// den transitivt. Tjenestegrensen mockes; testene tester UI-grenene (B4-mønster).
vi.mock('../../../services/firebase', () => ({
  app: {},
  auth: {},
  db: {},
  googleProvider: {},
}));

// Per-test-styrbar auth: user muteres i testene, signInWithGoogle asserteres.
const authMocks = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  signInWithGoogle: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authMocks.user,
    profile: null,
    loading: false,
    signInWithGoogle: authMocks.signInWithGoogle,
    logout: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

vi.mock('../../../services/telemetryService', () => ({
  recordWorkoutTelemetry: vi.fn(),
  recordEngagementEvent: vi.fn(),
}));

const knebay = { id: 'e1', name: 'Knebøy' };
const planke = { id: 'e2', name: 'Planke' };

// To øvelser → PR-sporet (savePersonalRecord, kun 1 øvelse) er aldri aktivt her.
const workout: WorkoutTemplate = {
  id: 'w-test',
  name: 'Testøkt',
  description: 'Testfixture',
  type: 'custom',
  prepareDurationSeconds: 5,
  rounds: 2,
  roundRestDurationSeconds: 15,
  items: [
    { id: 'i1', exercise: knebay, workDurationSeconds: 20, restDurationSeconds: 10 },
    { id: 'i2', exercise: planke, workDurationSeconds: 20, restDurationSeconds: 10 },
  ],
};

function log(y: number, m: number, d: number, idx = 0): CompletedWorkoutLog {
  return {
    id: `log-${y}-${m}-${d}-${idx}`,
    userId: 'local',
    workoutId: 'w-old',
    workoutName: 'Gammel økt',
    workoutType: 'custom',
    durationSeconds: 300,
    roundsCompleted: 2,
    totalRounds: 2,
    completedAt: new Date(y, m - 1, d, 10 + idx).toISOString(),
  };
}

function seedHistory(logs: CompletedWorkoutLog[]): void {
  localStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(logs));
}

function renderSummary() {
  return render(
    <WorkoutSummary workout={workout} totalElapsedSeconds={300} onRestart={() => {}} />
  );
}

const MILESTONE_BANNER = '🔥 2 uker på rad — milepæl nådd!';
const FIRST_WORKOUT_TEXT = 'Vil du ta vare på fremgangen din på tvers av enheter?';

// «nå» = onsdag 2026-03-18; forrige uke starter man 2026-03-09, inneværende man 2026-03-16
const NOW = new Date(2026, 2, 18, 12);

describe('WorkoutSummary — milepælsfeiring og konto-prompt (C1/C2 Task 9)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authMocks.user = null;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('milepælsfeiring', () => {
    it('viser feiringsbanner, teller telemetri og persisterer feiringen når DENNE økta fullførte uka og nådde milepæl 2', () => {
      // Ukesmål 1: forrige uke fullført med én økt; inneværende uke fullføres av DENNE økta
      localStorage.setItem('mintrener_weekly_goal', '1');
      seedHistory([log(2026, 3, 11)]);

      const { unmount } = renderSummary();

      expect(screen.getByText(MILESTONE_BANNER)).toBeInTheDocument();
      expect(recordEngagementEvent).toHaveBeenCalledWith('streak_milestone_w2');
      expect(recordEngagementEvent).toHaveBeenCalledWith('streak_weekCompleted');

      // markMilestoneCelebrated(2) persistert
      expect(JSON.parse(localStorage.getItem('mintrener_streak_celebrated_v1') ?? '[]')).toContain(2);

      // Ny render (f.eks. neste økt samme uke) viser IKKE banneret igjen
      unmount();
      renderSummary();
      expect(screen.queryByText(MILESTONE_BANNER)).not.toBeInTheDocument();
    });

    it('viser intet banner og teller ingen milepæl-telemetri når milepælen alt er feiret', () => {
      localStorage.setItem('mintrener_weekly_goal', '1');
      localStorage.setItem('mintrener_streak_celebrated_v1', JSON.stringify([2]));
      seedHistory([log(2026, 3, 11)]);

      renderSummary();

      expect(screen.queryByText(MILESTONE_BANNER)).not.toBeInTheDocument();
      expect(recordEngagementEvent).not.toHaveBeenCalledWith('streak_milestone_w2');
    });

    it('teller IKKE streak_weekCompleted når uka allerede var fullført før denne økta', () => {
      // Ukesmål 1: inneværende uke alt fullført av en tidligere økt mandag
      localStorage.setItem('mintrener_weekly_goal', '1');
      seedHistory([log(2026, 3, 11), log(2026, 3, 16)]);

      renderSummary();

      expect(recordEngagementEvent).not.toHaveBeenCalledWith('streak_weekCompleted');
    });

    it('bootstrap: ALLE ufeirede milepæler telles i telemetrien, kun høyeste får banner (B2)', () => {
      // Ukesmål 1: tre fullførte uker bak oss; DENNE økta fullfører uke 4 →
      // milepæl 2 og 4 nås samtidig (eksisterende bruker uten feiringshistorikk)
      localStorage.setItem('mintrener_weekly_goal', '1');
      seedHistory([log(2026, 2, 23), log(2026, 3, 2), log(2026, 3, 9)]);

      renderSummary();

      expect(recordEngagementEvent).toHaveBeenCalledWith('streak_milestone_w2');
      expect(recordEngagementEvent).toHaveBeenCalledWith('streak_milestone_w4');
      expect(screen.getByText('🔥 4 uker på rad — milepæl nådd!')).toBeInTheDocument();
      expect(screen.queryByText(MILESTONE_BANNER)).not.toBeInTheDocument();
      // begge persistert som feiret
      expect(
        JSON.parse(localStorage.getItem('mintrener_streak_celebrated_v1') ?? '[]')
      ).toEqual(expect.arrayContaining([2, 4]));
    });
  });

  describe('slinguke- og brudd-produsenter (plan-gap)', () => {
    it('slinguke-forbruk feires med tall fra resultatet og telles ÉN gang (dedupe over re-render)', () => {
      localStorage.setItem('mintrener_weekly_goal', '1');
      // Milepælene alt feiret — testen isolerer slinguke-linjen
      localStorage.setItem('mintrener_streak_celebrated_v1', JSON.stringify([2, 4]));
      // 4 fullførte uker (bank opptjent), 03-02 røket (forsikret), 03-09 fullført
      seedHistory([
        log(2026, 2, 2), log(2026, 2, 9), log(2026, 2, 16), log(2026, 2, 23),
        log(2026, 3, 9),
      ]);

      const { unmount } = renderSummary();

      // Serien står på 5 t.o.m. forrige uke; denne økta fullfører inneværende → 6
      expect(
        screen.getByText('Slinguka reddet serien din — fortsatt 6 uker!')
      ).toBeInTheDocument();
      expect(recordEngagementEvent).toHaveBeenCalledWith('streak_insuranceUsed');

      unmount();
      renderSummary();
      const insuranceCalls = vi
        .mocked(recordEngagementEvent)
        .mock.calls.filter(([c]) => c === 'streak_insuranceUsed');
      expect(insuranceCalls).toHaveLength(1);
    });

    it('streak_broken telles ÉN gang ved nytt brudd — ingen sørgetekst i fullført-skjermen', () => {
      localStorage.setItem('mintrener_weekly_goal', '1');
      // Uke 03-02 fullført, 03-09 røket uten bank → brudd konstateres
      seedHistory([log(2026, 3, 2)]);

      const { unmount } = renderSummary();

      expect(recordEngagementEvent).toHaveBeenCalledWith('streak_broken');
      // Brudd re-frames KUN i detaljarket (B1) — fullført-skjermen sørger ikke
      expect(screen.queryByText(/Ny start/)).not.toBeInTheDocument();
      expect(screen.queryByText(/serien røk/i)).not.toBeInTheDocument();

      unmount();
      renderSummary();
      const brokenCalls = vi
        .mocked(recordEngagementEvent)
        .mock.calls.filter(([c]) => c === 'streak_broken');
      expect(brokenCalls).toHaveLength(1);
    });
  });

  describe('konto-prompt', () => {
    it('anonym + første fullførte økt → first_workout-prompt med shown-telemetri; «Lagre med konto» kaller signInWithGoogle + accepted-telemetri', () => {
      // Tom historikk: denne økta er nr. 1
      renderSummary();

      expect(screen.getByText(FIRST_WORKOUT_TEXT)).toBeInTheDocument();
      expect(recordEngagementEvent).toHaveBeenCalledWith('accountPrompt_first_workout_shown');

      fireEvent.click(screen.getByRole('button', { name: 'Lagre med konto' }));
      expect(authMocks.signInWithGoogle).toHaveBeenCalledTimes(1);
      expect(recordEngagementEvent).toHaveBeenCalledWith('accountPrompt_first_workout_accepted');
    });

    it('«Ikke nå» skjuler prompten, persisterer avvisning og teller dismissed-telemetri — prompten kommer ikke tilbake', () => {
      const { unmount } = renderSummary();

      fireEvent.click(screen.getByRole('button', { name: 'Ikke nå' }));

      expect(screen.queryByText(FIRST_WORKOUT_TEXT)).not.toBeInTheDocument();
      expect(recordEngagementEvent).toHaveBeenCalledWith('accountPrompt_first_workout_dismissed');
      expect(
        JSON.parse(localStorage.getItem('mintrener_account_prompt_v1') ?? '[]')
      ).toContain('first_workout');

      // Varig per moment: ny render viser ikke prompten
      unmount();
      renderSummary();
      expect(screen.queryByText(FIRST_WORKOUT_TEXT)).not.toBeInTheDocument();
    });

    it('innlogget bruker ser aldri prompten', () => {
      authMocks.user = { uid: 'u1' };

      renderSummary();

      expect(screen.queryByText(FIRST_WORKOUT_TEXT)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Lagre med konto' })).not.toBeInTheDocument();
      expect(recordEngagementEvent).not.toHaveBeenCalledWith('accountPrompt_first_workout_shown');
    });

    it('shown-telemetri fyres én gang også under StrictMode (dobbel effekt-kjøring)', () => {
      render(
        <React.StrictMode>
          <WorkoutSummary workout={workout} totalElapsedSeconds={300} onRestart={() => {}} />
        </React.StrictMode>
      );

      const shownCalls = vi
        .mocked(recordEngagementEvent)
        .mock.calls.filter(([c]) => c === 'accountPrompt_first_workout_shown');
      expect(shownCalls).toHaveLength(1);
    });

    it('ved uke-2-feiring vinner week2-prompten — med tall fra streakberegningen, ikke antatt aritmetikk', () => {
      localStorage.setItem('mintrener_weekly_goal', '1');
      seedHistory([log(2026, 3, 11)]);

      renderSummary();

      // 1 historisk økt + denne = 2 økter; currentWeeks = 2 fra computeWeekStreak
      expect(
        screen.getByText('2 økter og 2 uker på rad — vil du synkronisere fremgangen med en konto?')
      ).toBeInTheDocument();
      expect(screen.queryByText(FIRST_WORKOUT_TEXT)).not.toBeInTheDocument();
      expect(recordEngagementEvent).toHaveBeenCalledWith('accountPrompt_week2_shown');
      expect(recordEngagementEvent).not.toHaveBeenCalledWith('accountPrompt_first_workout_shown');
    });
  });
});
