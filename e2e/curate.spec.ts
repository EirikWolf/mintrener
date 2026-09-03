import { test, expect } from '@playwright/test';
import { CURATION_DATA } from '../scripts/curateExerciseImages.mjs';

test('injiser kuratordata til http://localhost:5173', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await page.evaluate((data) => {
    const existingRaw = localStorage.getItem('mintrener_image_curator_feedback');
    let map = {};
    try {
      if (existingRaw) map = JSON.parse(existingRaw);
    } catch {}

    const now = new Date().toISOString();
    for (const [key, val] of Object.entries(data)) {
      map[key] = {
        feedback: val.feedback,
        status: val.status,
        updatedAt: now,
      };
    }

    localStorage.setItem('mintrener_image_curator_feedback', JSON.stringify(map));
  }, CURATION_DATA);

  console.log(`✅ ${Object.keys(CURATION_DATA).length} faser kurert og lagret i localStorage!`);
  expect(true).toBe(true);
});
