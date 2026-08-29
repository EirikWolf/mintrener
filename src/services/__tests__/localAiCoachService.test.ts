import { describe, it, expect } from 'vitest';
import { localAiCoach } from '../localAiCoachService';
import type { WorkoutSummaryFeedbackContext } from '../localAiCoachService';

describe('LocalAiCoachService', () => {
  it('genererer tilpasset daglig briefing basert på ukemål', () => {
    const briefing0 = localAiCoach.generateDailyBriefing({
      weeklyGoal: { completedThisWeek: 0, goal: 3, percentage: 0, isGoalMet: false },
    });
    expect(briefing0).toContain('Klar for ukens første økt?');

    const briefingGoalReached = localAiCoach.generateDailyBriefing({
      weeklyGoal: { completedThisWeek: 3, goal: 3, percentage: 100, isGoalMet: true },
    });
    expect(briefingGoalReached).toContain('Rått levert!');
  });

  it('gir spesifikke tekniske råd per øvelse', () => {
    const tip = localAiCoach.getExerciseTip('kneboy');
    expect(tip).toContain('Tips for');
  });

  it('svarer på vanlige treningsspørsmål offline', async () => {
    const res = await localAiCoach.askCoach('Hva gjør jeg om jeg har vondt i korsryggen?', {});
    expect(res).toContain('korsryggen');
  });
});

describe('LocalAiCoachService.generateWorkoutSummaryFeedback', () => {
  const base: WorkoutSummaryFeedbackContext = {
    workoutName: 'Tabata Helkropp',
    durationSeconds: 300,
  };

  it('prioriterer ny PR over rating', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({
      ...base,
      isNewPr: true,
      rating: 'for_tungt',
    });
    expect(msg.toLowerCase()).toContain('personlig rekord');
    expect(msg.toLowerCase()).not.toContain('restitusjon');
  });

  it('prioriterer nådd ukesmål over rating', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({
      ...base,
      rating: 'passe',
      weeklyGoal: { goal: 3, completedThisWeek: 3, percentage: 100, isGoalMet: true },
    });
    expect(msg.toLowerCase()).toContain('ukesmål');
  });

  it('anerkjenner "for tungt" og gir restitusjonsråd', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({ ...base, rating: 'for_tungt' });
    expect(msg.toLowerCase()).toMatch(/hvile|søvn|restitusjon|tungt/);
  });

  it('foreslår progresjon ved "for lett"', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({ ...base, rating: 'for_lett' });
    expect(msg.toLowerCase()).toMatch(/runde|sekund|progresjon|legg på/);
  });

  it('bekrefter "passe" belastning', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({ ...base, rating: 'passe' });
    expect(msg.toLowerCase()).toContain('passe');
  });

  it('nevner streak når den er 3 dager eller mer', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({ ...base, streakDays: 5 });
    expect(msg.toLowerCase()).toMatch(/dager på rad|streak/);
  });

  it('nevner ikke streak når den er under 3 dager', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({ ...base, streakDays: 2 });
    expect(msg.toLowerCase()).not.toMatch(/dager på rad|streak/);
  });

  it('gir en konkret pulsobservasjon når puls er tilgjengelig', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({
      ...base,
      avgHeartRate: 145,
      maxHeartRate: 168,
    });
    expect(msg).toContain('145');
    expect(msg.toLowerCase()).toMatch(/puls|sone/);
  });

  it('gir deterministiske varianter basert på varighet (kort/middels/lang), minst 3 ulike', () => {
    const short = localAiCoach.generateWorkoutSummaryFeedback({ ...base, durationSeconds: 100 });
    const medium = localAiCoach.generateWorkoutSummaryFeedback({ ...base, durationSeconds: 400 });
    const long = localAiCoach.generateWorkoutSummaryFeedback({ ...base, durationSeconds: 900 });

    expect(short).not.toBe(medium);
    expect(medium).not.toBe(long);
    expect(short).not.toBe(long);

    // Deterministisk: samme input gir samme output
    expect(localAiCoach.generateWorkoutSummaryFeedback({ ...base, durationSeconds: 900 })).toBe(long);
  });

  it('krasjer ikke på en (nesten) tom kontekst', () => {
    expect(() =>
      localAiCoach.generateWorkoutSummaryFeedback({ workoutName: '', durationSeconds: 0 })
    ).not.toThrow();
    const msg = localAiCoach.generateWorkoutSummaryFeedback({ workoutName: '', durationSeconds: 0 });
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('kombinerer maks to aspekter: PR + streak', () => {
    const msg = localAiCoach.generateWorkoutSummaryFeedback({
      ...base,
      isNewPr: true,
      streakDays: 7,
    });
    expect(msg.toLowerCase()).toContain('personlig rekord');
    expect(msg.toLowerCase()).toMatch(/dager på rad|streak/);
  });
});
