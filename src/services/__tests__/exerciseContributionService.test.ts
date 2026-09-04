import { describe, it, expect, beforeEach } from 'vitest';
import {
  getExerciseContributions,
  submitExerciseImageContribution,
  approveExerciseContribution,
  rejectExerciseContribution,
  getApprovedExerciseImageUrl,
  getApprovedExerciseImages,
} from '../exerciseContributionService';

describe('exerciseContributionService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starter med tom liste over bidrag og godkjente bilder', () => {
    expect(getExerciseContributions()).toEqual([]);
    expect(getApprovedExerciseImages()).toEqual({});
    expect(getApprovedExerciseImageUrl('push-ups', 0)).toBeNull();
  });

  it('lagrer et nytt brukerinnsendt bilde med pending status', () => {
    const res = submitExerciseImageContribution({
      exerciseId: 'push-ups',
      phase: 0,
      imageDataUrl: 'data:image/webp;base64,sample123',
      notes: 'Bunnposisjon fra 45 graders vinkel',
      userId: 'test-user',
      userName: 'Ola Nordmann',
    });

    expect(res.id).toMatch(/^contrib-/);
    expect(res.exerciseId).toBe('push-ups');
    expect(res.phase).toBe(0);
    expect(res.status).toBe('pending');
    expect(res.submittedByName).toBe('Ola Nordmann');

    const all = getExerciseContributions('push-ups');
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(res.id);
  });

  it('lar admin godkjenne et bilde og setter det automatisk som standardbilde', () => {
    const res = submitExerciseImageContribution({
      exerciseId: 'knebøy',
      phase: 1,
      imageDataUrl: 'data:image/webp;base64,approvedBilde',
      userId: 'user-2',
      userName: 'Kari',
    });

    expect(getApprovedExerciseImageUrl('knebøy', 1)).toBeNull();

    const ok = approveExerciseContribution(res.id);
    expect(ok).toBe(true);

    const contributions = getExerciseContributions('knebøy');
    expect(contributions[0].status).toBe('approved');

    // Nå skal bildet være aktivt standardbilde for knebøy fase 1
    expect(getApprovedExerciseImageUrl('knebøy', 1)).toBe('data:image/webp;base64,approvedBilde');
  });

  it('lar admin avvise et bilde uten å sette det som standard', () => {
    const res = submitExerciseImageContribution({
      exerciseId: 'planke',
      phase: 0,
      imageDataUrl: 'data:image/webp;base64,badImage',
    });

    const ok = rejectExerciseContribution(res.id);
    expect(ok).toBe(true);

    const contributions = getExerciseContributions('planke');
    expect(contributions[0].status).toBe('rejected');
    expect(getApprovedExerciseImageUrl('planke', 0)).toBeNull();
  });
});
