import { describe, it, expect } from 'vitest';
import { localAiCoach } from '../localAiCoachService';

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
