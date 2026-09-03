import { test, expect } from '@playwright/test';
import type { WorkoutTemplate } from '../src/types/workout';
import { kodKompakt } from '../src/services/shareCodec';

/**
 * B4-røykflyten (revisjon § 5.3): start en økt → fullfør den → verifiser at
 * den dukker opp i historikken. Kjøres mot vite preview av et emulator-rettet
 * bygg (se playwright.config.ts og `npm run test:e2e`).
 *
 * Økten smugles inn via delingslenke-kanalen (`?w=<base64>`) med sekundkorte
 * faser, slik at hele flyten fullfører på ~5 sekunder ekte klokketid uten å
 * manipulere timeren selv — røyken tester nøyaktig samme kode som en delt økt.
 */

const SMOKE_WORKOUT: WorkoutTemplate = {
  id: 'e2e-smoke-workout',
  name: 'B4 Røyktest',
  description: 'Playwright-røykflyt',
  type: 'custom',
  prepareDurationSeconds: 2,
  rounds: 1,
  roundRestDurationSeconds: 0,
  items: [
    {
      id: 'e2e-i1',
      exercise: { id: 'e2e-e1', name: 'Røyk-knebøy' },
      workDurationSeconds: 3,
      restDurationSeconds: 1, // droppes for siste øvelse → totalt ~5 s
    },
  ],
};

// Kodes med appens EGEN koder framfor en kopi av formatet, slik at testen og
// delingskanalen ikke kan gli fra hverandre igjen. Det skjedde 2026-09-01
// (3993534), da lenken ble kompakt for å få QR-koden under 400 tegn mens denne
// røyken fortsatte å sende base64-JSON — appen avviste den som ugyldig lenke,
// og testen sa bare at «B4 Røyktest» ikke var synlig.
const encodedWorkout = kodKompakt(SMOKE_WORKOUT);

test('start → fullfør → historikk', async ({ page }) => {
  // Hopp over 1-spørsmåls-onboardingen — den er ikke det denne røyken vokter,
  // og localStorage-frøet speiler en bruker som allerede har svart.
  await page.addInitScript(() => {
    localStorage.setItem(
      'mintrener_user_profiles_v1',
      JSON.stringify({
        profiles: ['kontor'],
        primaryProfile: 'kontor',
        hasCompletedOnboarding: true,
      })
    );
    // C2-gaten (OnboardingFlow) dekker ellers hele førstesiden (inkl. START)
    // for ferske brukere — frøet speiler en bruker som alt har fullført flyten
    // og valgt trenerstemme. Onboarding-flyten har sin egen røyk (onboarding.spec.ts).
    localStorage.setItem(
      'mintrener_onboarding_v1',
      JSON.stringify({ completedAt: '2026-01-01T00:00:00.000Z' })
    );
    localStorage.setItem('mintrener_coach_persona', 'standard');
  });

  // 1. Åpne appen med røyk-økten valgt via delingslenken. `ref=share` gjør at
  // recordShareLinkOpen fyrer én EKTE Firestore-skrivning (share_import-telleren
  // i global_stats/overview) gjennom emulatoren — verifisert mot emulatorens
  // REST-API i steg 6, slik at «mot emulator» er substansielt utøvd.
  await page.goto(`/?w=${encodeURIComponent(encodedWorkout)}&ref=share`);
  await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  await expect(page.getByText('B4 Røyktest').first()).toBeVisible();

  // 2. Start økten: klargjøring → arbeid
  await page.getByRole('button', { name: 'START' }).click();
  await expect(page.getByText('Klargjøring')).toBeVisible();
  await expect(page.getByText('Arbeid')).toBeVisible({ timeout: 10_000 });
  // Fokusmodus-stripen erstatter toppkrommen under økten
  await expect(page.getByTestId('focus-quick-controls')).toBeVisible();

  // 3. Fullfør: oppsummeringen dukker opp når siste arbeidsfase løper ut
  await expect(page.getByRole('heading', { name: 'Bravo! Økt fullført!' })).toBeVisible({
    timeout: 20_000,
  });
  // .first(): øktnavnet kan stå flere steder i oppsummeringen (strict-mode-vern)
  await expect(page.getByText('B4 Røyktest').first()).toBeVisible();

  // 4. Tilbake til forsiden og inn i historikken
  await page.getByRole('button', { name: 'Ferdig / Ny økt' }).click();
  await expect(page.getByRole('button', { name: 'START' })).toBeVisible();
  await page.getByRole('button', { name: 'Historikk' }).click();

  // 5. Økten er logget i historikken
  await expect(page.getByRole('heading', { name: 'Treningshistorikk' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'B4 Røyktest' })).toBeVisible();
  // Én fullført økt i statistikk-kortet og «1 runde» på loggraden
  await expect(page.getByText('1 runde', { exact: true })).toBeVisible();

  // 6. Verifiser at ref=share-skrivingen fra steg 1 faktisk landet i emulatoren:
  // les global_stats/overview tilbake via emulatorens REST-API (regelen
  // `allow read: if true` gjelder). Skrivingen er fire-and-forget ved sidelast,
  // så vi poller — emulators:exec starter tomt, dermed er >= 1 et bevis på
  // akkurat denne kjøringens skrivning.
  await expect
    .poll(
      async () => {
        const res = await fetch(
          'http://127.0.0.1:8080/v1/projects/demo-mintrener/databases/(default)/documents/global_stats/overview'
        );
        if (!res.ok) return 0;
        const body = (await res.json()) as {
          fields?: { shareLinkOpens?: { integerValue?: string } };
        };
        return Number(body.fields?.shareLinkOpens?.integerValue ?? 0);
      },
      { timeout: 10_000, message: 'share_import-telleren nådde aldri emulatoren' }
    )
    .toBeGreaterThanOrEqual(1);
});
