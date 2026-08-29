import { test, expect } from '@playwright/test';

/**
 * C2-røyken (spec § 3 + § 6): en helt fersk bruker — INGEN localStorage-frø,
 * det er selve poenget — møter onboarding-flyten, velger persona og ukesmål,
 * og lander på førstesiden med timeren + anbefalt program klart bak START.
 */
test('førstegangsbruker: onboarding → persona → ukesmål → førsteside', async ({ page }) => {
  await page.goto('/');

  // Steg 1: persona-rutenettet. «Velg Jossa» (ikke /Jossa/): kortet og
  // ▶-knappen («Forhåndshør Jossa») ville ellers kollidert i strict mode.
  await expect(page.getByRole('heading', { name: 'Hvem skal trene deg?' })).toBeVisible();
  await page.getByRole('button', { name: 'Velg Jossa' }).click();
  await page.getByRole('button', { name: 'Videre' }).click();

  // Steg 2: ukesmål (3 forhåndsvalgt beholdes)
  await expect(page.getByText(/grunnlaget for streaken din/)).toBeVisible();
  await page.getByRole('button', { name: 'Videre' }).click();

  // Avslutning → førstesiden med timeren synlig
  await expect(page.getByText('Klar for første økt?')).toBeVisible();
  await page.getByRole('button', { name: 'Til første økta' }).click();

  // B2 (planpresisering 6): profilmodalen er utsatt til neste besøk — landingen
  // skal være timeren med START ett trykk unna, ikke en ny modal.
  await expect(
    page.getByRole('heading', { name: 'Hvor skal du bruke Min Trener?' })
  ).toHaveCount(0);
  // exact beholdes som robusthet mot fremtidige «Start …»-knapper i DOM-en.
  await expect(page.getByRole('button', { name: 'START', exact: true })).toBeVisible();

  // Persona-valget er persistert — treneren er i ørene ved første START
  const persona = await page.evaluate(() => localStorage.getItem('mintrener_coach_persona'));
  expect(persona).toBe('haugesund');

  // START er faktisk klikkbar: økta går i gang med klargjøringsfasen
  await page.getByRole('button', { name: 'START', exact: true }).click();
  await expect(page.getByText('Klargjøring')).toBeVisible();
});
