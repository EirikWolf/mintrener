# C1/C2 — Uke-streak og onboarding: Implementasjonsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uke-streak (avledet av historikken, slinguke-forsikring, milepæler) flettet inn i ukesmål-pillen + førstegangs-onboarding med persona-lydprøver og ukesmål — per `docs/spec-c1c2-streak-onboarding-2026-08-29.md` (GODKJENT).

**Architecture:** All streak-logikk er rene funksjoner over eksisterende `CompletedWorkoutLog[]`-historikk (samme mønster som badgeService — avledet ved lesing, ingen synk-tilstand). UI-flatene er idle-grenen i TimerDisplay (pill + detaljark), WorkoutSummary (milepælsfeiring + konto-prompt) og en ny OnboardingFlow-gate i App.tsx. Telemetri = nytt flatfelts-dokument `global_stats/engagement` etter perf-mønsteret.

**Tech Stack:** React 18 + TS strict, Vitest + Testing Library (B4-mønsteret), Zod ved grensene, Firestore (telemetri), Playwright (e2e).

**Planpresiseringer mot spec-en** (avklart under planskriving, jf. spec § der nevnt):
1. **«ISO-uke»** implementeres som *mandag 00:00 lokal tid → søndag* — identisk med eksisterende `calculateWeeklyProgress` (`src/services/weeklyGoalService.ts:46-51`). ISO-ukenummer trengs aldri; kun ukestart-nøkler.
2. **Slinguke-banken avledes også** (spec § 2.1 sa «persisteres»): opptjening/forbruk simuleres deterministisk fra historikken i samme rene funksjon. Det gir retroaktiv korrekthet og fjerner en synk-tilstand. Kun *feirede milepæler* og *konto-prompt-avvisninger* persisteres.
3. **Ukesmål-endring** (spec § 2.1 «gjelder fra neste uke») krever en liten mållogg (`mintrener_weekly_goal_log_v1`) som `setWeeklyGoal` appender til; første ENDRING ankrer samtidig det GAMLE målet på inneværende ukenøkkel. Uker eldre enn loggens første linje dømmes etter FØRSTE linjes mål (historisk anker — en målheving skal aldri re-dømme fortiden og kollapse streak/bestWeeks retroaktivt); gjeldende mål brukes kun ved tom logg. *(Presisert i fix-løkke etter bølge 1-review, 2026-08-29.)* **FØRSTEGANGSVALG er ikke en endring:** når det ikke finnes lagret mål fra før (rått `localStorage.getItem('mintrener_weekly_goal') === null`, dvs. onboarding-scenarioet), ankres det NYE målet på INNEVÆRENDE ukenøkkel — en fersk bruker som velger 2 skal få første uke dømt etter 2, ikke etter default 3. «Fra neste uke»-regelen gjelder kun endring av et eksisterende mål. *(Fix-løkke etter bølge 3-review, 2026-08-29 — B1.)*
4. **«Start nå» i onboardingen** (spec § 3) blir «Til første økta» som lukker flyten med timeren + anbefalt program synlig; selve START-trykket er brukergesten som låser opp lyd (WebAudio-krav) — en auto-start ville gitt stum første fase. Én-trykks-avstanden består.
5. **Sameksistens med eksisterende `ProfileOnboardingModal`** (`src/App.tsx:206-215`): vår OnboardingFlow undertrykker profilmodalen mens den vises (`showOnboarding && !showWelcomeOnboarding`); profilmodalens egen logikk endres ikke.
6. **Profilmodalen utsettes til neste besøk** når velkomstflyten nettopp er fullført/hoppet over (in-memory `welcomeHandledThisSession`-state i App): «Til første økta» skal lande med timeren og START ett trykk unna — ikke bak enda en modal. Profilmodalen kommer ved neste app-åpning (staten nullstilles av seg selv). *(Fix-løkke etter bølge 3-review, 2026-08-29 — B2.)*

**Kjente farer for implementer:**
- `src/hooks/__tests__/useIntervalTimer.test.ts` (23 tester) og `src/components/timer/__tests__/TimerDisplay.test.tsx` (B4) skal være GRØNNE UENDRET etter hvert task.
- `setDoc(..., {merge:true})` splitter IKKE punktum-nøkler — bruk flate feltnavn eller nøstede kart (se `telemetryService.ts:164-177`).
- e2e-røyken (`e2e/smoke.spec.ts`) seeder localStorage i `addInitScript` (:39-48) — Task 10 MÅ utvide seeden, ellers blokkerer onboarding-gaten den (Task 12 gjør det, men Task 10 kjører røyken lokalt og må midlertidig forvente rødt der til Task 12; kjør derfor kun vitest i Task 10).
- En annen økt (chip-sesjon) kan parallelt endre localStorage-nøkkelhåndtering for historikk — bruk alltid `WORKOUT_HISTORY_KEY` fra `src/services/workoutHistoryStorage.ts:7`, aldri strengen direkte.

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/services/weekUtils.ts` (ny) | Ukestart/ukenøkkel (mandag-lokal) — én kilde |
| `src/services/weeklyGoalService.ts` (endres) | + mållogg og `getGoalForWeek` |
| `src/services/streakService.ts` (endres) | + `computeWeekStreak` (ren simulering) |
| `src/services/streakCelebrationService.ts` (ny) | Persistens: feirede milepæler |
| `src/services/accountPromptService.ts` (ny) | Persistens: konto-prompt-avvisninger + visningslogikk |
| `src/services/onboardingService.ts` (ny) | Trigger + fullført-flagg for OnboardingFlow |
| `src/services/telemetryService.ts` (endres) | + `global_stats/engagement`-tellere |
| `src/services/badgeService.ts` (endres) | + uke-streak-milepælbadges |
| `src/components/timer/TimerDisplay.tsx` (endres) | Pill med flamme; åpner detaljark |
| `src/components/streak/StreakDetailSheet.tsx` (ny) | Detaljark (serie, beste, slinguke, milepæl, ukesmål-stepper) |
| `src/components/timer/WorkoutSummary.tsx` (endres) | Milepælsfeiring + konto-prompt |
| `src/components/onboarding/OnboardingFlow.tsx` (ny) | 3-stegs førstegangs-flyt |
| `src/App.tsx` (endres) | OnboardingFlow-gate |
| `firestore.rules` (endres) | `global_stats/engagement`-block |
| `tests/rules/firestore.rules.test.ts` (endres) | Regeltester for engagement |
| `e2e/smoke.spec.ts` (endres) + `e2e/onboarding.spec.ts` (ny) | Seed-utvidelse + onboarding-røyk |

---

### Task 1: weekUtils — ukestart/ukenøkkel (én kilde)

**Files:**
- Create: `src/services/weekUtils.ts`
- Test: `src/services/__tests__/weekUtils.test.ts`
- Modify: `src/services/weeklyGoalService.ts:42-68` (refaktor til weekUtils — karakteriseringstest først)

- [ ] **Step 1: Karakteriseringstest på dagens `calculateWeeklyProgress`** (låser adferden FØR refaktor)

```ts
// src/services/__tests__/weekUtils.test.ts
import { describe, it, expect } from 'vitest';
import { getWeekStart, weekKey, addWeeksToKey } from '../weekUtils';
import { calculateWeeklyProgress } from '../weeklyGoalService';
import type { CompletedWorkoutLog } from '../../types/models';

