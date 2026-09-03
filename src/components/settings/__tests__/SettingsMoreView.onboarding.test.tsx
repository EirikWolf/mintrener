import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsMoreView } from '../SettingsMoreView';

/**
 * B5 (spec § 3): velkomstflyten kan gjenåpnes fra innstillingene. Raden
 * dispatcher 'open-welcome-onboarding' — App-siden av event-veien testes i
 * App.test.tsx; her testes avsenderen.
 */

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

vi.mock('../../../services/telemetryService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../services/telemetryService')>();
  return { ...actual, fetchGlobalStats: vi.fn(async () => null) };
});

vi.mock('../../../services/exportDataService', () => ({
  exportFullUserDataset: vi.fn(),
}));

// Modaler åpnes ikke i denne testen — stubbes så importkjedene deres
// (bluetooth, kiosk m.m.) ikke dras inn.
vi.mock('../../sensors/SensorStatusModal', () => ({ SensorStatusModal: () => null }));
vi.mock('../../help/AboutGuideModal', () => ({ AboutGuideModal: () => null }));
vi.mock('../../legal/PrivacyPolicyModal', () => ({ PrivacyPolicyModal: () => null }));
vi.mock('../../profile/ProfileOnboardingModal', () => ({ ProfileOnboardingModal: () => null }));
vi.mock('../../kiosk/OfficeKioskScreen', () => ({ OfficeKioskScreen: () => null }));
vi.mock('../CoachPersonaModal', () => ({ CoachPersonaModal: () => null }));

async function renderView() {
  await act(async () => {
    render(
      <SettingsMoreView
        soundEnabled
        vibrateEnabled
        onToggleVibrate={vi.fn()}
        wakeLockEnabled
        onToggleWakeLock={vi.fn()}
        speechEnabled
      />
    );
  });
}

describe('SettingsMoreView — gjenåpne velkomstoppsettet (B5)', () => {
  const listener = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.addEventListener('open-welcome-onboarding', listener);
  });

  afterEach(() => {
    window.removeEventListener('open-welcome-onboarding', listener);
  });

  it('raden finnes og dispatcher open-welcome-onboarding ved trykk', async () => {
    await renderView();
    const row = screen.getByRole('button', { name: /Kjør velkomstoppsett på nytt/ });
    fireEvent.click(row);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
