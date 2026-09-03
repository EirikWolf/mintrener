import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportFullUserDataset } from '../exportDataService';
import { STORAGE_KEYS } from '../../constants/storageKeys';

describe('exportDataService – GDPR dataportabilitet (Art. 20)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('eksporterer komplett datasett inkludert profil, styrkelogg, egne øvelser og PR-er', async () => {
    localStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify([{ id: 'h1', workoutName: 'Testøkt', durationSeconds: 600 }]));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify([{ id: 'ex1', navn: { nb: 'Egen' } }]));
    localStorage.setItem(STORAGE_KEYS.CUSTOM_WORKOUTS, JSON.stringify([{ id: 'w1', name: 'Egen økt' }]));
    localStorage.setItem(STORAGE_KEYS.STRENGTH_LOGS, JSON.stringify([{ id: 's1', exerciseId: 'kneboy', weight: 80 }]));
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ birthYear: 1990 }));
    localStorage.setItem(STORAGE_KEYS.PERSONAL_RECORDS, JSON.stringify({ kneboy: 100 }));
    localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(['streak-3']));
    localStorage.setItem(STORAGE_KEYS.WEEKLY_GOAL, '3');
    localStorage.setItem(STORAGE_KEYS.COACH_PERSONA, 'hardcore');

    // Mock Blob and URL
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    // Mock document.createElement
    let createdAnchor: any = null;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        createdAnchor = el;
      }
      return el;
    });

    await exportFullUserDataset();

    expect(createdAnchor).not.toBeNull();
    expect(createdAnchor.download).toMatch(/mintrener-eksport-\d{4}-\d{2}-\d{2}\.json/);
  });
});
