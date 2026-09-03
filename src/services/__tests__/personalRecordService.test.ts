import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hindrer at den ekte firebase.ts initialiseres under collect (getAuth kaster
// auth/invalid-api-key i testmiljø); testene bruker kun localStorage-veiene.
vi.mock('../firebase', () => ({ db: {}, auth: {} }));

import { getPersonalRecord, savePersonalRecord } from '../personalRecordService';

describe('Personal Record Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lagrer og oppdaterer personlig rekord lokalt', async () => {
    const res1 = await savePersonalRecord(null, 'planke', 'Planke', 45);
    expect(res1.isNewPr).toBe(true);
    expect(res1.previousBest).toBe(0);

    const pr = await getPersonalRecord(null, 'planke');
    expect(pr?.bestSeconds).toBe(45);

    // Kortere tid skal IKKE gi ny PR
    const res2 = await savePersonalRecord(null, 'planke', 'Planke', 30);
    expect(res2.isNewPr).toBe(false);
    expect(res2.previousBest).toBe(45);

    // Lengre tid SKAL gi ny PR
    const res3 = await savePersonalRecord(null, 'planke', 'Planke', 65);
    expect(res3.isNewPr).toBe(true);
    expect(res3.previousBest).toBe(45);

    const updatedPr = await getPersonalRecord(null, 'planke');
    expect(updatedPr?.bestSeconds).toBe(65);
  });
});
