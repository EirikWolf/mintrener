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
  // exact: profilmodalen (1-spørsmåls-onboardingen) vises som forventet etter
  // flyten (planpresisering 5 undertrykker den bare MENS flyten er oppe), og
  // dens «Start med valgte profiler (1)» ville ellers substring-matchet START.
  await expect(page.getByRole('button', { name: 'START', exact: true })).toBeVisible();

  // Persona-valget er persistert — treneren er i ørene ved første START
  const persona = await page.evaluate(() => localStorage.getItem('mintrener_coach_persona'));
  expect(persona).toBe('haugesund');
});
