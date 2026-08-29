import { describe, it, expect } from 'vitest';
import { isCurrentSessionInHistory, buildEffectiveHistory } from '../summaryContextService';
import { CompletedWorkoutLog } from '../../types/models';

const makeLog = (overrides: Partial<CompletedWorkoutLog> = {}): CompletedWorkoutLog => ({
  id: 'log-1',
  userId: 'anonymous',
  workoutId: 'w1',
  workoutName: 'Tabata Helkropp',
  workoutType: 'tabata',
  durationSeconds: 300,
  roundsCompleted: 4,
  totalRounds: 4,
  completedAt: new Date().toISOString(),
  ...overrides,
});

describe('isCurrentSessionInHistory', () => {
  it('returnerer false når workoutLogId ikke er satt ennå (lagring pågår)', () => {
    expect(isCurrentSessionInHistory([makeLog({ id: 'log-1' })], undefined)).toBe(false);
  });

  it('returnerer false når id ikke finnes i historikken', () => {
    expect(isCurrentSessionInHistory([makeLog({ id: 'log-1' })], 'log-2')).toBe(false);
  });

  it('returnerer true ved eksakt id-match', () => {
    expect(isCurrentSessionInHistory([makeLog({ id: 'log-2' }), makeLog({ id: 'log-1' })], 'log-2')).toBe(true);
  });

  it('regner ikke to identiske korte økter etter hverandre som samme økt (reviewfunn 1)', () => {
    // To identiske Tabata-økter på 60 sekunder rett etter hverandre - den
    // andre økten sin id finnes ikke i historikken selv om navn/varighet er
    // identisk med den nyeste oppføringen.
    const history = [makeLog({ id: 'log-first', durationSeconds: 60 })];
    expect(isCurrentSessionInHistory(history, 'log-second')).toBe(false);
  });
});

describe('buildEffectiveHistory', () => {
  const session = { workoutName: 'Tabata Helkropp', durationSeconds: 300 };

  it('stabler en midlertidig oppføring øverst når økten ikke er bekreftet inkludert', () => {
    const history: CompletedWorkoutLog[] = [];
    const effective = buildEffectiveHistory(history, session, undefined);
    expect(effective).toHaveLength(1);
    expect(effective[0].workoutName).toBe('Tabata Helkropp');
    expect(effective[0].durationSeconds).toBe(300);
  });

  it('returnerer historikken uendret (ingen dobbeltelling) når id allerede er bekreftet i historikken', () => {
    const history = [makeLog({ id: 'log-42' })];
    const effective = buildEffectiveHistory(history, session, 'log-42');
    expect(effective).toHaveLength(1);
    expect(effective).toEqual(history);
  });

  it('teller fortsatt inn økten manuelt selv om workoutLogId er satt men enda ikke synkronisert til historikken', () => {
    const history: CompletedWorkoutLog[] = [];
    const effective = buildEffectiveHistory(history, session, 'log-42');
    expect(effective).toHaveLength(1);
  });

  it('dobbelteller ikke ved re-kjøring etter at id-en bekreftes (simulerer effekt-rerun)', () => {
    // Første kjøring: workoutLogId ikke satt ennå
    const historyBeforeSave: CompletedWorkoutLog[] = [];
    const firstRun = buildEffectiveHistory(historyBeforeSave, session, undefined);
    expect(firstRun).toHaveLength(1);

    // Andre kjøring: lagringen er ferdig, historikken inneholder nå økten med riktig id
    const historyAfterSave = [makeLog({ id: 'log-42', ...session })];
    const secondRun = buildEffectiveHistory(historyAfterSave, session, 'log-42');
    expect(secondRun).toHaveLength(1);
  });
});
