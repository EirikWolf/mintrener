/**
 * Min Trener — Chatterbox-TTS Voice Batch Generator for Kitor
 * 
 * Genererer høykvalitets norske lydfiler (MP3) for alle øvelser, nedtellinger
 * og stemmelinjer ved hjelp av Chatterbox-TTS på Kitor (RTX 3090).
 * 
 * Bruk:
 *   npx tsx scripts/generateVoiceAudioBatch.ts [--dry-run] [--pilot] [--tone lek|rolig|gira|tørr]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VOICE_LINES } from '../src/data/voiceLines';
import { EXERCISE_LIBRARY } from '../src/data/exercises';

import { getKitorToken } from './kitorEnv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let kitorToken = '';
try {
  kitorToken = getKitorToken(ROOT_DIR);
} catch {
  // Kan være --dry-run
}
let kitorTtsUrl = process.env.KITOR_TTS_URL || 'https://kitor.tail49f298.ts.net/chatterbox/tts';

// Kommandolinjeargumenter
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isPilot = args.includes('--pilot');
const singleTone = args.find((a, i) => args[i - 1] === '--tone');
const selectedVoice = args.find((a, i) => args[i - 1] === '--voice') || 'Abigail.wav';

const OUTPUT_BASE_DIR = path.join(ROOT_DIR, 'public', 'audio');

interface AudioTask {
  id: string;
  category: 'countdown' | 'exercise' | 'line';
  tone?: string;
  text: string;
  outputPath: string;
  publicUrl: string;
}

function buildTaskList(): AudioTask[] {
  const tasks: AudioTask[] = [];

  // 1. Nedtellinger og korte kommandoer per tone
  const tones = singleTone ? [singleTone as keyof typeof VOICE_LINES] : (Object.keys(VOICE_LINES) as Array<keyof typeof VOICE_LINES>);

  for (const tone of tones) {
    const bank = VOICE_LINES[tone];
    if (!bank) continue;

    // 5-4-3-2-1 nedtellinger
    const defaultCountdown = ['Fem —', 'Fire —', 'Tre —', 'To —', 'Én —'];
    const numMap: Record<string, string> = {
      '5': 'Fem —', '4': 'Fire —', '3': 'Tre —', '2': 'To —', '1': 'Én —',
      'fem': 'Fem —', 'fire': 'Fire —', 'tre': 'Tre —', 'to': 'To —', 'en': 'Én —',
      'Fem': 'Fem —', 'Fire': 'Fire —', 'Tre': 'Tre —', 'To': 'To —', 'En': 'Én —',
      'fem!': 'Fem!', 'fire!': 'Fire!', 'tre!': 'Tre!', 'to!': 'To —', 'en!': 'Én —',
      'Fem!': 'Fem!', 'Fire!': 'Fire!', 'Tre!': 'Tre!', 'To!': 'To —', 'En!': 'Én —',
    };
    defaultCountdown.forEach((fallback, index) => {
      const rawText = bank.phases.countdown5to1[index] || fallback;
      const text = numMap[rawText.trim()] || rawText;
      const fileName = `${tone}-count-${5 - index}.mp3`;
      tasks.push({
        id: `count-${tone}-${5 - index}`,
        category: 'countdown',
        tone,
        text,
        outputPath: path.join(OUTPUT_BASE_DIR, 'countdown', fileName),
        publicUrl: `/audio/countdown/${fileName}`,
      });
    });

    // Start-linjer
    bank.phases.start.forEach((text, i) => {
      const fileName = `${tone}-start-${i + 1}.mp3`;
      tasks.push({
        id: `start-${tone}-${i + 1}`,
        category: 'line',
        tone,
        text,
        outputPath: path.join(OUTPUT_BASE_DIR, 'lines', tone, fileName),
        publicUrl: `/audio/lines/${tone}/${fileName}`,
      });
    });

    // Halvveis-linjer
    bank.phases.halfway.forEach((text, i) => {
      const fileName = `${tone}-halfway-${i + 1}.mp3`;
      tasks.push({
        id: `halfway-${tone}-${i + 1}`,
        category: 'line',
        tone,
        text,
        outputPath: path.join(OUTPUT_BASE_DIR, 'lines', tone, fileName),
        publicUrl: `/audio/lines/${tone}/${fileName}`,
      });
    });

    // Fullført-linjer
    bank.phases.finish.forEach((text, i) => {
      const fileName = `${tone}-finish-${i + 1}.mp3`;
      tasks.push({
        id: `finish-${tone}-${i + 1}`,
        category: 'line',
        tone,
        text,
        outputPath: path.join(OUTPUT_BASE_DIR, 'lines', tone, fileName),
        publicUrl: `/audio/lines/${tone}/${fileName}`,
      });
    });
  }

  // 2. Øvelsesnavn for biblioteket (f.eks. Knebøy, Froskehopp, Fjellklatrer)
  const exercises = isPilot ? EXERCISE_LIBRARY.slice(0, 5) : EXERCISE_LIBRARY;
  for (const ex of exercises) {
    const fileName = `${ex.id}.mp3`;
    tasks.push({
      id: `exercise-${ex.id}`,
      category: 'exercise',
      text: ex.navn.nb,
      outputPath: path.join(OUTPUT_BASE_DIR, 'exercises', fileName),
      publicUrl: `/audio/exercises/${fileName}`,
    });
  }

  return tasks;
}

async function generateAudio(task: AudioTask): Promise<boolean> {
  const dir = path.dirname(task.outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(task.outputPath)) {
    console.log(`⏩ Hopper over eksisterende: ${task.id} (${path.basename(task.outputPath)})`);
    return true;
  }

  const payload = {
    text: task.text,
    voice_mode: 'predefined',
    predefined_voice_id: selectedVoice,
    language: 'no',
    output_format: 'mp3',
  };

  try {
    console.log(`🎙️ Genererer [${task.id}]: "${task.text}" (stemme: ${selectedVoice})...`);
    const res = await fetch(kitorTtsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(kitorToken ? { Authorization: `Bearer ${kitorToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Feil fra Kitor TTS (${res.status}):`, errText);
      return false;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(task.outputPath, buffer);
    console.log(`✅ Lagret ${task.outputPath} (${Math.round(buffer.length / 1024)} KB)`);
    return true;
  } catch (err) {
    console.error(`❌ Nettverksfeil mot Kitor (${kitorTtsUrl}):`, err);
    return false;
  }
}

async function main() {
  console.log('====================================================');
  console.log('🎙️ Min Trener — Kitor Chatterbox-TTS Voice Generator');
  console.log('====================================================');
  console.log(`Kitor Endepunkt: ${kitorTtsUrl}`);
  console.log(`Dry Run: ${isDryRun ? 'JA' : 'NEI'}`);
  console.log(`Pilot: ${isPilot ? 'JA (kun 5 øvelser)' : 'NEI'}`);

  const tasks = buildTaskList();
  console.log(`\nTotalt antall lydklipp i kø: ${tasks.length}`);

  if (isDryRun) {
    console.log('\n--- Planlagte Lydfiler (Dry Run) ---');
    tasks.slice(0, 15).forEach((t) => {
      console.log(`  [${t.category}] ${t.id} -> "${t.text}" -> ${t.publicUrl}`);
    });
    console.log(`  ... og ${tasks.length - 15} flere filer.`);
    return;
  }

  let successCount = 0;
  let failCount = 0;

  const manifest: Record<string, string> = {};

  for (const task of tasks) {
    const ok = await generateAudio(task);
    if (ok) {
      manifest[task.id] = task.publicUrl;
      successCount++;
    } else {
      failCount++;
    }
  }

  // Skriv ut manifest-fil
  const manifestPath = path.join(ROOT_DIR, 'src', 'data', 'audioManifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n📁 Audio Manifest oppdatert: ${manifestPath}`);
  console.log(`🏁 Fullført! Generert: ${successCount}, Feilet: ${failCount}`);
}

main().catch(console.error);
