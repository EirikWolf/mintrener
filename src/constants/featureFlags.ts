/**
 * Funksjonsflagg som styrer hva som er synlig i produksjon.
 */

/**
 * Ren avgjørelse, skilt fra `import.meta.env` slik at den kan testes uten
 * å manipulere byggemiljøet.
 */
export function isCuratorEnabled(_env?: Record<string, unknown>): boolean {
  return false;
}

/**
 * Bildevisning i løsningen.
 *
 * Sett til false som standard fordi AI-genererte illustrasjoner ikke har
 * tilstrekkelig biomekanisk presisjon for treningsveiledning.
 * Løsningen fokuserer på ren timer, muskelkart, audio og tekstinstruksjoner,
 * med mulighet for brukerinnsendte bilder (crowdsourcing) senere.
 */
export function isExerciseImagesEnabled(env: Record<string, unknown>): boolean {
  return env?.VITE_ENABLE_EXERCISE_IMAGES === 'true';
}

export const ENABLE_EXERCISE_IMAGES: boolean = isExerciseImagesEnabled(import.meta.env);

/**
 * Bildekuratoren er et internt QA-verktøy for Kitor-bildepipelinen. Den
 * er kun aktiv dersom både bilder og kurator eksplisitt er skrudd på.
 */
export const IS_CURATOR_ENABLED: boolean = isCuratorEnabled(import.meta.env);
