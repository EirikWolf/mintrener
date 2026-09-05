import { ChallengeUserProgress } from '../schemas/challengeSchema';
import { STARTER_CHALLENGES } from '../data/challenges';

const ACTIVE_CHALLENGE_KEY = 'mintrener_active_challenge_id_v1';
const CHALLENGE_PROGRESS_PREFIX = 'mintrener_challenge_progress_';

/**
 * Henter ID for brukerens aktive utfordring (hvis noen)
 */
export function getActiveChallengeId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CHALLENGE_KEY);
  } catch (e) {
    console.error('Feil ved lesing av aktiv utfordring:', e);
    return null;
  }
}

/**
 * Setter eller fjerner aktiv utfordring
 */
export function setActiveChallengeId(challengeId: string | null): void {
  try {
    if (challengeId) {
      localStorage.setItem(ACTIVE_CHALLENGE_KEY, challengeId);
      // Sørg for at progress er initialisert
      const prog = getChallengeProgress(challengeId);
      if (!prog.startedAt) {
        prog.startedAt = new Date().toISOString();
        saveChallengeProgress(prog);
      }
    } else {
      localStorage.removeItem(ACTIVE_CHALLENGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('challenge-progress-changed', { detail: { challengeId } }));
  } catch (e) {
    console.error('Feil ved lagring av aktiv utfordring:', e);
  }
}

/**
 * Beregner fremdrift i en utfordring basert på inngangsgulv (startDay) og totalt antall dager.
 * Formel: fullførte dager >= startDay delt på (durationDays - startDay + 1).
 */
export function challengeProgressFraction(
  prog: ChallengeUserProgress,
  challengeOrDuration: { durationDays: number } | number
): {
  completedCount: number;
  totalCount: number;
  percent: number;
  isCompleted: boolean;
} {
  const durationDays =
    typeof challengeOrDuration === 'number'
      ? challengeOrDuration
      : challengeOrDuration.durationDays;
  const startDay = Math.max(1, prog.startDay || 1);
  const totalCount = Math.max(1, durationDays - startDay + 1);
  const completedFromFloor = (prog.completedDays || []).filter((d) => d >= startDay);
  const completedCount = completedFromFloor.length;
  const percent = Math.min(100, Math.round((completedCount / totalCount) * 100));
  const isCompleted = completedCount >= totalCount;

  return {
    completedCount,
    totalCount,
    percent,
    isCompleted,
  };
}

/**
 * Henter fremdrift for en gitt utfordring
 */
export function getChallengeProgress(challengeId: string): ChallengeUserProgress {
  try {
    const raw = localStorage.getItem(`${CHALLENGE_PROGRESS_PREFIX}${challengeId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        challengeId: parsed.challengeId || challengeId,
        startedAt: parsed.startedAt || new Date().toISOString(),
        completedDays: Array.isArray(parsed.completedDays) ? parsed.completedDays : [],
        currentDay: typeof parsed.currentDay === 'number' ? parsed.currentDay : 1,
        startDay: typeof parsed.startDay === 'number' ? parsed.startDay : 1,
        isCompleted: Boolean(parsed.isCompleted),
        completedAt: parsed.completedAt,
      };
    }
  } catch (e) {
    console.error('Feil ved lesing av challenge progress:', e);
  }

  return {
    challengeId,
    startedAt: new Date().toISOString(),
    completedDays: [],
    currentDay: 1,
    startDay: 1,
    isCompleted: false,
  };
}

/**
 * Lagrer fremdrift for en utfordring
 */
export function saveChallengeProgress(progress: ChallengeUserProgress): void {
  try {
    localStorage.setItem(
      `${CHALLENGE_PROGRESS_PREFIX}${progress.challengeId}`,
      JSON.stringify(progress)
    );
    window.dispatchEvent(
      new CustomEvent('challenge-progress-changed', { detail: { challengeId: progress.challengeId } })
    );
  } catch (e) {
    console.error('Feil ved lagring av challenge progress:', e);
  }
}

/**
 * Fullfører en dag i utfordringen uten straff/gjeldsdager ved bom (C.15)
 */
export function completeChallengeDay(challengeId: string, day: number): ChallengeUserProgress {
  const prog = getChallengeProgress(challengeId);
  const challenge = STARTER_CHALLENGES.find((c) => c.id === challengeId);
  const totalDays = challenge ? challenge.durationDays : 30;

  if (!prog.completedDays.includes(day)) {
    prog.completedDays.push(day);
    prog.completedDays.sort((a, b) => a - b);
  }

  // Finn neste ufullførte dag
  let nextDay = day + 1;
  while (prog.completedDays.includes(nextDay) && nextDay <= totalDays) {
    nextDay++;
  }
  prog.currentDay = Math.min(totalDays, nextDay);

  const fraction = challengeProgressFraction(prog, totalDays);
  if (fraction.isCompleted) {
    prog.isCompleted = true;
    prog.completedAt = prog.completedAt || new Date().toISOString();
  }

  saveChallengeProgress(prog);
  return prog;
}

/**
 * Tillater erfarne utøvere å starte på et høyere nivå / inngangsgulv (Revisjon C § 7 Horisont 3.1 & Pilar 4.4).
 * Setter startDay og currentDay, og forfalsker IKKE completedDays.
 */
export function startChallengeAtDay(challengeId: string, startDay: number): ChallengeUserProgress {
  const prog = getChallengeProgress(challengeId);
  const challenge = STARTER_CHALLENGES.find((c) => c.id === challengeId);
  const totalDays = challenge ? challenge.durationDays : 30;

  const validStartDay = Math.max(1, Math.min(startDay, totalDays));

  prog.startDay = validStartDay;
  prog.currentDay = validStartDay;
  prog.startedAt = prog.startedAt || new Date().toISOString();

  const fraction = challengeProgressFraction(prog, totalDays);
  if (fraction.isCompleted) {
    prog.isCompleted = true;
    prog.completedAt = prog.completedAt || new Date().toISOString();
  } else {
    prog.isCompleted = false;
    prog.completedAt = undefined;
  }

  saveChallengeProgress(prog);
  return prog;
}

/**
 * Nullstiller en utfordring
 */
export function resetChallengeProgress(challengeId: string): void {
  try {
    localStorage.removeItem(`${CHALLENGE_PROGRESS_PREFIX}${challengeId}`);
    window.dispatchEvent(
      new CustomEvent('challenge-progress-changed', { detail: { challengeId } })
    );
  } catch (e) {
    console.error('Feil ved nullstilling av challenge progress:', e);
  }
}
