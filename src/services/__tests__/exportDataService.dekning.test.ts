import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STORAGE_KEYS } from '../../constants/storageKeys';

/**
 * Holder dataeksporten i takt med det den lover.
 *
 * Beslutning 40 påsto at `exportFullUserDataset` henter «et fullstendig
 * GDPR Art. 20 JSON-datasett». Revisjon B2 målte det: eksporten leste 9 av
 * 32 nøkler. Fødselsår — merket «Personopplysning» i vårt eget register —
 * var blant dem som manglet.
 *
 * Feilen var usynlig fordi et manglende felt ser ut som «ingen data», ikke
 * som «leser feil nøkkel». Ingenting feilet, og påstanden sto i
 * beslutningsloggen i flere dager.
 *
 * Denne testen er svaret på det generelle problemet: en påstand om at noe er
 * fullstendig, skal peke på kommandoen som beviser det. Vokser registeret
 * uten at eksporten følger etter, feiler dette i CI samme dag.
 *
 * UNNTAKSLISTEN er den bevisste delen. Står en nøkkel der, er det et valg —
 * ikke en forglemmelse.
 */

const EKSPORT = join(process.cwd(), 'src', 'services', 'exportDataService.ts');

/**
 * Nøkler som med hensikt IKKE er med i brukerens dataeksport.
 * Hver oppføring skal ha en grunn.
 */
const UTENFOR_EKSPORT: Partial<Record<keyof typeof STORAGE_KEYS, string>> = {
  LEGACY_WORKOUT_HISTORY: 'Migreringsnøkler. Innholdet er allerede med via WORKOUT_HISTORY.',
  LEGACY_CUSTOM_WORKOUTS: 'Migreringsnøkkel, leses som fallback i eksporten.',
  LEGACY_CUSTOM_EXERCISES: 'Migreringsnøkkel, leses som fallback i eksporten.',
  LEGACY_STRENGTH_LOGS: 'Migreringsnøkkel, leses som fallback i eksporten.',
  CURATOR_FEEDBACK: 'Internt QA-verktøy, ikke brukerdata.',
  INTERRUPTED_SESSION: 'Flyktig UI-tilstand, ikke treningsdata.',
  ONBOARDING: 'Flagg for om onboarding er vist. Ingen informasjonsverdi for bruker.',
  ACCOUNT_PROMPT: 'Flagg for om kontoprompt er avvist.',
  STREAK_REPORTED: 'Intern de-duplisering av telemetri.',
  STREAK_CELEBRATED: 'Intern de-duplisering av feiring.',
  TELEMETRY_ENABLED: 'Samtykkeflagg, ikke innsamlet data.',
  ORGANIZATION: 'Organisasjonstilknytning, ikke personlige treningsdata.',
  CHALLENGE_PROGRESS_PREFIX: 'Prefiks, ikke en enkeltnøkkel. Dekkes av ACTIVE_CHALLENGE_ID.',
};

describe('Dataeksporten dekker registeret (GDPR art. 15/20)', () => {
  it('hver nøkkel er enten eksportert eller eksplisitt unntatt', () => {
    const kilde = readFileSync(EKSPORT, 'utf8');

    const mangler = (Object.keys(STORAGE_KEYS) as (keyof typeof STORAGE_KEYS)[])
      .filter((navn) => !(navn in UTENFOR_EKSPORT))
      .filter((navn) => !kilde.includes(`STORAGE_KEYS.${navn}`))
      .sort();

    expect(
      mangler,
      'Nøkler i registeret som verken eksporteres eller står i UTENFOR_EKSPORT: ' +
        mangler.join(', ') +
        '. Legg dem i eksporten, eller i unntakslisten med en grunn.'
    ).toEqual([]);
  });

  it('unntakslisten inneholder ingen nøkler som ikke finnes', () => {
    const ukjente = Object.keys(UTENFOR_EKSPORT)
      .filter((navn) => !(navn in STORAGE_KEYS))
      .sort();

    expect(ukjente, 'Unntak for nøkler som ikke finnes: ' + ukjente.join(', ')).toEqual([]);
  });
});
