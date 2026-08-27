/**
 * AI Workout Generator Service
 * Genererer skreddersydde økter basert på dagsform, tidsramme, utstyr og eventuelle skader.
 */

import { EXERCISE_LIBRARY } from '../data/exercises';
import { WorkoutTemplate, IntervalItem } from '../types/workout';

export interface AiWorkoutPrompt {
  durationMinutes: number; // 3 - 30 minutter
  focus: 'helkropp' | 'kontor_nakke' | 'kjerne' | 'bein' | 'puls' | 'rolig_strekk' | 'styrke';
  equipment?: 'none' | 'chair' | 'mat' | 'dumbbells';
  energyLevel?: 'lav' | 'middels' | 'høy';
  avoidInjuries?: string[]; // f.eks. ['knær', 'korsrygg', 'skuldre', 'hopp']
}

export function generateCustomAiWorkout(prompt: AiWorkoutPrompt): WorkoutTemplate {
  const duration = Math.max(2, Math.min(45, prompt.durationMinutes));
  const energy = prompt.energyLevel || 'middels';
  const avoid = prompt.avoidInjuries || [];

  // 1. Filtrer biblioteket for egnede øvelser
  let candidates = EXERCISE_LIBRARY.filter((ex) => {
    // Unngå hopp hvis bruker har vonde knær eller 'hopp' i unngå-listen
    if (avoid.includes('hopp') || avoid.includes('knær')) {
      if (ex.id.includes('hopp') || ex.id.includes('burpee') || ex.id.includes('jump')) {
        return false;
      }
    }

    // Unngå skuldre/håndledd ved behov
    if (avoid.includes('skuldre') || avoid.includes('håndledd')) {
      if (ex.id.includes('push-up') || ex.id.includes('planke') || ex.muskler?.primær?.includes('skuldre')) {
        return false;
      }
    }

    // Unngå korsrygg-kompresjon
    if (avoid.includes('korsrygg')) {
      if (ex.id.includes('deadlift') || ex.id.includes('superman')) {
        return false;
      }
    }

    return true;
  });

  if (candidates.length < 4) {
    candidates = EXERCISE_LIBRARY; // Fallback
  }

  // 2. Velg øvelser basert på fokus
  let selectedExercises = candidates.slice(0, 4);

  if (prompt.focus === 'kontor_nakke') {
    const neckBack = candidates.filter((e) =>
      e.id.includes('nakke') || e.id.includes('skulder') || e.id.includes('rygg') || e.kategori === 'mobilitet'
    );
    if (neckBack.length >= 3) selectedExercises = neckBack.slice(0, 5);
  } else if (prompt.focus === 'kjerne') {
    const core = candidates.filter((e) => e.muskler?.primær?.includes('kjerne') || e.muskler?.primær?.includes('mage') || e.id.includes('plank'));
    if (core.length >= 3) selectedExercises = core.slice(0, 5);
  } else if (prompt.focus === 'bein') {
    const legs = candidates.filter((e) => e.muskler?.primær?.includes('lår') || e.muskler?.primær?.includes('sete') || e.id.includes('kneboy') || e.id.includes('utfall'));
    if (legs.length >= 3) selectedExercises = legs.slice(0, 5);
  } else if (prompt.focus === 'rolig_strekk') {
    const stretch = candidates.filter((e) => e.kategori === 'mobilitet');
    if (stretch.length >= 3) selectedExercises = stretch.slice(0, 5);
  } else {
    // Helkropp / Balansert
    const mobility = candidates.find((e) => e.kategori === 'mobilitet') || candidates[0];
    const upper = candidates.find((e) => e.muskler?.primær?.includes('bryst') || e.id.includes('push-up')) || candidates[1];
    const lower = candidates.find((e) => e.muskler?.primær?.includes('lår') || e.id.includes('kneboy')) || candidates[2];
    const core = candidates.find((e) => e.muskler?.primær?.includes('mage') || e.id.includes('plank')) || candidates[3];
    const fin = candidates.find((e) => e.id !== mobility.id && e.kategori === 'mobilitet') || candidates[4] || candidates[0];

    selectedExercises = [mobility, upper, lower, core, fin].filter(Boolean);
  }

  // 3. Beregn intervalltider og runder basert på ønsket varighet og energi
  let workSeconds = 30;
  let restSeconds = 15;
  let rounds = 1;

  if (energy === 'lav') {
    workSeconds = 35;
    restSeconds = 25;
  } else if (energy === 'høy') {
    workSeconds = 40;
    restSeconds = 15;
  }

  const cycleDuration = selectedExercises.length * (workSeconds + restSeconds);
  const targetTotalSeconds = duration * 60;
  rounds = Math.max(1, Math.round(targetTotalSeconds / cycleDuration));

  const items: IntervalItem[] = selectedExercises.map((ex, idx) => ({
    id: `item-ai-${ex.id}-${idx}`,
    exercise: {
      id: ex.id,
      name: ex.navn.nb,
      category: ex.kategori === 'kroppsvekt' ? 'bodyweight' : ex.kategori === 'mobilitet' ? 'mobility' : 'cardio',
    },
    workDurationSeconds: workSeconds,
    restDurationSeconds: restSeconds,
  }));

  const focusTitles: Record<string, string> = {
    helkropp: 'Skreddersydd Helkroppsøkt',
    kontor_nakke: 'Nakke, Skuldre & Kontoravbrekk',
    kjerne: 'Fokus Kjerne & Stabilitet',
    bein: 'Styrke Bein & Sete',
    puls: 'Kondisjon & Sirkulasjon',
    rolig_strekk: 'Rolig Mobilitet & Pust',
    styrke: 'Kroppsvekt Styrkeøkt',
  };

  return {
    id: `ai-workout-${Date.now()}`,
    name: `${focusTitles[prompt.focus] || 'Skreddersydd Økt'} (${duration} min)`,
    description: `Generert for ${energy} energinivå • ${rounds} runder • ${selectedExercises.length} øvelser`,
    type: 'custom',
    rounds,
    prepareDurationSeconds: 8,
    roundRestDurationSeconds: rounds > 1 ? 30 : 0,
    items,
  };
}
