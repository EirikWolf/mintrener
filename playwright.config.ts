import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright-røykflyt (B4, revisjon § 5.3): én spec mot `vite preview` av et
 * emulator-rettet produksjonsbygg (`npm run build:e2e`, se .env.e2e). Kjøres
 * innenfor `firebase emulators:exec` slik at Firestore-emulatoren lever i
 * hele testens levetid — se `npm run test:e2e` i package.json.
 * Chromium only (bestillingen): røyk, ikke kryssleser-matrise.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  // Røyken skal være deterministisk; retry kun i CI mot kaldstart-støy.
  retries: process.env.CI ? 1 : 0,
  // I CI legges html-rapporten (med trace ved retry-feil) ved som artefakt.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Timer-appen låser opp lyd ved start — ikke la autoplay-policy blokkere.
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
