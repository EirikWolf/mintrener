import type { SoundLevel } from '../services/soundLevelService';

export interface ContextProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'planned';
  targetAudience: string;
  voiceStyle: 'rolig' | 'lek' | 'energi' | 'nøytral';
  defaultDurationSeconds: number;
  /**
   * Lydnivået profilen FORESLÅR. Brukerens eget valg vinner alltid.
   * Et åpent kontorlandskap og et korlokale tåler et pip, men ikke en stemme.
   */
  defaultSoundLevel: SoundLevel;
  badgeColor: string;
}

export type TrainingMode = 'alene' | 'sammen' | 'led_gruppe';

export const CONTEXT_PROFILES: ContextProfile[] = [
  {
    id: 'kontor',
    name: 'Kontor & Hjemmekontor',
    description: 'Korte 60–120 sekunders avbrekk for nakke, skuldre og rygg. Ingen svette eller klesskift.',
    icon: 'Briefcase',
    status: 'active',
    targetAudience: 'Voksne ved skrivebord/skjerm',
    voiceStyle: 'rolig',
    defaultDurationSeconds: 90,
    // Åpent landskap: kollegene skal ikke høre treneren din.
    defaultSoundLevel: 'signal',
    badgeColor: 'bg-blue-950 text-blue-400 border-blue-800',
  },
  {
    id: 'barn',
    name: 'Barn & Ungdom',
    description: 'Morsomme og lekpregede dyrebevegelser, sprett og koordinasjon.',
    icon: 'Smile',
    status: 'active',
    targetAudience: 'Barn 4–12 år, skole, barnehage og familie',
    voiceStyle: 'lek',
    defaultDurationSeconds: 90,
    // Stemmen er halve moroa, og rommet tåler den.
    defaultSoundLevel: 'trener',
    badgeColor: 'bg-amber-950 text-amber-400 border-amber-800',
  },
  {
    id: 'senior',
    name: 'Senior & Sittende',
    description: 'Trygge balanseøvelser, leddmobilitet og bevegelse tilpasset stol og støtte.',
    icon: 'Heart',
    status: 'active',
    targetAudience: 'Seniorer og personer med redusert mobilitet',
    voiceStyle: 'rolig',
    defaultDurationSeconds: 120,
    // Instruksjonen er en del av tryggheten — særlig ved balanseøvelser.
    defaultSoundLevel: 'trener',
    badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  },
  {
    id: 'kor',
    name: 'Kor & Sangere',
    description: 'Pusteøvelser, kjeveavspenning, skuldre og holdning før sang.',
    icon: 'Music',
    status: 'active',
    targetAudience: 'Sangere, korister og vokalister',
    voiceStyle: 'rolig',
    defaultDurationSeconds: 120,
    // Øvelsene gjøres i et lokale der andre synger.
    defaultSoundLevel: 'signal',
    badgeColor: 'bg-purple-950 text-purple-400 border-purple-800',
  },
  {
    // Eneste profil uten programmer i katalogen (senior og kor hadde fire
    // hver mens de sto som «planned» — flagget hadde ikke fulgt innholdet).
    // Denne er korrekt merket: den venter på innhold, ikke på et flagg.
    id: 'idrett',
    name: 'Idrettslag & Ungdom',
    description: 'Dynamisk oppvarming, spenst, skadeforebygging og kjernestabilitet.',
    icon: 'Trophy',
    status: 'planned',
    targetAudience: 'Fotball, håndball, ski og idrettslag',
    voiceStyle: 'energi',
    defaultDurationSeconds: 180,
    // Utendørs og i hall: stemmen må konkurrere med omgivelsene.
    defaultSoundLevel: 'trener',
    badgeColor: 'bg-rose-950 text-rose-400 border-rose-800',
  },
];