function log(completedAt: string): CompletedWorkoutLog {
  return { id: `log-${completedAt}`, workoutName: 'x', completedAt, durationSeconds: 60, roundsCompleted: 1, totalRounds: 1, workoutType: 'hiit' } as CompletedWorkoutLog;
}

describe('calculateWeeklyProgress (karakterisering før refaktor)', () => {
  it('teller kun økter fra og med mandag 00:00 lokal tid', () => {
    // Torsdag 2026-01-08. Mandag samme uke = 2026-01-05.
    const now = new Date(2026, 0, 8, 12, 0, 0);
    const history = [
      log(new Date(2026, 0, 5, 0, 0, 1).toISOString()),  // mandag 00:00:01 — teller
      log(new Date(2026, 0, 4, 23, 59, 0).toISOString()), // søndag før — teller IKKE
    ];
    const res = calculateWeeklyProgress(history, 3, now);
    expect(res.completedThisWeek).toBe(1);
  });
});

describe('weekUtils', () => {
  it('getWeekStart gir mandag 00:00 lokal for alle ukedager', () => {
    // søndag 2026-01-04 → mandag 2025-12-29 (uke over nyttår!)
    expect(weekKey(new Date(2026, 0, 4, 15, 0))).toBe('2025-12-29');
    // mandag 2026-01-05 → seg selv
    expect(weekKey(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
    expect(getWeekStart(new Date(2026, 0, 8)).getDay()).toBe(1);
    expect(getWeekStart(new Date(2026, 0, 8)).getHours()).toBe(0);
  });
  it('addWeeksToKey går ±n uker', () => {
    expect(addWeeksToKey('2026-01-05', 1)).toBe('2026-01-12');
    expect(addWeeksToKey('2026-01-05', -1)).toBe('2025-12-29');
  });
});
```

Merk: `calculateWeeklyProgress` har i dag ikke `now`-parameter — legg den til som valgfri tredje parameter (default `new Date()`) i Step 3; karakteriseringstesten skrives mot den nye signaturen og er rød til da.

- [ ] **Step 2: Kjør — forvent rødt** (`npx vitest run src/services/__tests__/weekUtils.test.ts` → FAIL: modul finnes ikke / signatur mangler)
- [ ] **Step 3: Implementer**

```ts
// src/services/weekUtils.ts
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
```

I `weeklyGoalService.ts`: erstatt linjene 46–51 med `const mondayStartTime = getWeekStart(now).getTime();` der `now` er ny valgfri parameter `now: Date = new Date()`; importer fra `./weekUtils`. Ingen andre endringer i funksjonen.

- [ ] **Step 4: Kjør weekUtils-testen grønn + hele suiten** (`npx vitest run` — de tre eksisterende forbrukerne av `calculateWeeklyProgress` skal være uberørt grønne)
- [ ] **Step 5: Commit** — `feat(streak): weekUtils med felles mandag-lokal ukedefinisjon`

---

### Task 2: Mållogg — `getGoalForWeek`

**Files:**
- Modify: `src/services/weeklyGoalService.ts`
- Test: `src/services/__tests__/weeklyGoalService.test.ts` (ny fil)

- [ ] **Step 1: Rød test**

```ts
// src/services/__tests__/weeklyGoalService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setWeeklyGoal, getWeeklyGoal, getGoalForWeek } from '../weeklyGoalService';
import { weekKey, addWeeksToKey } from '../weekUtils';

beforeEach(() => { localStorage.clear(); vi.useRealTimers(); });

describe('getGoalForWeek', () => {
  it('uten logg: alle uker dømmes etter gjeldende mål', () => {
    expect(getGoalForWeek('2026-01-05')).toBe(getWeeklyGoal());
  });
  it('endring gjelder fra NESTE uke (spec § 2.1)', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 0, 7)); // onsdag, uke 2026-01-05
    setWeeklyGoal(5);
    expect(getGoalForWeek(weekKey(new Date(2026, 0, 7)))).toBe(3);         // inneværende: gammelt mål
    expect(getGoalForWeek(addWeeksToKey(weekKey(new Date(2026, 0, 7)), 1))).toBe(5); // neste: nytt
  });
  it('flere endringer: siste logglinje med weekKey <= spurt uke vinner', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7)); setWeeklyGoal(5);
    vi.setSystemTime(new Date(2026, 0, 20)); setWeeklyGoal(2);
    expect(getGoalForWeek('2026-01-12')).toBe(5);
    expect(getGoalForWeek('2026-02-02')).toBe(2);
  });
  it('korrupt logg → fallback til gjeldende mål, ingen kræsj', () => {
    localStorage.setItem('mintrener_weekly_goal_log_v1', '{{{');
    expect(getGoalForWeek('2026-01-05')).toBe(getWeeklyGoal());
  });
});
```

- [ ] **Step 2: Kjør — rødt** (getGoalForWeek finnes ikke)
- [ ] **Step 3: Implementer** i `weeklyGoalService.ts`:

```ts
const GOAL_LOG_KEY = 'mintrener_weekly_goal_log_v1';
type GoalLogEntry = { weekKey: string; goal: number };

