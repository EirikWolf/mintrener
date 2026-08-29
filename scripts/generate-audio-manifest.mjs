// scripts/generate-audio-manifest.mjs — genererer persona-lydmanifest ved bygg
// (B3 Task β5, spec § 5). Skanner public/audio/personas/ og skriver
// src/data/personaAudioManifest.json med formen { persona: { cueKey: url } }.
// Manglende forventede klipp = byggtidsADVARSEL (exit 0), aldri byggfeil og
// aldri stille TTS-fallback i prod uten spor; ekstra filer tolereres og tas med.
// Forventet-listen hardkodes IKKE duplisert: øvelses-id-ene leses fra
// kategorifilene i src/data/exercises/ (id-feltene er kilden), og cue-listen
// speiler scripts/voicebank-manuskript.json (11 manus-cues + start_321).
//
// NB (β6/NOTAT-1): skriptet kjøres kun av `npm run build` (prebuild-hooken) —
// `npm run dev` regenererer IKKE manifestet. Har du lagt til/fjernet klipp i
// public/audio/personas/ i dev, kjør `node scripts/generate-audio-manifest.mjs`
// manuelt (bevisst valg: dev-oppstart skal ikke betale skanne-kostnaden).
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Cue-settet hver persona skal ha: manuskriptets 11 cues + innspilt start_321. */
export const REQUIRED_CUES = Object.freeze([
  'intro',
  'go-1',
  'go-2',
  'go-3',
  'halfway',
  'last5',
  'rest',
  'finish',
  'bro-neste',
  'bro-naa',
  'bro-resync',
  'start_321',
]);

/**
 * Leser øvelses-id-ene ut av kategorifilene i src/data/exercises/ (bodyweight,
 * kettlebell, ...). Regex i stedet for TS-import fordi skriptet må kjøre med
 * ren node uten transpilering; id-formatet er låst av exerciseSchema (kebab-case).
 * index.ts hoppes over (bare re-eksport/validering, ingen id-definisjoner).
 */
export function extractExerciseIds(exercisesDir) {
  const ids = [];
  const entries = readdirSync(exercisesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name === 'index.ts') continue;
    const source = readFileSync(join(exercisesDir, entry.name), 'utf8');
    for (const match of source.matchAll(/^\s*id:\s*'([a-z0-9-]+)'/gm)) {
      ids.push(match[1]);
    }
  }
  return [...new Set(ids)];
}

/**
 * Skanner audioDir og bygger manifestet. Ren funksjon over filsystem-input
 * (testbar mot fixture-mapper): returnerer { manifest, warnings } — kalleren
 * (main under) skriver fil og logger advarslene.
 */
export function generateManifest({ audioDir, exerciseIds }) {
  const warnings = [];
  if (!existsSync(audioDir)) {
    warnings.push(`[audio-manifest] lydkatalogen finnes ikke: ${audioDir} — tomt manifest`);
    return { manifest: {}, warnings };
  }

  const manifest = {};
  const personas = readdirSync(audioDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const persona of personas) {
    const files = new Set(
      readdirSync(join(audioDir, persona)).filter((f) => f.endsWith('.mp3'))
    );
    // Nøkkel = filnavn uten .mp3 — samme nøkkelrom som getPersonaClipKey bruker
    manifest[persona] = Object.fromEntries(
      [...files]
        .sort()
        .map((f) => [f.replace(/\.mp3$/, ''), `/audio/personas/${persona}/${f}`])
    );
    for (const cue of REQUIRED_CUES) {
      if (!files.has(`${cue}.mp3`)) {
        warnings.push(`[audio-manifest] ${persona}: mangler ${cue}.mp3`);
      }
    }
    const missingExercises = exerciseIds.filter((id) => !files.has(`exercise-${id}.mp3`));
    if (missingExercises.length > 0) {
      warnings.push(
        `[audio-manifest] ${persona}: mangler ${missingExercises.length} øvelsesklipp ` +
          `(${missingExercises.slice(0, 3).join(', ')}${missingExercises.length > 3 ? ', …' : ''})`
      );
    }
  }
  return { manifest, warnings };
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const audioDir = join(root, 'public', 'audio', 'personas');
  const outFile = join(root, 'src', 'data', 'personaAudioManifest.json');

  const exerciseIds = extractExerciseIds(join(root, 'src', 'data', 'exercises'));
  const { manifest, warnings } = generateManifest({ audioDir, exerciseIds });

  for (const warning of warnings) console.warn(warning);
  writeFileSync(outFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `[audio-manifest] skrev ${outFile} (${Object.keys(manifest).length} personas, ` +
      `${warnings.length} advarsler)`
  );
}

// Kjør kun som CLI (node scripts/generate-audio-manifest.mjs) — ikke ved import
// fra testene. pathToFileURL håndterer Windows-stier korrekt.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
