import { describe, it, expect, beforeEach } from 'vitest';
import {
  isTesterRoleActive,
  verifyAndSetTesterCode,
  getTesterChecklist,
  updateTesterChecklistItem,
  getAllTesterFeedback,
  submitTesterFeedback,
} from '../testerService';

describe('testerService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starter som inaktiv uten flagg eller parameter', () => {
    expect(isTesterRoleActive()).toBe(false);
  });

  it('aktiverer tester-status ved gyldig kode', () => {
    const res = verifyAndSetTesterCode('TEST2026');
    expect(res.success).toBe(true);
    expect(isTesterRoleActive()).toBe(true);
  });

  it('avviser ugyldig kode', () => {
    const res = verifyAndSetTesterCode('FEILKODE');
    expect(res.success).toBe(false);
    expect(isTesterRoleActive()).toBe(false);
  });

  it('oppdaterer status og notater for et sjekklistepunkt', () => {
    const list = getTesterChecklist();
    expect(list.length).toBeGreaterThanOrEqual(5);

    const firstId = list[0].id;
    updateTesterChecklistItem(firstId, 'ok', 'Alt fungerte perfekt');

    const updatedList = getTesterChecklist();
    const updatedItem = updatedList.find((i) => i.id === firstId);
    expect(updatedItem?.status).toBe('ok');
    expect(updatedItem?.notes).toBe('Alt fungerte perfekt');
  });

  it('lagrer fri form tilbakemelding med automatisk enhetskontekst', () => {
    const fb = submitTesterFeedback({
      type: 'feilrapport',
      title: 'Lydfeil',
      feedbackText: 'Ingen lyd på øvelse 2',
      rating: 4,
      severity: 'middels',
      userName: 'Kari Tester',
    });

    expect(fb.id).toMatch(/^fb-/);
    expect(fb.type).toBe('feilrapport');
    expect(fb.feedbackText).toBe('Ingen lyd på øvelse 2');
    expect(fb.submittedByName).toBe('Kari Tester');
    expect(fb.deviceContext.appVersion).toBe('1.3.0');

    const all = getAllTesterFeedback();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(fb.id);
  });
});