function readGoalLog(): GoalLogEntry[] {
  try {
    const raw = localStorage.getItem(GOAL_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is GoalLogEntry =>
      typeof e?.weekKey === 'string' && typeof e?.goal === 'number');
  } catch { return []; }
}

/** Målet som gjaldt ved gitt ukestart. Uker eldre enn loggens første linje: første linjes mål (historisk anker); gjeldende mål kun ved tom logg. */
export function getGoalForWeek(targetWeekKey: string): number {
  const applicable = readGoalLog()
    .filter((e) => e.weekKey <= targetWeekKey)  // 'YYYY-MM-DD' sorterer leksikalsk = kronologisk
    .sort((a, b) => (a.weekKey < b.weekKey ? -1 : 1));
  return applicable.length > 0 ? applicable[applicable.length - 1].goal : getWeeklyGoal();
}
```

Og i `setWeeklyGoal` (etter dagens skriv, :30-37): append `{ weekKey: addWeeksToKey(weekKey(new Date()), 1), goal: clamped }` til loggen (les → push → `JSON.stringify` → skriv, try/catch rundt). Importer `weekKey, addWeeksToKey` fra `./weekUtils`.

- [ ] **Step 4: Grønn + full suite grønn**
- [ ] **Step 5: Commit** — `feat(streak): maallogg — ukesmaal-endring gjelder fra neste uke`

---

### Task 3: `computeWeekStreak` — kjernen

**Files:**
- Modify: `src/services/streakService.ts` (eksisterende `computeStreakDays` beholdes urørt)
- Test: `src/services/__tests__/streakService.week.test.ts` (ny)

- [ ] **Step 1: Rød test** (dette er fasit-oppførselen — vær nøye)

```ts
// src/services/__tests__/streakService.week.test.ts
import { describe, it, expect } from 'vitest';
import { computeWeekStreak, WEEK_STREAK_MILESTONES } from '../streakService';
import type { CompletedWorkoutLog } from '../../types/models';

function log(y: number, m: number, d: number): CompletedWorkoutLog {
  return { id: `l-${y}-${m}-${d}-${Math.random()}`, workoutName: 'x',
    completedAt: new Date(y, m - 1, d, 12).toISOString(),
    durationSeconds: 60, roundsCompleted: 1, totalRounds: 1, workoutType: 'hiit' } as CompletedWorkoutLog;
}
/** n økter i uka som starter mandag (y,m,d) */
function week(y: number, m: number, d: number, n: number): CompletedWorkoutLog[] {
  return Array.from({ length: n }, (_, i) => log(y, m, d + (i % 7)));
}
const goal3 = () => 3;
// «nå» = onsdag 2026-03-18; forrige uke starter man 2026-03-09, inneværende man 2026-03-16
const NOW = new Date(2026, 2, 18);

