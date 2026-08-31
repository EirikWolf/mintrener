import { describe, it, expect } from 'vitest';
import { pickVoice, describeVoice } from '../speechService';

/**
 * Valg av talesyntese-stemme.
 *
 * Personaen het «Astrid (Standard)» — et kvinnenavn — men leverte en
 * mannsstemme. Målt i nettleser 2026-08-31: maskinen har nøyaktig ÉN norsk
 * stemme, «Microsoft Jon — Norwegian (Bokmål)».
 *
 * Utvelgelsen gjorde ikke noe galt: den kjente Jon igjen som mannlig, fant
 * ingen kvinnelig norsk stemme, og falt tilbake til den eneste norske. Valget
 * er riktig — norsk uttale er viktigere enn stemmens kjønn i en instruksjon.
 *
 * Feilen var at UI-et lovet noe utvelgelsen ikke kan holde. Vi eier ikke
 * stemmene; de kommer fra operativsystemet og varierer per enhet. Da kan vi
 * ikke gi dem et navn og et kjønn.
 */

function voice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

describe('pickVoice — norsk uttale går foran alt', () => {
  it('velger den norske stemmen selv når den er mannlig og eneste', () => {
    // Den faktiske situasjonen på en vanlig Windows-maskin
    const stemmer = [
      voice('Microsoft David - English (United States)', 'en-US'),
      voice('Microsoft Zira - English (United States)', 'en-US'),
      voice('Microsoft Jon - Norwegian (Bokmål)', 'nb-NO'),
    ];
    expect(pickVoice(stemmer)?.name).toBe('Microsoft Jon - Norwegian (Bokmål)');
  });

  it('foretrekker en kvinnelig norsk stemme når en finnes', () => {
    const stemmer = [
      voice('Microsoft Jon - Norwegian (Bokmål)', 'nb-NO'),
      voice('Microsoft Iselin - Norwegian (Bokmål)', 'nb-NO'),
    ];
    expect(pickVoice(stemmer)?.name).toContain('Iselin');
  });

  it('lar «female» i navnet telle som kvinnelig, ikke mannlig', () => {
    // «female» inneholder «male». Med ren substring-sjekk ble en stemme som
    // heter «Female» klassifisert som mannlig i det nøytrale filteret.
    const stemmer = [
      voice('Norsk Female Voice', 'nb-NO'),
      voice('Norsk Ukjent', 'nb-NO'),
    ];
    expect(pickVoice(stemmer)?.name).toBe('Norsk Female Voice');
  });

  it('lar «google» være uten kjønnssignal', () => {
    // «google» sto i lista over kvinnelige hint. Leverandørnavnet sier
    // ingenting om kjønn, og gjorde valget vilkårlig.
    const stemmer = [
      voice('Google norsk', 'nb-NO'),
      voice('Microsoft Iselin - Norwegian (Bokmål)', 'nb-NO'),
    ];
    expect(pickVoice(stemmer)?.name).toContain('Iselin');
  });

  it('faller til en engelsk stemme først når ingen norsk finnes', () => {
    const stemmer = [voice('Microsoft Zira - English (United States)', 'en-US')];
    expect(pickVoice(stemmer)?.name).toContain('Zira');
  });

  it('takler tom stemmeliste', () => {
    expect(pickVoice([])).toBeNull();
  });
});

describe('describeVoice — si hva brukeren faktisk får', () => {
  it('oppgir stemmens virkelige navn', () => {
    const info = describeVoice(voice('Microsoft Jon - Norwegian (Bokmål)', 'nb-NO'));
    expect(info.name).toBe('Microsoft Jon - Norwegian (Bokmål)');
    expect(info.isNorwegian).toBe(true);
  });

  it('lover ingen bestemt stemme når enheten ikke har noen', () => {
    // Her sto det tidligere «Astrid (Standard kvinnestemme)» — en påstand om
    // både navn og kjønn på en stemme som ikke fantes.
    const info = describeVoice(null);
    expect(info.name).not.toMatch(/astrid/i);
    expect(info.name).not.toMatch(/kvinne/i);
  });

  it('flagger når stemmen ikke er norsk, så UI-et kan si fra', () => {
    const info = describeVoice(voice('Microsoft Zira - English (United States)', 'en-US'));
    expect(info.isNorwegian).toBe(false);
  });
});
