import { WorkoutTemplate } from '../types/workout';
import { ExerciseItem } from '../schemas/exerciseSchema';
import { EXERCISE_LIBRARY } from '../data/exercises';
import { WeeklyGoalProgress } from './weeklyGoalService';

export interface CoachMessage {
  id: string;
  sender: 'coach' | 'user';
  text: string;
  timestamp: number;
}

export interface CoachContext {
  userName?: string;
  weeklyGoal?: WeeklyGoalProgress | null;
  workoutHistory?: any[];
  currentWorkout?: WorkoutTemplate | null;
  selectedExercise?: ExerciseItem | null;
}

/**
 * Intelligent lokal kunnskapsbase og regelmotor for Astrid AI-trener.
 * Fungerer 100% offline uten eksterne serverkall (maksimalt personvern).
 * Kan også koble seg på Chrome Prompt API (window.ai) dersom tilgjengelig.
 */
class LocalAiCoachService {
  /**
   * Genererer en personlig velkomsthilsen eller dagsstatus fra treneren.
   */
  public generateDailyBriefing(context: CoachContext): string {
    const hours = new Date().getHours();
    const greeting = hours < 10 ? 'God morgen!' : hours < 17 ? 'God ettermiddag!' : 'God kveld!';
    const completedCount = context.weeklyGoal?.completedThisWeek ?? 0;
    const targetCount = context.weeklyGoal?.goal ?? 3;

    if (completedCount >= targetCount) {
      return `${greeting} Rått levert! Du har nådd ukesmålet ditt på ${targetCount} økter. I dag kan vi kjøre en rolig mobilitetsøkt eller ta en bonusøkt for å feire!`;
    }

    if (completedCount === 0) {
      return `${greeting} Klar for ukens første økt? Husk at 10 minutter er uendelig mye bedre enn ingenting. Skal vi starte med en kjapp runde?`;
    }

    const remaining = targetCount - completedCount;
    return `${greeting} Du har gjennomført ${completedCount} av ${targetCount} økter denne uken. Bare ${remaining} økt${remaining > 1 ? 'er' : ''} igjen til målet! Hva har du lyst til å trene i dag?`;
  }

  /**
   * Genererer et eksperttips tilpasset en spesifikk øvelse.
   */
  public getExerciseTip(exerciseId: string): string {
    const exercise = EXERCISE_LIBRARY.find((e) => e.id === exerciseId);
    if (!exercise) {
      return 'Fokuser på jevn pust og kontrollert bevegelse gjennom hele øvelsen.';
    }

    if (exercise.vanligeFeil?.nb && exercise.vanligeFeil.nb.length > 0) {
      const feil = exercise.vanligeFeil.nb[0];
      return `Tips for ${exercise.navn.nb}: Pass spesielt på å unngå ${feil.toLowerCase()}. Hold kjernen stram og beveg deg kontrollert!`;
    }

    return `Fokuser på god kontakt med ${exercise.muskler.primær.join(' og ')} gjennom hele bevegelsesbanen.`;
  }

  /**
   * Behandler et spørsmål eller kommando fra brukeren lokalt.
   */
  public async askCoach(prompt: string, context: CoachContext): Promise<string> {
    const p = prompt.toLowerCase().trim();

    // 1. Sjekk om eksperimentell on-device window.ai (Chrome Built-in AI) er tilgjengelig
    if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
      try {
        const session = await (window as any).ai.languageModel.create({
          systemPrompt: 'Du er Astrid, en vennlig, motiverende og faglig dyktig personlig trener i treningsappen MinTrener. Svar kort, presist og motiverende på norsk.',
        });
        const result = await session.prompt(prompt);
        session.destroy();
        if (result && result.trim()) return result.trim();
      } catch {
        // Fallback til lokal regelmotor
      }
    }

    // 2. Regel- og semantisk basert lokal intelligens (Lynrask & 100% offline)
    if (p.includes('hva bør jeg trene') || p.includes('forslag') || p.includes('anbefal')) {
      const comp = context.weeklyGoal?.completedThisWeek || 0;
      if (comp % 2 === 0) {
        return 'I dag anbefaler jeg en 15-minutters helkroppsøkt med kettlebell eller frivekter for å bygge styrke og forbrenning!';
      } else {
        return 'Hva med en intensiv kroppsvekt-økt (f.eks. Tabata HIIT) eller en god mobilitetsøkt for å myke opp hofter og skuldre?';
      }
    }

    if (p.includes('korsrygg') || p.includes('vondt') || p.includes('rygg')) {
      return 'Dersom du kjenner det i korsryggen: 1) Sjekk at du ikke svaier ukontrollert i planke eller markløft. 2) Stram setet og magen som om du skal ta imot et støt. 3) Kjør en runde med "Katte-ku" og "Hofteåpner 90/90" for å avlaste trykket.';
    }

    if (p.includes('knebøy') || p.includes('squat')) {
      return 'For en perfekt knebøy: Stå med føttene i skulderbredde, skyv knærne i samme retning som tærne peker, og gå så dypt du klarer med flat rygg og hælene i gulvet!';
    }

    if (p.includes('markløft') || p.includes('deadlift')) {
      return 'I rumensk markløft skal bevegelsen starte fra hoften: Skyv rumpa rett bakover som om du skal lukke en bildør bak deg, mens vektene glir tett inntil lårene!';
    }

    if (p.includes('progresjon') || p.includes('framgang') || p.includes('tyngre')) {
      return 'For jevn progresjon: Når du klarer alle intervallene med overskudd, kan du øke arbeidstiden med 5 sekunder, redusere hvilen med 5 sekunder, eller øke vekten på manualen/kula med 2 kg.';
    }

    if (p.includes('støl') || p.includes('restitusjon') || p.includes('hvile')) {
      return 'Stølhet er helt normalt! Aktiv restitusjon med lett gåing, god søvn, rikelig med vann og 5 minutter mobilitetstrening hjelper musklene å restituere raskere.';
    }

    if (p.includes('motivasjon') || p.includes('tungt') || p.includes('orker ikke')) {
      return 'Husk regelen om 5 minutter: Bestem deg for å gjennomføre bare 5 minutter av økten. Hvis du fortsatt vil stoppe da, er det helt greit – men i 9 av 10 tilfeller vil du fullføre!';
    }

    return 'Veldig godt spørsmål! Som din personlige trener anbefaler jeg å fokusere på god teknikk, jevnlig trening 2-3 ganger i uken, og å lytte til kroppen. Skal vi sette i gang en god økt sammen?';
  }
}

export const localAiCoach = new LocalAiCoachService();
