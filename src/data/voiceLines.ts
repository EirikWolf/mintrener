import { VoiceTone } from '../schemas/profileSchema';

export interface VoiceLineBank {
  tone: VoiceTone;
  phases: {
    start: string[];
    every30: string[];
    halfway: string[];
    last15: string[];
    last10: string[];
    countdown5to1: [string, string, string, string, string];
    finish: string[];
    recordBeat: string[];
    holdPrompt: string[];
  };
}

export const VOICE_LINES: Record<VoiceTone, VoiceLineBank> = {
  rolig: {
    tone: 'rolig',
    phases: {
      start: [
        'Klar – gå!',
        'Da kjører vi.',
        'Nå starter vi. Pust rolig og finn en god rytme.',
        'Sett i gang.',
      ],
      every30: [
        'Tretti sekunder. Fin start, hold ryggen rett og skuldrene lave.',
        'Ett minutt. Pust rolig, du har god kontroll.',
        'Ett minutt og tretti sekunder. Fortsett med jevn pust.',
        'To minutter. Sterkt jobba, hold fokus.',
        'To og et halvt minutt. Behold den gode holdningen.',
      ],
      halfway: [
        'Halvveis! Nå er det bare nedover.',
        'Halvveis. Veldig bra, fortsett i samme tempo.',
        'Halvveis gjennomført. Hold posisjonen stabil.',
      ],
      last15: [
        'Femten sekunder igjen. Nå gjelder det å holde ut.',
        'Femten sekunder. Siste lille innsats nå.',
      ],
      last10: [
        'Ti sekunder igjen.',
        'Ti sekunder, hold helt inn.',
      ],
      countdown5to1: ['Fem', 'Fire', 'Tre', 'To', 'En'],
      finish: [
        'Ferdig! Godt jobba.',
        'Kjempefin innsats! Pust ut og rist løs.',
        'Fullført! Veldig bra gjennomført.',
      ],
      recordBeat: [
        'Ny personlig rekord! Fantastisk!',
        'Der passerte du rekorden din! Sterkt!',
      ],
      holdPrompt: [
        'Hold posisjonen så lenge du klarer.',
        'Finn stabiliteten og hold fokus.',
      ],
    },
  },
  lek: {
    tone: 'lek',
    phases: {
      start: [
        'Tre, to, en – og kjør på!',
        'Gjør deg klar, nå starter moroa!',
        'Nå setter vi i gang! Er du klar?',
      ],
      every30: [
        'Tretti sekunder har gått! Wow, dette går superbra!',
        'Ett minutt! Du er like sterk som en bjørn!',
        'Ett og et halvt minutt! Fortsett å leke og bevege deg!',
        'To minutter! Helt fantastisk innsats!',
      ],
      halfway: [
        'Halvveis! Du er en ekte superhelt!',
        'Halvveis allerede! Kjempegøy, nå klarer vi resten!',
      ],
      last15: [
        'Bare femten sekunder igjen! Gi full gass!',
        'Femten sekunder! Snart i mål!',
      ],
      last10: [
        'Ti sekunder! Nedtellingen starter snart!',
      ],
      countdown5to1: ['Fem!', 'Fire!', 'Tre!', 'To!', 'En!'],
      finish: [
        'Jaaa! Ferdig! High five!',
        'Hurra! Du klarte det! Kjempebra jobba!',
        'Super innsats! Du er helt rå!',
      ],
      recordBeat: [
        'NY REKORD! Du slo din egen rekord! Hurra!',
      ],
      holdPrompt: [
        'Hvor lenge klarer du å stå som en statue?',
        'Klarer du å holde balansen?',
      ],
    },
  },
  gira: {
    tone: 'gira',
    phases: {
      start: [
        'Let’s go! Fullt trøkk fra start!',
        'Klar – kjør!',
        'Nå gir vi alt!',
      ],
      every30: [
        'Tretti sekunder! Hold intensiteten oppe!',
        'Ett minutt! Ikke gi deg nå, press på!',
        'To minutter! Sterkt, hold koken!',
      ],
      halfway: [
        'Halvveis! På tide å hente fram det siste!',
        'Halvveis! Bra trøkk, hold tempoet!',
      ],
      last15: [
        'Femten sekunder! Grav dypt nå!',
        'Femten igjen! Helt ut til hornet!',
      ],
      last10: [
        'Ti sekunder! Alt du har!',
      ],
      countdown5to1: ['5', '4', '3', '2', '1'],
      finish: [
        'BOM! Fullført! Rått levert!',
        'Ferdig! Utrolig bra trøkk!',
      ],
      recordBeat: [
        'NY PERS! Rått jobba!',
      ],
      holdPrompt: [
        'Hold til det brenner!',
      ],
    },
  },
  tørr: {
    tone: 'tørr',
    phases: {
      start: [
        'Start.',
        'Sett i gang.',
      ],
      every30: [
        '30 sekunder passert.',
        '60 sekunder passert.',
        '90 sekunder passert.',
        '120 sekunder passert.',
      ],
      halfway: [
        'Halvveis.',
      ],
      last15: [
        '15 sekunder gjenstår.',
      ],
      last10: [
        '10 sekunder.',
      ],
      countdown5to1: ['Fem', 'Fire', 'Tre', 'To', 'En'],
      finish: [
        'Ferdig.',
        'Økten er fullført.',
      ],
      recordBeat: [
        'Ny rekord registrert.',
      ],
      holdPrompt: [
        'Hold posisjonen.',
      ],
    },
  },
};

/**
 * Henter en tilfeldig stemmelinje for en gitt fase og tone,
 * med enkel unngåelse av umiddelbar gjentakelse.
 */
const lastLineMemory: Record<string, string> = {};

export function getVoiceLine(tone: VoiceTone, phase: keyof VoiceLineBank['phases']): string {
  const bank = VOICE_LINES[tone] || VOICE_LINES.rolig;
  const lines = bank.phases[phase];
  
  if (Array.isArray(lines)) {
    if (lines.length === 0) return '';
    const key = `${tone}_${phase}`;
    const previous = lastLineMemory[key];
    
    const candidates = lines.filter((l) => l !== previous);
    const chosen = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : lines[Math.floor(Math.random() * lines.length)];
      
    lastLineMemory[key] = chosen;
    return chosen;
  }
  
  return '';
}
