import { describe, it, expect, vi, beforeEach } from 'vitest';
import { speechService, normalizeTextForSpeech } from '../speechService';

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

  it('har metoder for å annonsere arbeid, pause, forberedelse og fullføring med ulike stemmetoner', () => {
    expect(() => {
      speechService.announcePrepare('Froskehopp', 'lek');
      speechService.announceWork('Froskehopp', 'lek');
      speechService.announceRest('Bjørnegang', 'lek');
      speechService.announceCountdown(3);
      speechService.announceComplete('lek');

      speechService.announcePrepare('Knebøy', 'gira');
      speechService.announceWork('Knebøy', 'gira');
      speechService.announceRest('Push-ups', 'gira');
      speechService.announceComplete('gira');

      speechService.announcePrepare('Planke', 'tørr');
      speechService.announceWork('Planke', 'tørr');
      speechService.announceComplete('tørr');
    }).not.toThrow();
  });

  it('normaliserer engelske og vanskelige ord til naturlig norsk uttale', () => {
    expect(normalizeTextForSpeech('Gjør deg klar til Mountain climbers')).toContain('fjellklatrer');
    expect(normalizeTextForSpeech('Kjør Jumping jacks')).toContain('sprellmenn');
    expect(normalizeTextForSpeech('Gjør deg klar til push-ups')).toContain('armhevinger');
    expect(normalizeTextForSpeech('Bjørnegang')).toBe('bjørne gang');
  });
});
