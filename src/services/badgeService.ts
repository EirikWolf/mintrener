import { STARTER_CHALLENGES } from '../data/challenges';
import { getChallengeProgress } from './challengeService';
import { CompletedWorkoutLog } from '../types/models';

export type BadgeCategory = 'challenge' | 'streak' | 'milestone' | 'special';

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  progressLabel?: string;
}

export const MILESTONE_BADGE_DEFINITIONS: Array<Omit<BadgeItem, 'isUnlocked' | 'progress' | 'maxProgress' | 'unlockedAt'> & {
  maxProgress: number;
  check: (history: CompletedWorkoutLog[]) => { isUnlocked: boolean; progress: number; unlockedAt?: string };
}> = [
  {
    id: 'badge-first-workout',
    title: 'Første steg',
    description: 'Fullfør din aller første treningsøkt i Min Trener.',
    icon: '🌱',
    category: 'milestone',
    maxProgress: 1,
    check: (history) => ({
      isUnlocked: history.length >= 1,
      progress: Math.min(1, history.length),
      unlockedAt: history.length > 0 ? history[history.length - 1].completedAt : undefined,
    }),
  },
  {
    id: 'badge-workouts-10',
    title: 'Ti i boks',
    description: 'Gjennomfør 10 treningsøkter.',
    icon: '🥉',
    category: 'milestone',
    maxProgress: 10,
    check: (history) => ({
      isUnlocked: history.length >= 10,
      progress: Math.min(10, history.length),
      unlockedAt: history.length >= 10 ? history[9].completedAt : undefined,
    }),
  },
  {
    id: 'badge-workouts-50',
    title: 'Halvtreds',
    description: 'Gjennomfør 50 fullførte økter. Imponerende kontinuitet!',
    icon: '🥈',
    category: 'milestone',
    maxProgress: 50,
    check: (history) => ({
      isUnlocked: history.length >= 50,
      progress: Math.min(50, history.length),
      unlockedAt: history.length >= 50 ? history[49].completedAt : undefined,
    }),
  },
  {
    id: 'badge-workouts-100',
    title: 'Hundreklubben',
    description: '100 fullførte treningsøkter. Du er en sann hverdagshelt!',
    icon: '🥇',
    category: 'milestone',
    maxProgress: 100,
    check: (history) => ({
      isUnlocked: history.length >= 100,
      progress: Math.min(100, history.length),
      unlockedAt: history.length >= 100 ? history[99].completedAt : undefined,
    }),
  },
  {
    id: 'badge-streak-7',
    title: 'Ukeskriger',
    description: 'Tren 7 dager på rad uten avbrudd.',
    icon: '🔥',
    category: 'streak',
    maxProgress: 7,
    check: (history) => {
      const streak = calculateMaxStreak(history);
      return {
        isUnlocked: streak >= 7,
        progress: Math.min(7, streak),
      };
    },
  },
  {
    id: 'badge-streak-30',
    title: 'Månedsvane',
    description: '30 dagers ubrutt treningsglede.',
    icon: '🌟',
    category: 'streak',
    maxProgress: 30,
    check: (history) => {
      const streak = calculateMaxStreak(history);
      return {
        isUnlocked: streak >= 30,
        progress: Math.min(30, streak),
      };
    },
  },
  {
    id: 'badge-early-bird',
    title: 'Morgenfugl',
    description: 'Fullfør en økt før kl. 07:00 om morgenen.',
    icon: '🌅',
    category: 'special',
    maxProgress: 1,
    check: (history) => {
      const earlySession = history.find((s) => {
        const d = new Date(s.completedAt);
        return d.getHours() < 7;
      });
      return {
        isUnlocked: Boolean(earlySession),
        progress: earlySession ? 1 : 0,
        unlockedAt: earlySession?.completedAt,
      };
    },
  },
  {
    id: 'badge-night-owl',
    title: 'Nattkriger',
    description: 'Fullfør en økt etter kl. 21:00 på kvelden.',
    icon: '🦉',
    category: 'special',
    maxProgress: 1,
    check: (history) => {
      const nightSession = history.find((s) => {
        const d = new Date(s.completedAt);
        return d.getHours() >= 21;
      });
      return {
        isUnlocked: Boolean(nightSession),
        progress: nightSession ? 1 : 0,
        unlockedAt: nightSession?.completedAt,
      };
    },
  },
  {
    id: 'badge-all-categories',
    title: 'Allsidig Mester',
    description: 'Prøv økter fra minst 4 forskjellige kategorier (f.eks. Tabata, Styrke, Mobilitet, Kontor).',
    icon: '🎯',
    category: 'special',
    maxProgress: 4,
    check: (history) => {
      const types = new Set(history.map((s) => s.workoutType).filter(Boolean));
      return {
        isUnlocked: types.size >= 4,
        progress: Math.min(4, types.size),
      };
    },
  },
];

/**
 * Beregner lengste streak i dager
 */
export function calculateMaxStreak(history: CompletedWorkoutLog[]): number {
  if (history.length === 0) return 0;

  // Unike sorterte datoer (YYYY-MM-DD)
  const uniqueDates = Array.from(
    new Set(
      history.map((s) => {
        const d = new Date(s.completedAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    )
  ).sort();

  if (uniqueDates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diffTime = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Henter alle merker og beregner status mot lagret historikk og utfordringer
 */
export function getAllUserBadges(history?: CompletedWorkoutLog[]): BadgeItem[] {
  const workoutHistory: CompletedWorkoutLog[] =
    history || JSON.parse(localStorage.getItem('mintrener_workout_history') || '[]');

  const badges: BadgeItem[] = [];

  // 1. Utfordringsmerker (12 stk fra STARTER_CHALLENGES)
  for (const challenge of STARTER_CHALLENGES) {
    const prog = getChallengeProgress(challenge.id);
    const completedCount = prog.completedDays.length;
    const isUnlocked = completedCount >= challenge.durationDays;

    badges.push({
      id: challenge.badgeReward.id,
      title: challenge.badgeReward.name,
      description: `Fullfør alle ${challenge.durationDays} dagene i utfordringen «${challenge.title}».`,
      icon: challenge.badgeReward.icon,
      category: 'challenge',
      isUnlocked,
      progress: completedCount,
      maxProgress: challenge.durationDays,
      progressLabel: `${completedCount}/${challenge.durationDays} dager`,
      unlockedAt: isUnlocked && prog.completedAt ? prog.completedAt : undefined,
    });
  }

  // 2. Milepæl- og prestasjonsmerker
  for (const def of MILESTONE_BADGE_DEFINITIONS) {
    const res = def.check(workoutHistory);
    badges.push({
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      isUnlocked: res.isUnlocked,
      progress: res.progress,
      maxProgress: def.maxProgress,
      progressLabel: `${res.progress}/${def.maxProgress}`,
      unlockedAt: res.unlockedAt,
    });
  }

  return badges;
}
