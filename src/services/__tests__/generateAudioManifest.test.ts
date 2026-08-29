// @vitest-environment node
// B3 Task β5: byggtids-generatoren for persona-lydmanifestet.
// Node-miljø (ikke jsdom): generatoren er et byggeskript som leser filsystemet.
// Fixture-mapper via mkdtemp — vi rører ALDRI de ekte filene i public/.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  REQUIRED_CUES,
  extractExerciseIds,
  generateManifest,
} from '../../../scripts/generate-audio-manifest.mjs';

const EXERCISE_IDS_FIXTURE = ['kneboy', 'burpees'];

/** Lager en persona-mappe i fixture-roten med de gitte mp3-filnavnene. */
function makePersonaDir(root: string, persona: string, files: string[]): void {
  mkdirSync(join(root, persona), { recursive: true });
  for (const f of files) {
    writeFileSync(join(root, persona, f), '');
  }
}

/** Komplett filsett for en persona: alle påkrevde cues + alle øvelsesklipp. */
function completeFileSet(exerciseIds: string[]): string[] {
  return [
    ...REQUIRED_CUES.map((cue) => `${cue}.mp3`),
    ...exerciseIds.map((id) => `exercise-${id}.mp3`),
  ];
}

describe('generate-audio-manifest – generateManifest', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'audio-manifest-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('komplett persona gir ingen advarsler og riktig {persona: {cueKey: url}}-form', () => {
    makePersonaDir(root, 'hardcore', completeFileSet(EXERCISE_IDS_FIXTURE));

    const { manifest, warnings } = generateManifest({
      audioDir: root,
      exerciseIds: EXERCISE_IDS_FIXTURE,
    });

    expect(warnings).toEqual([]);
    expect(manifest['hardcore']['go-2']).toBe('/audio/personas/hardcore/go-2.mp3');
    expect(manifest['hardcore']['start_321']).toBe('/audio/personas/hardcore/start_321.mp3');
    expect(manifest['hardcore']['exercise-kneboy']).toBe(
      '/audio/personas/hardcore/exercise-kneboy.mp3'
    );
    // Nøklene er filnavn uten .mp3 — samme nøkkelrom som getPersonaClipKey bruker
    expect(Object.keys(manifest['hardcore'])).toHaveLength(
      REQUIRED_CUES.length + EXERCISE_IDS_FIXTURE.length
    );
  });

  it('manglende cue-fil gir byggtidsadvarsel med persona + cue-navn (ikke feil)', () => {
    const files = completeFileSet(EXERCISE_IDS_FIXTURE).filter((f) => f !== 'go-2.mp3');
    makePersonaDir(root, 'hardcore', files);

    const { manifest, warnings } = generateManifest({
      audioDir: root,
      exerciseIds: EXERCISE_IDS_FIXTURE,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('hardcore');
    expect(warnings[0]).toContain('go-2');
    // Manifestet inneholder fortsatt det som faktisk finnes
    expect(manifest['hardcore']['go-1']).toBe('/audio/personas/hardcore/go-1.mp3');
    expect(manifest['hardcore']['go-2']).toBeUndefined();
  });

  it('manglende øvelsesklipp gir én oppsummerende advarsel med antall og id-er', () => {
    const files = completeFileSet(EXERCISE_IDS_FIXTURE).filter(
      (f) => f !== 'exercise-burpees.mp3'
    );
    makePersonaDir(root, 'romsdal', files);

    const { warnings } = generateManifest({
      audioDir: root,
      exerciseIds: EXERCISE_IDS_FIXTURE,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('romsdal');
    expect(warnings[0]).toContain('1');
    expect(warnings[0]).toContain('burpees');
  });

  it('ekstra filer tolereres uten advarsel og tas med i manifestet', () => {
    makePersonaDir(root, 'boyband', [...completeFileSet(EXERCISE_IDS_FIXTURE), 'bonus.mp3']);

    const { manifest, warnings } = generateManifest({
      audioDir: root,
      exerciseIds: EXERCISE_IDS_FIXTURE,
    });

    expect(warnings).toEqual([]);
    expect(manifest['boyband']['bonus']).toBe('/audio/personas/boyband/bonus.mp3');
  });

  it('ikke-mp3-filer ignoreres', () => {
    makePersonaDir(root, 'hardcore', [...completeFileSet(EXERCISE_IDS_FIXTURE), 'notat.txt']);

    const { manifest } = generateManifest({
      audioDir: root,
      exerciseIds: EXERCISE_IDS_FIXTURE,
    });

    expect(manifest['hardcore']['notat']).toBeUndefined();
  });

  it('manglende lydkatalog gir tomt manifest med advarsel — aldri kræsj', () => {
    const { manifest, warnings } = generateManifest({
      audioDir: join(root, 'finnes-ikke'),
      exerciseIds: EXERCISE_IDS_FIXTURE,
    });

    expect(manifest).toEqual({});
    expect(warnings).toHaveLength(1);
  });

  it('flere personas skannes uavhengig', () => {
    makePersonaDir(root, 'hardcore', completeFileSet(EXERCISE_IDS_FIXTURE));
    makePersonaDir(root, 'romsdal', ['intro.mp3']);

    const { manifest, warnings } = generateManifest({
      audioDir: root,
      exerciseIds: EXERCISE_IDS_FIXTURE,
    });

    expect(Object.keys(manifest).sort()).toEqual(['hardcore', 'romsdal']);
    // hardcore komplett → alle advarslene gjelder romsdal
    expect(warnings.every((w) => w.includes('romsdal'))).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('generate-audio-manifest – extractExerciseIds (forventet-listen fra data, ikke duplisert)', () => {
  it('leser øvelses-id-ene fra de ekte kategorifilene i src/data/exercises/', () => {
    // Forventet-listen skal komme fra dataene som allerede finnes — kjør mot
    // den ekte katalogen og pin antallet (25 øvelser i biblioteket i dag).
    const ids = extractExerciseIds(join(process.cwd(), 'src', 'data', 'exercises'));

    expect(ids).toHaveLength(25);
    expect(ids).toContain('kneboy');
    expect(ids).toContain('kettlebell-swing');
    expect(ids).toContain('verdens-beste-toyeovelse');
    // Ingen duplikater
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('generate-audio-manifest – REQUIRED_CUES', () => {
  // Cue-id-settet er uendret av Oppgave B (start_321_short flyttet bare kilde:
  // fra hale-trim av innspillingen til egen TTS-cue i manuskriptet).
  it('dekker de 12 manuskript-cuene (inkl. start_321_short) + innspilt start_321 (fasit: scripts/voicebank-manuskript.json)', () => {
    expect([...REQUIRED_CUES].sort()).toEqual(
      [
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
        'start_321_short',
      ].sort()
    );
  });
});