describe('computeWeekStreak', () => {
  it('tom historikk → 0, tom bank, ingen milepæler', () => {
    const r = computeWeekStreak([], goal3, NOW);
    expect(r).toMatchObject({ currentWeeks: 0, bestWeeks: 0, insuranceInBank: 0,
      currentWeekCompleted: false, reachedMilestones: [] });
  });
  it('to fullførte uker t.o.m. forrige uke → 2, milepæl 2 nådd', () => {
    const h = [...week(2026, 3, 2, 3), ...week(2026, 3, 9, 3)];
    const r = computeWeekStreak(h, goal3, NOW);
    expect(r.currentWeeks).toBe(2);
    expect(r.reachedMilestones).toEqual([2]);
  });
  it('inneværende uke ØKER når målet er nådd, men kan aldri BRYTE', () => {
    const base = [...week(2026, 3, 2, 3), ...week(2026, 3, 9, 3)];
    // inneværende uke uten økter: fortsatt 2 (ikke brudd før mandag)
    expect(computeWeekStreak(base, goal3, NOW).currentWeeks).toBe(2);
    // inneværende uke med mål nådd: 3
    const r = computeWeekStreak([...base, ...week(2026, 3, 16, 3)], goal3, NOW);
    expect(r.currentWeeks).toBe(3);
    expect(r.currentWeekCompleted).toBe(true);
  });
  it('slinguke: opptjenes etter 4 fullførte uker (maks 1), forbrukes automatisk på én røket uke — serien STÅR, teller ikke +1', () => {
    // uke 1-4 fullført (opptjener 1), uke 5 røket (forsikres — serien bevares uendret),
    // uke 6 fullført → streak 5 (produkteiers valg 2026-08-29: forsikret uke teller ikke)
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      /* uke 2026-02-02: 0 økter */ ...week(2026, 2, 9, 3),
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 18)); // ons i uka etter 2026-02-09
    expect(r.currentWeeks).toBe(5);
    expect(r.bestWeeks).toBe(5);
    expect(r.insuranceInBank).toBe(0);
    expect(r.insuranceUsedWeekKeys).toEqual(['2026-02-02']);
  });
  it('to røkne uker på rad med tom bank etter første → brudd; beste serie huskes', () => {
    const h = [
      ...week(2026, 1, 5, 3), ...week(2026, 1, 12, 3), ...week(2026, 1, 19, 3), ...week(2026, 1, 26, 3),
      /* 02-02: røket (forsikret), 02-09: røket (bank tom → brudd) */
      ...week(2026, 2, 16, 3),
    ];
    const r = computeWeekStreak(h, goal3, new Date(2026, 1, 25));
    expect(r.currentWeeks).toBe(1);   // kun 2026-02-16-uka
    expect(r.bestWeeks).toBe(4);      // 4 faktiske treningsuker; forsikret uke teller ikke
  });
  it('uker FØR første økt noensinne teller ikke som brudd', () => {
    const h = week(2026, 3, 9, 3); // første og eneste uke = forrige uke
    expect(computeWeekStreak(h, goal3, NOW).currentWeeks).toBe(1);
  });
  it('målendring per uke respekteres via goalForWeek-callback', () => {
    const goals: Record<string, number> = { '2026-03-02': 5, '2026-03-09': 2 };
    const h = [...week(2026, 3, 2, 3), ...week(2026, 3, 9, 3)]; // 3 økter begge uker
    const r = computeWeekStreak(h, (k) => goals[k] ?? 3, NOW);
    // uke 03-02 krevde 5 → røket (ingen bank å bruke); uke 03-09 krevde 2 → fullført
    expect(r.currentWeeks).toBe(1);
  });
  it('nyttårsuke håndteres (mandag 2025-12-29 dekker t.o.m. 2026-01-04)', () => {
    const h = [log(2025, 12, 30), log(2026, 1, 2), log(2026, 1, 4)]; // 3 økter i SAMME uke
    const r = computeWeekStreak(h, goal3, new Date(2026, 0, 7)); // ons uka etter
    expect(r.currentWeeks).toBe(1);
  });
  it('milepælslisten er [2,4,8,12,26,52]', () => {
    expect([...WEEK_STREAK_MILESTONES]).toEqual([2, 4, 8, 12, 26, 52]);
  });
});
```

- [ ] **Step 2: Kjør — rødt**
- [ ] **Step 3: Implementer** i `streakService.ts` (behold `computeStreakDays` uendret over):

```ts
import { weekKey, addWeeksToKey } from './weekUtils';
import type { CompletedWorkoutLog } from '../types/models';

export const WEEK_STREAK_MILESTONES = [2, 4, 8, 12, 26, 52] as const;

export interface WeekStreakResult {
  /** Sammenhengende fullførte uker t.o.m. forrige uke, +1 hvis inneværende alt er nådd. */
  currentWeeks: number;
  bestWeeks: number;
  insuranceInBank: 0 | 1;
  insuranceUsedWeekKeys: string[];
  currentWeekCompleted: boolean;
  /** Milepæler (fra WEEK_STREAK_MILESTONES) som currentWeeks har nådd. */
  reachedMilestones: number[];
}

/**
 * Ren simulering fra første uke med historikk til og med inneværende uke.
 * Regler (spec § 2.1 + planpresisering 2):
 *  - Fullført uke = antall økter i uka >= goalForWeek(ukenøkkel).
 *  - 1 slinguke opptjenes per 4. PÅFØLGENDE fullførte uke, maks 1 i banken.
 *  - Røket uke forbruker bank automatisk: serien BEVARES uendret (teller ikke +1;
 *    produkteiers valg 2026-08-29); tom bank → nullstill.
 *  - Inneværende uke kan øke (hvis alt fullført) men aldri bryte.
 */
export function computeWeekStreak(
  history: CompletedWorkoutLog[],
  goalForWeek: (wk: string) => number,
  now: Date = new Date()
): WeekStreakResult {
  const perWeek = new Map<string, number>();
  for (const log of history) {
    const wk = weekKey(new Date(log.completedAt));
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }
  const currentWk = weekKey(now);
  if (perWeek.size === 0) {
    return { currentWeeks: 0, bestWeeks: 0, insuranceInBank: 0,
      insuranceUsedWeekKeys: [], currentWeekCompleted: false, reachedMilestones: [] };
  }
  const firstWk = [...perWeek.keys()].sort()[0];

  let streak = 0, best = 0, bank: 0 | 1 = 0, consecutiveSinceEarn = 0;
  const used: string[] = [];
  for (let wk = firstWk; wk < currentWk; wk = addWeeksToKey(wk, 1)) {
    const completed = (perWeek.get(wk) ?? 0) >= goalForWeek(wk);
    if (completed) {
      streak += 1;
      consecutiveSinceEarn += 1;
      if (consecutiveSinceEarn >= 4) { bank = 1; consecutiveSinceEarn = 0; }
    } else if (bank === 1) {
      // Produkteiers valg 2026-08-29: bevarer uten å telle — milepæler nås kun av faktiske treningsuker.
      bank = 0; used.push(wk); consecutiveSinceEarn = 0;
    } else {
      streak = 0; consecutiveSinceEarn = 0;
    }
    best = Math.max(best, streak);
  }
  const currentWeekCompleted = (perWeek.get(currentWk) ?? 0) >= goalForWeek(currentWk);
  const currentWeeks = streak + (currentWeekCompleted ? 1 : 0);
  best = Math.max(best, currentWeeks);
  return {
    currentWeeks, bestWeeks: best, insuranceInBank: bank,
    insuranceUsedWeekKeys: used, currentWeekCompleted,
    reachedMilestones: WEEK_STREAK_MILESTONES.filter((m) => currentWeeks >= m),
  };
}
```

- [ ] **Step 4: Grønn + full suite**
- [ ] **Step 5: Commit** — `feat(streak): computeWeekStreak — avledet uke-streak med slinguke-simulering`

---

### Task 4: Persistens — feirede milepæler og konto-prompt

**Files:**
- Create: `src/services/streakCelebrationService.ts`, `src/services/accountPromptService.ts`
- Test: `src/services/__tests__/streakCelebrationService.test.ts`, `src/services/__tests__/accountPromptService.test.ts`

- [ ] **Step 1: Røde tester**

```ts
// src/services/__tests__/streakCelebrationService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getUncelebratedMilestones, markMilestoneCelebrated } from '../streakCelebrationService';

