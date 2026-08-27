import { describe, it, expect } from 'vitest';
import {
  generateIcsContent,
  generateGoogleCalendarUrl,
  createChallengeIcs,
} from '../calendarExportService';
import { STARTER_CHALLENGES } from '../../data/challenges';

describe('calendarExportService', () => {
  it('genererer gyldig iCalendar .ics format for et arrangement', () => {
    const startDate = new Date('2026-09-01T10:00:00Z');
    const ics = generateIcsContent([
      {
        title: 'Morgentrening',
        description: 'Enkel 5 minutters strekk',
        startDate,
        durationMinutes: 5,
      },
    ]);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Morgentrening');
    expect(ics).toContain('DTSTART:20260901T100000Z');
    expect(ics).toContain('DTEND:20260901T100500Z');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('genererer gyldig Google Calendar URL', () => {
    const startDate = new Date('2026-09-01T10:00:00Z');
    const url = generateGoogleCalendarUrl({
      title: 'Plankeøkt',
      description: 'Ta planken ved pulten',
      startDate,
      durationMinutes: 5,
    });

    expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
    expect(url).toContain('Planke%C3%B8kt');
  });

  it('genererer full .ics kalenderplan for 30-dagers utfordring (hopper over hviledager)', () => {
    const challenge = STARTER_CHALLENGES[0]; // Planke 30 dager
    const ics = createChallengeIcs(challenge, new Date('2026-09-01T08:00:00Z'), 11, 30);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain(challenge.title);
    // Utfordringen har 30 dager minus hviledager (f.eks. 4 hviledager = 26 VEVENT blokker)
    const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventCount).toBeGreaterThan(20);
  });
});
