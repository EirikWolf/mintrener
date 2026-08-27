/**
 * Calendar Export Service (.ics, Google Calendar, Outlook)
 * Genererer kalenderavtaler for utfordringer, faste treningsdager og programmer.
 */

import { ChallengeItem } from '../schemas/challengeSchema';

export interface CalendarEventOptions {
  title: string;
  description: string;
  startDate: Date;
  durationMinutes: number;
  location?: string;
  url?: string;
  recurrenceRule?: string; // f.eks. "FREQ=DAILY;COUNT=30"
}

/**
 * Formaterer en dato til UTC iCalendar format (YYYYMMDDTHHmmssZ)
 */
function formatIcsDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Genererer iCalendar (.ics) streng for én eller flere hendelser
 */
export function generateIcsContent(events: CalendarEventOptions[]): string {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Min Trener//mintrener.web.app//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ].join('\r\n');

  events.forEach((ev, idx) => {
    const startIso = formatIcsDate(ev.startDate);
    const endDate = new Date(ev.startDate.getTime() + ev.durationMinutes * 60 * 1000);
    const endIso = formatIcsDate(endDate);
    const nowIso = formatIcsDate(new Date());
    const uid = `mintrener-${Date.now()}-${idx}@mintrener.web.app`;

    const eventLines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowIso}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`,
      `URL:${ev.url || 'https://mintrener.web.app'}`,
      'STATUS:CONFIRMED',
    ];

    if (ev.recurrenceRule) {
      eventLines.push(`RRULE:${ev.recurrenceRule}`);
    }

    eventLines.push('END:VEVENT');
    ics += '\r\n' + eventLines.join('\r\n');
  });

  ics += '\r\nEND:VCALENDAR';
  return ics;
}

/**
 * Genererer en direkte Google Kalender lenke for en hendelse
 */
export function generateGoogleCalendarUrl(event: CalendarEventOptions): string {
  const startIso = formatIcsDate(event.startDate);
  const endDate = new Date(event.startDate.getTime() + event.durationMinutes * 60 * 1000);
  const endIso = formatIcsDate(endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    details: event.description,
    location: event.location || 'Min Trener (mintrener.web.app)',
    dates: `${startIso}/${endIso}`,
  });

  if (event.recurrenceRule) {
    params.append('recur', `RRULE:${event.recurrenceRule}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genererer en full kalenderplan for en 28- eller 30-dagers utfordring
 */
export function createChallengeIcs(
  challenge: ChallengeItem,
  startDate: Date = new Date(),
  timeOfDayHour: number = 11,
  timeOfDayMinute: number = 30
): string {
  const events: CalendarEventOptions[] = [];

  challenge.dailyWorkouts.forEach((day, index) => {
    if (day.isRestDay) return; // Hopper over hviledager i kalenderen

    const eventDate = new Date(startDate);
    eventDate.setDate(eventDate.getDate() + index);
    eventDate.setHours(timeOfDayHour, timeOfDayMinute, 0, 0);

    const title = `🔥 Min Trener: ${challenge.title} (Dag ${day.day})`;
    const description = `Dagens økt: ${day.title || challenge.title} (${day.goalNote || 'Fullfør dagens økt'}).\n\nÅpne appen: https://mintrener.web.app`;

    events.push({
      title,
      description,
      startDate: eventDate,
      durationMinutes: 5,
      url: 'https://mintrener.web.app',
    });
  });

  return generateIcsContent(events);
}

/**
 * Laster ned en .ics fil i nettleseren
 */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