beforeEach(() => localStorage.clear());
describe('streakCelebrationService', () => {
  it('nye milepæler er ufeirede; markering er varig; korrupt lagring → alt regnes ufeiret', () => {
    expect(getUncelebratedMilestones([2, 4])).toEqual([2, 4]);
    markMilestoneCelebrated(2);
    expect(getUncelebratedMilestones([2, 4])).toEqual([4]);
    localStorage.setItem('mintrener_streak_celebrated_v1', 'not-json');
    expect(getUncelebratedMilestones([2])).toEqual([2]);
  });
});
```

```ts
// src/services/__tests__/accountPromptService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { shouldShowAccountPrompt, dismissAccountPrompt } from '../accountPromptService';

beforeEach(() => localStorage.clear());
describe('accountPromptService', () => {
  it('vises kun for anonym bruker og kun til avvist, per moment', () => {
    expect(shouldShowAccountPrompt('first_workout', { isLoggedIn: false })).toBe(true);
    expect(shouldShowAccountPrompt('first_workout', { isLoggedIn: true })).toBe(false);
    dismissAccountPrompt('first_workout');
    expect(shouldShowAccountPrompt('first_workout', { isLoggedIn: false })).toBe(false);
    expect(shouldShowAccountPrompt('week2', { isLoggedIn: false })).toBe(true); // uavhengige momenter
  });
});
```

- [ ] **Step 2: Kjør — rødt**
- [ ] **Step 3: Implementer**

```ts
// src/services/streakCelebrationService.ts
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
```

```ts
// src/services/accountPromptService.ts
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
```

- [ ] **Step 4: Grønn + full suite**
- [ ] **Step 5: Commit** — `feat(streak): persistens for feirede milepaler og konto-prompt-avvisning`

---

### Task 5: Telemetri — `global_stats/engagement` + rules

**Files:**
- Modify: `src/services/telemetryService.ts`, `firestore.rules` (nytt block etter `perf`-blocket som slutter `:229`)
- Test: `src/services/__tests__/telemetryService.test.ts` (utvid), `tests/rules/firestore.rules.test.ts` (utvid)

**Feltmodell (FLATE feltnavn — unngår nested-map-kompleksitet i rules; jf. `telemetryService.ts:164-167`):** dokument `global_stats/engagement` med tellere (alle increment-på-1) fra denne uttømmende listen + `lastUpdated`:
`onboarding_started`, `onboarding_personaChosen_haugesund`, `onboarding_personaChosen_romsdal`, `onboarding_personaChosen_hardcore`, `onboarding_personaChosen_boyband`, `onboarding_personaChosen_standard`, `onboarding_goalSet`, `onboarding_firstWorkoutStarted`, `onboarding_skipped`, `streak_weekCompleted`, `streak_insuranceUsed`, `streak_broken`, `streak_milestone_w2`, `streak_milestone_w4`, `streak_milestone_w8`, `streak_milestone_w12`, `streak_milestone_w26`, `streak_milestone_w52`, `accountPrompt_first_workout_shown`, `accountPrompt_first_workout_accepted`, `accountPrompt_first_workout_dismissed`, `accountPrompt_week2_shown`, `accountPrompt_week2_accepted`, `accountPrompt_week2_dismissed`.

- [ ] **Step 1: Rød vitest** (mock firestore som i eksisterende telemetryService-tester — se den fila for mønsteret):

```ts
// legg i src/services/__tests__/telemetryService.test.ts (følg filens eksisterende mock-oppsett)
it('recordEngagementEvent skriver flatt increment-felt + lastUpdated til global_stats/engagement', async () => {
  await recordEngagementEvent('onboarding_personaChosen_haugesund');
  // assert på setDoc-mocken: doc(db,'global_stats','engagement'),
  // payload { onboarding_personaChosen_haugesund: increment(1), lastUpdated: serverTimestamp() }, { merge: true }
});
it('recordEngagementEvent gjør ingenting uten samtykke', async () => {
  setTelemetryConsent(false);
  await recordEngagementEvent('streak_broken');
  // assert: setDoc IKKE kalt
});
```

- [ ] **Step 2: Kjør — rødt**
- [ ] **Step 3: Implementer** i `telemetryService.ts` (etter `recordShareLinkOpen`-mønsteret `:55-69`):

```ts
export type EngagementCounter =
  | 'onboarding_started' | 'onboarding_goalSet' | 'onboarding_firstWorkoutStarted' | 'onboarding_skipped'
  | `onboarding_personaChosen_${'haugesund' | 'romsdal' | 'hardcore' | 'boyband' | 'standard'}`
  | 'streak_weekCompleted' | 'streak_insuranceUsed' | 'streak_broken'
  | `streak_milestone_w${2 | 4 | 8 | 12 | 26 | 52}`
  | `accountPrompt_${'first_workout' | 'week2'}_${'shown' | 'accepted' | 'dismissed'}`;

