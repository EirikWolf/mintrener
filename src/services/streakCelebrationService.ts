/**
 * Persistens for feirede uke-streak-milepæler (spec § 2.1: kun feirede
 * milepæler persisteres — selve streaken er avledet). Hindrer gjentatt
 * konfetti for samme milepæl.
 */
const KEY = 'mintrener_streak_celebrated_v1';

function readCelebrated(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch { return []; }
}

export function getUncelebratedMilestones(reached: number[]): number[] {
  const done = new Set(readCelebrated());
  return reached.filter((m) => !done.has(m));
}

export function markMilestoneCelebrated(milestone: number): void {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...readCelebrated(), milestone])])); } catch { /* best effort */ }
}
