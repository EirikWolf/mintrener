/**
 * Kandidater jeg har forkastet ved gjennomsyn, med begrunnelse.
 *
 * HVORFOR DENNE FINNES. Første runde sendte alle 57 kandidatene rett til
 * kuratoren, inkludert dem jeg allerede hadde sett var ødelagte. Det er å
 * flytte arbeid oppover: den som kurerer skal bruke øyet på det som er
 * vanskelig å avgjøre, ikke på å luke bort et bilde med to hoder.
 *
 * Terskelen her er lav med vilje. Fjernet blir bare det som er OBJEKTIVT galt
 * — anatomi som ikke kan stemme, gjenstander som ikke hører til, eller antrekk
 * som skjuler nettopp det øvelsen handler om. Alt som er en smakssak, en
 * gradsforskjell eller et spørsmål om hvilken av tre som er penest, går videre
 * til kuratoren. Det er ikke min avgjørelse.
 */
export const AVVISTE: Record<string, string> = {
  'rygghev-superman-0-s1':
    'To hoder. Den kjente feilmodusen: en vannrett, nesten symmetrisk kropp på syntetisk gulv leses som to kropper som møtes på midten.',
  'rygghev-superman-1-s1': 'Kroppen svever godt over matta. Ingen kontakt med underlaget.',
  'rygghev-superman-1-s2': 'En pølle er dukket opp under hoftene, og armene peker bakover. Øvelsen har ingen rekvisitt.',
  'manualpress-bryst-0-s1': 'Armene er allerede strukket ut — det er fase 2, ikke startstillingen. Dessuten et hvitt smøreartefakt på veggen.',
  'hulekroppshold-0-s2': 'Ansikt og hals er forvridd.',
  'katte-ku-0-s0': 'Posete overdel skjuler ryggen. Ryggens form ER øvelsen her.',
  'katte-ku-0-s1': 'Samme: ryggen er dekket, og hofteproporsjonene er forvridd.',
  'katte-ku-1-s0': 'Posete overdel skjuler den krummede ryggen, som er hele poenget med katt-fasen.',
  'katte-ku-1-s1': 'Samme problem med overdelen.',
  // Alle tre: referansen er feil for fasen, ikke modellen. Se hentReferanser.
  'planke-0-s0': 'Halvknelende med hånden på kneet, ikke en plankeforberedelse på underarmer.',
  'planke-0-s1': 'Samme.',
  'planke-0-s2': 'Samme.',
  'sideplanke-0-s9': 'En pølle er dukket opp under hoften. Sideplanken har ingen rekvisitt.',
  'bord-roing-0-s0': 'To kropper og flette som går inn i armen. Dobbeltkropp-artefakt.',
  'bord-roing-0-s2': 'Armene henger fritt i lufta uten grep om stang, ekstra person i bakgrunnen.',
  'dips-pa-stol-0-s0': 'Posekjole/sengetøy istedenfor treningsklær, hendene berører knapt benken.',
  'dips-pa-stol-0-s2': 'Hånd henger i løse luften bak en frittstående stang/stolpe uten benk.',
  'dips-pa-stol-1-s1': 'Hender plassert bak ryggen i lufta uten kontakt med benk.',
  'dips-pa-stol-1-s2': 'Holder en løs rund gjenstand i luften uten støtte på benk/stol.',
  'kettlebell-row-1-s0': 'Kulen svever mellom to hender, usammenhengende grep.',
  'kettlebell-row-1-s1': 'To kettlebells dukket opp, én i hver hånd.',
};
