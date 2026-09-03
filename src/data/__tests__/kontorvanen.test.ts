import { describe, it, expect } from 'vitest';
import { EXERCISE_LIBRARY } from '../exercises/index';
import { STARTER_CHALLENGES } from '../challenges';

/**
 * «Kontorvanen 28 dager» mot øvelseskatalogen.
 *
 * Funn fra Eirik 2026-09-01: «Kontorvanen 30 dager inneholder øvelser som
 * skulderrulling, knebøy til stol og stående ryggvri. Kun 'Knebøy til stol
 * (Box Squat)' er dokumentert under Øvelser.»
 *
 * Årsaken viste seg å være verre enn manglende dokumentasjon. Utfordringen
 * skrev sitt eget `name` ved siden av `exercise.id`, og de tre navnene pekte på
 * tre andre øvelser enn de lovet:
 *
 * | Utfordringen sa    | Pekte på             | Som faktisk er              |
 * |--------------------|----------------------|-----------------------------|
 * | Skulderrulling     | skulder-dislocates   | krever strikk eller stang   |
 * | Knebøy til stol    | kneboy               | vanlig knebøy — og stol-kneboy FANTES |
 * | Stående ryggvri    | katte-ku             | på alle fire, på gulvet     |
 *
 * Referanseintegritets-testen fanget ikke dette, fordi ID-ene FINNES. Det er
 * navnet som lyver om hvilken øvelse det er — og navnet er det brukeren leser.
 *
 * Testene her er skrevet mot konteksten, ikke mot de tre ID-ene: en
 * skrivebordsøkt skal kunne gjøres ved en pult, uten utstyr og uten å legge seg
 * på gulvet. Det holder også neste øvelse noen bytter inn.
 */

const bibliotek = new Map(EXERCISE_LIBRARY.map((ex) => [ex.id, ex]));
const kontorvanen = STARTER_CHALLENGES.find((c) => c.id === 'kontorvanen-28-dager');

const økter =
  kontorvanen?.dailyWorkouts?.filter((d) => !d.isRestDay && d.workout?.items.length) ?? [];

const øvelser = [
  ...new Map(
    økter.flatMap((d) => d.workout!.items).map((it) => [it.exercise.id, it.exercise])
  ).values(),
];

describe('Kontorvanen 28 dager', () => {
  it('finnes, med treningsdager som har øvelser', () => {
    expect(kontorvanen, 'utfordringen mangler').toBeDefined();
    expect(økter.length).toBeGreaterThan(0);
    expect(øvelser.length).toBeGreaterThan(0);
  });

  it('kaller hver øvelse det den heter i katalogen', () => {
    // Brukeren skal kunne slå opp øvelsen under Øvelser og se hvordan den
    // utføres FØR dagen starter. Et navn som ikke finnes der, er en blindvei.
    const drift = øvelser
      .filter((ex) => bibliotek.get(ex.id) && bibliotek.get(ex.id)!.navn.nb !== ex.name)
      .map((ex) => `${ex.id}: utfordringen sier «${ex.name}», katalogen «${bibliotek.get(ex.id)!.navn.nb}»`);

    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('krever ikke utstyr utover stolen man allerede sitter på', () => {
    // Skulderrulling ble tegnet med strikk. En kontoransatt i et
    // skrivebordsavbrekk har verken strikk eller stang.
    const TILLATT = new Set(['ingen', 'stol/benk', 'matte']);
    const umulige = øvelser
      .map((ex) => bibliotek.get(ex.id)!)
      .filter((ex) => !ex.utstyr.some((u) => TILLATT.has(u)))
      .map((ex) => `${ex.id} krever ${ex.utstyr.join('/')}`);

    expect(umulige, umulige.join('\n')).toEqual([]);
  });

  it('ber ingen om å legge seg på gulvet ved pulten', () => {
    // Katte-ku er en god øvelse — men på alle fire, og utfordringen lovet en
    // STÅENDE ryggvri. Den som ikke vil ned på kontorgulvet, hopper over dagen.
    const påGulvet = øvelser
      .map((ex) => bibliotek.get(ex.id)!)
      .filter((ex) =>
        /på alle fire|ligg deg|legg deg|på magen|på ryggen/i.test(ex.instruks.nb.join(' '))
      )
      .map((ex) => ex.id);

    expect(påGulvet, `Gulvøvelser i en skrivebordsøkt: ${påGulvet.join(', ')}`).toEqual([]);
  });

  it('har en stående ryggvri å tilby, ikke bare gulvvarianten', () => {
    // Øvelsen fantes ikke i katalogen; utfordringen lånte katte-ku sin ID og
    // satte sitt eget navn på den. Da er navnet det eneste stedet øvelsen
    // finnes — og den er ikke søkbar, ikke illustrert og ikke instruert.
    const vri = EXERCISE_LIBRARY.find((ex) => ex.id === 'staende-ryggvri');
    expect(vri, 'staende-ryggvri mangler i katalogen').toBeDefined();
    expect(vri!.utstyr).toContain('ingen');
    expect(vri!.instruks.nb.length).toBeGreaterThanOrEqual(2);
  });

  it('lar katte-ku peke på den stående varianten for dem som ikke kan ned på gulvet', () => {
    // `noFloor` er en ekte oppslagsnøkkel i profileCompositionService, ikke
    // pynt: profiler med `resolve: ['noFloor']` bytter øvelsen automatisk.
    const kattKu = bibliotek.get('katte-ku');
    expect(kattKu?.alternatives?.noFloor).toBe('staende-ryggvri');
  });
});
