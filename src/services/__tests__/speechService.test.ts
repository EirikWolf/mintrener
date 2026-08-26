import { describe, it, expect, vi, beforeEach } from 'vitest';
import { speechService } from '../speechService';

describe('SpeechService (Norsk stemmeveiledning)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('kan aktivere og deaktivere stemmeveiledning', () => {
    speechService.setEnabled(false);
    expect(speechService.isEnabled()).toBe(false);

    speechService.setEnabled(true);
    expect(speechService.isEnabled()).toBe(true);
  });

  it('har metoder for å annonsere arbeid, pause, forberedelse og fullføring uten krasj', () => {
    expect(() => {
      speechService.announcePrepare('Knebøy');
      speechService.announceWork('Knebøy');
      speechService.announceRest('Push-ups');
      speechService.announceCountdown(3);
      speechService.announceComplete();
    }).not.toThrow();
  });
});
