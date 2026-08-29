/**
 * Persistens og visningslogikk for det utsatte konto-promptet (spec § 4):
 * anonyme brukere spørres ved gitte momenter, og en avvisning er varig
 * per moment — aldri mas.
 */
const KEY = 'mintrener_account_prompt_v1';

export type AccountPromptMoment = 'first_workout' | 'week2';

function readDismissed(): AccountPromptMoment[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((m): m is AccountPromptMoment => m === 'first_workout' || m === 'week2') : [];
  } catch { return []; }
}

export function shouldShowAccountPrompt(moment: AccountPromptMoment, ctx: { isLoggedIn: boolean }): boolean {
  if (ctx.isLoggedIn) return false;
  return !readDismissed().includes(moment);
}

export function dismissAccountPrompt(moment: AccountPromptMoment): void {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...readDismissed(), moment])])); } catch { /* best effort */ }
}
