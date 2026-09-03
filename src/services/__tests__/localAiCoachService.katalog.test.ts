import { describe, it, expect } from 'vitest';
import { answerFromCatalogue } from '../localAiCoachService';

/**
 * Coachen svarer fra øvelseskatalogen.
 *
 * «Hvordan gjør jeg planken?» og «Hva er push-ups?» ga samme svar:
 * «Veldig godt spørsmål! Som din personlige trener anbefaler jeg å fokusere på
 * god teknikk …». Grunnen er at regelmotoren hadde åtte nøkkelord-regler, og
 * bare to av dem gjaldt en øvelse (knebøy og markløft). Alt annet falt til
 * samme generiske setning.
 *
 * Katalogen har 74 øvelser, hver med `instruks` steg for steg og
 * `vanligeFeil`. Svaret på spørsmålet lå altså i våre egne data hele tiden —
 * coachen slo bare aldri opp der.
 *
 * Dette er ikke en AI-forbedring. Det er et oppslag.
 */

describe('answerFromCatalogue — svar fra øvelsesdataene', () => {
  it('svarer på «hvordan gjør jeg planken» med øvelsens egen instruks', () => {
    const svar = answerFromCatalogue('Hvordan gjør jeg planken?');
    expect(svar).not.toBeNull();
    expect(svar).toMatch(/planke/i);
    // Instruksen er trinnvis — svaret skal bære trinnene, ikke en oppsummering
    expect(svar!.split('\n').length).toBeGreaterThan(2);
  });

  it('svarer på «hva er push-ups»', () => {
    const svar = answerFromCatalogue('Hva er push-ups?');
    expect(svar).not.toBeNull();
    expect(svar).toMatch(/armheving/i);
  });

  it('tar med vanlige feil når øvelsen har dem', () => {
    const svar = answerFromCatalogue('Hvordan gjør jeg knebøy?');
    expect(svar).toMatch(/valgus|hælene|korsryggen/i);
  });

  it('finner øvelsen på engelsk navn også', () => {
    const svar = answerFromCatalogue('How do I do a bodyweight squat?');
    expect(svar).toMatch(/knebøy/i);
  });

  it('velger det lengste navnetreffet når flere passer', () => {
    // «sideplanke» inneholder «planke». Spør brukeren om sideplanke, skal hun
    // ikke få svar om vanlig planke.
    const svar = answerFromCatalogue('Hvordan gjør jeg sideplanke?');
    expect(svar).toMatch(/sideplanke/i);
  });

  it('gir null når spørsmålet ikke handler om en øvelse', () => {
    // Da skal de øvrige reglene og den generelle fallbacken få slippe til
    expect(answerFromCatalogue('Hvor mange ganger i uka bør jeg trene?')).toBeNull();
    expect(answerFromCatalogue('')).toBeNull();
  });

  it('lar seg ikke lure av et navn som bare er en del av et annet ord', () => {
    // «liv» er ikke en øvelse, men et fragment. Et for løst oppslag ville
    // svart om en øvelse på nesten hvilket som helst spørsmål.
    const svar = answerFromCatalogue('Hva betyr et aktivt liv for helsa?');
    expect(svar).toBeNull();
  });
});
