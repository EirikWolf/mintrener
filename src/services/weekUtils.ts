/**
 * Ukedefinisjonen for hele appen: mandag 00:00:00 LOKAL tid til søndag.
 * Samme semantikk som calculateWeeklyProgress alltid har hatt — trukket ut
 * hit slik at uke-streaken og ukesmålet aldri kan divergere.
 */
export function getWeekStart(d: Date): Date {
  const daysSinceMonday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday, 0, 0, 0, 0);
}

/** 'YYYY-MM-DD' for ukens mandag, i lokal tid (aldri toISOString — den er UTC). */
export function weekKey(d: Date): string {
  const m = getWeekStart(d);
  const mm = String(m.getMonth() + 1).padStart(2, '0');
  const dd = String(m.getDate()).padStart(2, '0');
  return `${m.getFullYear()}-${mm}-${dd}`;
}

export function addWeeksToKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return weekKey(new Date(y, m - 1, d + n * 7));
}
