import { describe, it, expect, beforeEach } from 'vitest';
import { loadPersistedSettings, savePersistedSettings, DEFAULT_PERSISTED_SETTINGS } from '../settingsStorageService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { TimerEngine } from '../timerEngine';
import { WorkoutTemplate } from '../../types/workout';

const mockWorkout: WorkoutTemplate = {
  id: 'test-w',
  name: 'Test',
  description: '',
  type: 'tabata',
  prepareDurationSeconds: 5,
  rounds: 2,
  roundRestDurationSeconds: 30,
  items: [{ id: 'e1', exercise: { id: 'push-up', name: 'Armhevinger' }, workDurationSeconds: 20, restDurationSeconds: 10 }],
};

describe('settingsStorageService – Brukerinnstillinger (H4)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gir standardverdier dersom ingen innstillinger er lagret', () => {
    const settings = loadPersistedSettings();
    expect(settings).toEqual(DEFAULT_PERSISTED_SETTINGS);
  });

  it('lagrer og laster endrede innstillinger', () => {
    savePersistedSettings({ soundEnabled: false, speechEnabled: false });
    const loaded = loadPersistedSettings();
    expect(loaded.soundEnabled).toBe(false);
    expect(loaded.speechEnabled).toBe(false);
    expect(loaded.vibrateEnabled).toBe(true);
    expect(loaded.wakeLockEnabled).toBe(true);
  });

  it('TimerEngine initialiseres med lagrede innstillinger', () => {
    localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify({
      soundEnabled: false,
      vibrateEnabled: false,
      wakeLockEnabled: true,
      speechEnabled: false,
    }));

    const engine = new TimerEngine(mockWorkout);
    const snap = engine.getSnapshot();

    expect(snap.soundEnabled).toBe(false);
    expect(snap.vibrateEnabled).toBe(false);
    expect(snap.speechEnabled).toBe(false);
    expect(snap.wakeLockEnabled).toBe(true);
  });

  it('TimerEngine oppdaterer lagrede innstillinger ved endring via setters', () => {
    const engine = new TimerEngine(mockWorkout);
    engine.setSoundEnabled(false);

    const loaded = loadPersistedSettings();
    expect(loaded.soundEnabled).toBe(false);
  });
});
