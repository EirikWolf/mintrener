/**
 * Funksjonsflagg som styrer hva som er synlig i produksjon.
 */

/**
 * Ren avgjørelse, skilt fra `import.meta.env` slik at den kan testes uten
 * å manipulere byggemiljøet.
 */
export function isCuratorEnabled(env: { DEV?: boolean; VITE_ENABLE_CURATOR?: string }): boolean {
  return env.DEV === true || env.VITE_ENABLE_CURATOR === 'true';
}

/**
 * Bildekuratoren er et internt QA-verktøy for Kitor-bildepipelinen. Den
 * eksponerer interne modellnavn, seed-referanser og engelske bildeprompter,
 * og «Bestill ny»-knappen skriver bare til localStorage — den bestiller
 * ingenting. Innlogging er ikke en tilstrekkelig port: appen er åpen for
 * alle med Google-konto, så «innlogget» betyr «hvem som helst».
 *
 * Flagget er derfor PÅ i utvikling og AV i produksjon, med mindre bygget
 * eksplisitt setter VITE_ENABLE_CURATOR=true.
 */
export const IS_CURATOR_ENABLED: boolean = isCuratorEnabled(import.meta.env);