export async function recordEngagementEvent(counter: EngagementCounter): Promise<void> {
  if (!getTelemetryConsent()) return;
  try {
    const ref = doc(db, 'global_stats', 'engagement');
    await setDoc(ref, { [counter]: increment(1), lastUpdated: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Kunne ikke sende engagement-telemetri:', err);
  }
}
```

- [ ] **Step 4: firestore.rules** — nytt block ETTER perf-blocket (`:197-229`), samme mønster (allowlist + `counterInitOk`/`counterDeltaOk` med maxDelta 1 + `lastUpdated == request.time`); allowlisten er den uttømmende feltlisten over + `lastUpdated`. Kopiér perf-blockets struktur, bytt feltnavn.
- [ ] **Step 5: Rules-tester** i `tests/rules/firestore.rules.test.ts` (følg eksisterende testers form): (a) unauth increment-på-1 av `streak_weekCompleted` på eksisterende doc → ALLOW; (b) increment-på-2 → DENY; (c) ukjent felt `hacker_field` → DENY; (d) create med gyldig init → ALLOW.
- [ ] **Step 6: Kjør** `npx vitest run src/services/__tests__/telemetryService.test.ts` grønn; `npm run test:rules` grønn (krever Java/emulator — hvis utilgjengelig lokalt: noter det, CI dekker).
- [ ] **Step 7: Commit** — `feat(telemetri): global_stats/engagement-tellere med rules og tester`

---

### Task 6: Pill med flamme (TimerDisplay idle-gren)

**Files:**
- Modify: `src/components/timer/TimerDisplay.tsx` (pillen `:529-554`, state-effekten `:213-226`)
- Test: `src/components/timer/__tests__/TimerDisplay.streak.test.tsx` (NY fil — IKKE rør B4-fila `TimerDisplay.test.tsx`)

- [ ] **Step 1: Rød test** (kopier mock-oppsettet fra `TimerDisplay.test.tsx:9-123` — firebase/AuthContext/bluetooth-mocks, `makeState`/`makeHandlers`/`renderDisplay`; `beforeEach` med `localStorage.clear()`):

```tsx
// Sentrale asserts (idle-gren):
it('viser flamme + uketall når streaken er ≥ 1', () => {
  seedHistoryWithCompletedWeeks(2); // hjelper: skriv CompletedWorkoutLog[] til WORKOUT_HISTORY_KEY med 3 økter i hver av de to foregående ukene
  renderDisplay();
  expect(screen.getByText(/2 uker/)).toBeInTheDocument();
  expect(screen.getByLabelText('2 ukers streak')).toBeInTheDocument(); // UU: tekstalternativ
});
it('viser INGEN flamme ved 0 streak (ingen «0 uker»-skam)', () => {
  renderDisplay();
  expect(screen.queryByText(/uker/)).not.toBeInTheDocument();
  expect(screen.getByText(/Ukesmål:/)).toBeInTheDocument(); // pillen ellers uendret
});
it('trykk på pillen åpner streak-detaljarket', () => {
  seedHistoryWithCompletedWeeks(2);
  renderDisplay();
  fireEvent.click(screen.getByRole('button', { name: /streak og ukesmål/i }));
  expect(screen.getByRole('dialog', { name: /din streak/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Kjør — rødt**
- [ ] **Step 3: Implementer.** I effekten `:215-226`: kall også `computeWeekStreak(hist, getGoalForWeek)` og legg resultatet i ny state `weekStreak`. Pillen (`:529-554`): gjør hele pillen til `<button>` med `aria-label="Streak og ukesmål — åpne detaljer"`; foran «Ukesmål:»-teksten, når `weekStreak.currentWeeks >= 1`:

```tsx
<span aria-label={`${weekStreak.currentWeeks} ukers streak`} className="text-amber-400 font-semibold">
  🔥 {weekStreak.currentWeeks} uker
</span>
<span className="text-zinc-600">·</span>
```

Detaljarket monteres i Task 7 — i dette tasket: `onClick` setter `showStreakSheet`-state og rendrer `<StreakDetailSheet ...>` (som Task 7 lager; lag i dette tasket et minimalt skall `src/components/streak/StreakDetailSheet.tsx` med `role="dialog"` + `aria-label="Din streak"` + lukkeknapp, så testen over blir grønn — Task 7 fyller den).
- [ ] **Step 4: Grønn + kritisk: `npx vitest run src/components/timer/__tests__/TimerDisplay.test.tsx src/hooks/__tests__/useIntervalTimer.test.ts` — begge UENDRET grønne**
- [ ] **Step 5: Commit** — `feat(streak): flamme i ukesmaal-pillen + dialog-skall (valg A)`

---

### Task 7: StreakDetailSheet

**Files:**
- Modify: `src/components/streak/StreakDetailSheet.tsx` (fyll skallet fra Task 6)
- Test: `src/components/streak/__tests__/StreakDetailSheet.test.tsx`

Modell: `CoachPersonaModal.tsx:58-87` (overlay/panel/header/X) + Escape-lukking fra `ProfileOnboardingModal.tsx:71-77`.

- [ ] **Step 1: Rød test** — props `{ streak: WeekStreakResult; onClose: () => void }`; asserts:
  - viser «Nåværende serie: 4 uker», «Beste serie: 9 uker»
  - slinguke-status: bank 1 → «1 slinguke på lager»; bank 0 → «Opptjenes etter 4 fulle uker»
  - neste milepæl: currentWeeks 4 → «Neste milepæl: 8 uker»
  - ukesmål-stepper til stede (gjenbruk mønsteret fra `SettingsMoreView.tsx:333-357`: −/+ som kaller `setWeeklyGoal`), og endring vises («Gjelder fra neste uke»)
  - Escape og X kaller `onClose`
- [ ] **Step 2: Rødt → Step 3: Implementer** (tekstene ordrett fra spec § 2.2: fremover-rettet, aldri anklagende)
- [ ] **Step 4: Grønn + full suite**
- [ ] **Step 5: Commit** — `feat(streak): detaljark med serie, slinguke, milepæl og ukesmaal-justering`

---### Task 8: Milepælbadges (badgeService)

**Files:**
- Modify: `src/services/badgeService.ts` (`MILESTONE_BADGE_DEFINITIONS` `:21-160`)
- Test: `src/services/__tests__/badgeService.week.test.ts` (ny)

- [ ] **Step 1: Rød test** — for hver av uke-milepælene 2/4/8/12/26/52: `getAllUserBadges(history)` inneholder badge `badge-week-streak-<n>` med `isUnlocked` korrekt gitt seedet historikk (bruk `week()`-hjelperen fra Task 3-testen); progress = min(currentWeeks, n).
- [ ] **Step 2: Rødt → Step 3:** Seks nye definisjoner i `MILESTONE_BADGE_DEFINITIONS` med `category: 'streak'`, `check: (history) => { const r = computeWeekStreak(history, getGoalForWeek); return { isUnlocked: r.currentWeeks >= N || r.bestWeeks >= N, progress: Math.min(r.bestWeeks, N) }; }` — merk: badges skal ikke «låses opp igjen» ved brudd, derfor `bestWeeks`. Titler (støttende tone): w2 «To uker sterk», w4 «Månedsrytme», w8 «Åtte uker på rad», w12 «Kvartalsvane», w26 «Halvår i boks», w52 «Ett helt år».
- [ ] **Step 4: Grønn + full suite → Step 5: Commit** — `feat(streak): uke-milepaelbadges (avledet, bestWeeks-laast)`

---

### Task 9: WorkoutSummary — milepælsfeiring + konto-prompt

**Files:**
- Modify: `src/components/timer/WorkoutSummary.tsx` (feiring etter PR-banneret `:120-125`; konto-prompt mellom `:234` og `:237`)
- Test: `src/components/timer/__tests__/WorkoutSummary.streak.test.tsx` (ny)

- [ ] **Step 1: Rød test** (mock firebase + AuthContext etter B4-mønsteret; mock `telemetryService.recordEngagementEvent` og assert kall):
  - historikk seedet så DENNE økta fullførte uka og nådde milepæl 2 → feiringsbanner «🔥 2 uker på rad — milepæl nådd!» vises, `recordEngagementEvent('streak_milestone_w2')` kalt, `markMilestoneCelebrated(2)` persistert (re-render viser IKKE banneret igjen)
  - milepæl alt feiret → intet banner
  - anonym + første fullførte økt (historikk-lengde 1) → konto-prompt med tekst fra spec § 4 («Vil du ta vare på fremgangen din …»), knapp «Lagre med konto» kaller `signInWithGoogle` + `recordEngagementEvent('accountPrompt_first_workout_accepted')`; «Ikke nå» kaller `dismissAccountPrompt` + dismissed-telemetri; innlogget bruker ser aldri prompten
  - uke-2-feiring + anonym → week2-prompt («… sikre serien med en konto?»); first_workout-prompten vises IKKE samtidig (week2 vinner når begge er aktuelle)
- [ ] **Step 2: Rødt → Step 3: Implementer.** Gjenbruk eksisterende effekt `:57-75` (den re-kjører på `workoutLogId`): utvid med `computeWeekStreak` + `getUncelebratedMilestones`; feiringsbanner etter PR-bannerets visuelle mønster (`:120-125`); `streak_weekCompleted`-telemetri når denne øktas uke akkurat ble fullført (`currentWeekCompleted` gikk fra false → true: beregn også streak UTEN siste logg for å avgjøre). Konto-prompt som egen liten intern komponent i fila (holder WorkoutSummary lesbar), gated på `!user && shouldShowAccountPrompt(...)`; `shown`-telemetri i mount-effekt.
- [ ] **Step 4: Grønn + full suite → Step 5: Commit** — `feat(streak): milepaelsfeiring og utsatt konto-prompt i fullfoert-skjermen`

---

### Task 10: OnboardingFlow

**Files:**
- Create: `src/services/onboardingService.ts`, `src/components/onboarding/OnboardingFlow.tsx`
- Modify: `src/App.tsx` (gate ved `:206-215`-mønsteret; se planpresisering 5)
- Test: `src/services/__tests__/onboardingService.test.ts`, `src/components/onboarding/__tests__/OnboardingFlow.test.tsx`

- [ ] **Step 1: Rød service-test:**

```ts
// shouldShowOnboarding(): true kun når ALLE tre: ikke fullført-flagg, ingen lagret persona (rå nøkkel!), tom historikk
it('trigges kun for helt ferske brukere', () => {
  expect(shouldShowOnboarding()).toBe(true);
  localStorage.setItem('mintrener_coach_persona', 'standard');
  expect(shouldShowOnboarding()).toBe(false);
});
it('markOnboardingDone er varig', () => {
  markOnboardingDone();
  expect(shouldShowOnboarding()).toBe(false);
});
```

Implementasjon: nøkkel `mintrener_onboarding_v1` (`{ completedAt: string }`); persona-sjekken bruker `localStorage.getItem('mintrener_coach_persona') === null` — IKKE `getActiveCoachPersona()` (den returnerer 'standard' som default og kan ikke skille «valgt standard» fra «aldri valgt»). Historikk via `readLocalHistory`-ekvivalent: `localStorage.getItem(WORKOUT_HISTORY_KEY) === null` er tilstrekkelig (import konstanten).

- [ ] **Step 2: Rød komponent-test** (mock `coachPersonaService` med `importOriginal`-mønsteret fra `CoachPersonaModal.test.tsx:12-22` — behold `COACH_PERSONAS`, mock `playPersonaPreview`/`setActiveCoachPersona`; mock `telemetryService`):
  - steg 1 viser alle 4 personaer + nedtonet «Astrid (Standard)»; ▶-trykk på Jossa kaller `playPersonaPreview('haugesund')`; valg + «Videre» kaller `setActiveCoachPersona('haugesund')` og `recordEngagementEvent('onboarding_personaChosen_haugesund')`
  - steg 2: 2/3/4+-valg (3 forhåndsvalgt), «Tilpass» viser talljustering; «Videre» kaller `setWeeklyGoal` + `onboarding_goalSet`-telemetri; undertekst «Dette blir ukesmålet ditt — og grunnlaget for streaken din.»
  - steg 3: «Klar for første økt?» + primærknapp «Til første økta» → `markOnboardingDone()` + `onboarding_firstWorkoutStarted` + `onComplete()`-callback
  - «Hopp over» (finnes på alle steg) → defaults (standard-persona settes IKKE aktivt — bare `markOnboardingDone`), `onboarding_skipped`, `onComplete()`
  - mount fyrer `onboarding_started` (én gang)
- [ ] **Step 3: Rødt → Step 4: Implementer.** Fullskjerms-overlay etter `ProfileOnboardingModal`-mønsteret (`fixed inset-0`, men egen `z-[60]` så den ligger over profilmodalen om begge skulle rendre); persona-rutenett per mockup-valg A (kort med navn, `dialectOrStyle`, ▶-knapp per kort; spilleindikator-mønsteret fra `CoachPersonaModal.tsx:38-55`). I `App.tsx`: state `showWelcomeOnboarding` init `shouldShowOnboarding()`; render i normal-grenen ved siden av `:207`, og endre profilmodal-betingelsen til `showOnboarding && !showWelcomeOnboarding`. IKKE early-return (ville skjult completed-grenen — se utforskningsfunn § 3).
- [ ] **Step 5: Grønn + full suite (vitest). IKKE kjør e2e her — den er forventet rød til Task 12.**
- [ ] **Step 6: Commit** — `feat(onboarding): Hvem skal trene deg + ukesmaal + foerste-oekt (C2)`

---

### Task 11: Onboarding-telemetri i rules-testene er alt dekket av Task 5 — SKIP (nummer beholdt for stabile referanser)

Ingen handling. (Task 5 la alle engagement-felter inkl. onboarding i allowlist + tester.)

---

### Task 12: e2e — seed-fix + onboarding-røyk

**Files:**
- Modify: `e2e/smoke.spec.ts:39-48` (utvid seed)
- Create: `e2e/onboarding.spec.ts`

- [ ] **Step 1: Utvid `addInitScript` i smoke.spec.ts** med to linjer i samme localStorage-seed: `mintrener_onboarding_v1` → `JSON.stringify({ completedAt: '2026-01-01T00:00:00.000Z' })` og `mintrener_coach_persona` → `'standard'` (begge med kommentar: hindrer OnboardingFlow-gaten i å dekke START-knappen).
- [ ] **Step 2: Ny `e2e/onboarding.spec.ts`** (samme config; INGEN onboarding-seed — det er poenget):

```ts
import { test, expect } from '@playwright/test';

test('førstegangsbruker: onboarding → persona → ukesmål → førsteside', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hvem skal trene deg?' })).toBeVisible();
  await page.getByRole('button', { name: /Jossa/ }).click();
  await page.getByRole('button', { name: 'Videre' }).click();
  await expect(page.getByText(/grunnlaget for streaken din/)).toBeVisible();
  await page.getByRole('button', { name: 'Videre' }).click();
  await expect(page.getByText('Klar for første økt?')).toBeVisible();
  await page.getByRole('button', { name: 'Til første økta' }).click();
  await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  const persona = await page.evaluate(() => localStorage.getItem('mintrener_coach_persona'));
  expect(persona).toBe('haugesund');
});
```

- [ ] **Step 3: Kjør `npm run test:e2e`** — BEGGE specs grønne (krever Java; bruk portabel JRE i scratchpad om nødvendig, ellers noter og la CI bevise).
- [ ] **Step 4: Commit** — `test(e2e): onboarding-royk + seed-vern for eksisterende royk`

---

### Task 13: Sluttverifikasjon

- [ ] Full `npx vitest run` grønn; `npx tsc -p tsconfig.app.json --noEmit` ren; `npm run build` OK (prebuild-manifest 0 advarsler).
- [ ] Fasit-sjekk: `git diff origin/main -- src/hooks/__tests__/useIntervalTimer.test.ts src/components/timer/__tests__/TimerDisplay.test.tsx` → TOM.
- [ ] Spec-dekningssjekk mot `docs/spec-c1c2-streak-onboarding-2026-08-29.md` § 2–6 (alle punkter skal peke på et task over; § 7-backloggen skal IKKE være implementert).
- [ ] Append Beslutning 37 til `docs/DECISIONS.md` (C1/C2: valgene fra sparringen — uke-streak i støttende tone, avledet tilstand, valg A×2, utsatt konto-prompt).

## Self-review (utført ved planskriving)

- **Spec-dekning:** § 2.1 → Task 1–3; § 2.2 → Task 6–7; milepæler → Task 8 + 9; § 3 → Task 10 + 12; § 4 → Task 4 + 9; § 5 → Task 5; § 6 → testene i hvert task + Task 12–13. Ingen gap.
- **Typekonsistens:** `WeekStreakResult`/`computeWeekStreak(history, goalForWeek, now)` brukes likt i Task 3/6/8/9; `EngagementCounter`-navnene i Task 5 matcher kallene i Task 9/10; `AccountPromptMoment` konsistent.
- **Kjente restpunkter (bevisst):** duplisert ukestart i `WorkoutCalendarHeatmap` refaktoreres IKKE (utenfor scope, notert); `computeStreakDays` (dag-streak, UTC-svakhet) beholdes urørt for `streakDays`-visningen i WorkoutSummary.
