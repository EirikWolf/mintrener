import { describe, it, expect } from 'vitest';
import { buildComfyPromptJob } from '../imagePromptService';
import { ExerciseItem } from '../../schemas/exerciseSchema';
import { EXERCISE_LIBRARY } from '../../data/exercises';

/**
 * Kameravinkel-konflikten (kuratering 2026-09-01).
 *
 * Kureringen delte seg skarpt på én variabel: prompter som ba om sideprofil
 * ble godkjent i 21 % av tilfellene, prompter som ikke gjorde det i 48 %. Alle
 * fjorten vinkel-anmerkningene lå på øvelser der prompten ALLEREDE sa «side
 * profile» — så problemet var ikke at vi ba for utydelig.
 *
 * Det lå i felles-strengen, som kom ETTER vinkelinstruksen og motsa den:
 *
 *   «full body completely visible within frame including hands and feet»
 *
 * I en streng sideprofil er den bortre armen og det bortre beinet skjult bak de
 * nærmeste. Instruksen er da bokstavelig talt uoppnåelig, og modellen løste
 * konflikten ved å rotere kameraet til tre kvart — nøyaktig det kuratoren
 * beskrev som «generert skrått forfra».
 *
 * Samme mekanisme som smilet i 2026-08-31-kureringen: en generell stilfrase som
 * stille overkjører den spesifikke bestillingen. «a faint natural smile» sto
 * fortsatt igjen og drar i samme retning, siden et smil forutsetter et ansikt
 * mot kamera.
 *
 * Frontvinkelen er BEVISST latt urørt. Den traff 48 % og er kontrollen i
 * forsøket — endrer vi begge, vet vi ikke hva som virket.
 */
// Bygger på en EKTE øvelse fra biblioteket, ikke en løs attrapp: da fanger
// testen det opp hvis skjemaet vokser med felt prompten bruker.
function øvelse(vinkel: ExerciseItem['bildeVinkel']): ExerciseItem {
  const base = EXERCISE_LIBRARY.find((e) => e.id === 'planke')!;
  return { ...base, bildeVinkel: vinkel };
}

describe('kameravinkel styrer innrammingsfrasen', () => {
  it('sideprofil ber ikke om synlige hender og føtter — det er uoppnåelig fra siden', () => {
    const jobb = buildComfyPromptJob(øvelse('side'), 0);
    expect(jobb.positivePrompt).not.toMatch(/including hands and feet/i);
  });

  it('sideprofil ber ikke om smil — et smil forutsetter ansikt mot kamera', () => {
    const jobb = buildComfyPromptJob(øvelse('side'), 0);
    expect(jobb.positivePrompt).not.toMatch(/smile/i);
  });

  it('sideprofil sier eksplisitt at de bortre lemmene SKAL være skjult', () => {
    const jobb = buildComfyPromptJob(øvelse('side'), 0);
    expect(jobb.positivePrompt).toMatch(/occluded/i);
  });

  it('frontvinkelen er uendret — den er kontrollen i forsøket', () => {
    const jobb = buildComfyPromptJob(øvelse('front'), 0);
    expect(jobb.positivePrompt).toMatch(/including hands and feet/i);
    expect(jobb.positivePrompt).toMatch(/faint natural smile/i);
  });

  it('innrammingen kommer etter vinkelinstruksen, så den ikke motsier den bakfra', () => {
    const jobb = buildComfyPromptJob(øvelse('side'), 0);
    expect(jobb.positivePrompt.indexOf('side profile view')).toBeLessThan(
      jobb.positivePrompt.search(/occluded/i)
    );
  });
});
