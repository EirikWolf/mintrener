import { WorkoutTemplate } from '../types/workout';
import { ExerciseItem } from '../schemas/exerciseSchema';
import { EXERCISE_LIBRARY } from '../data/exercises';
import { WeeklyGoalProgress } from './weeklyGoalService';
import { getHeartRateZone, getUserMaxHeartRate } from './heartRateZoneService';

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

export type WorkoutRating = 'for_lett' | 'passe' | 'for_tungt';

/**
 * Kontekst brukt til å generere Astrids personlige tilbakemelding rett
 * etter en fullført økt (se WorkoutSummary.tsx). Alle felt utover
 * `workoutName` og `durationSeconds` er valgfrie - jo mer kontekst, jo mer
 * treffsikker og personlig blir tilbakemeldingen.
 */
export interface WorkoutSummaryFeedbackContext {
  workoutName: string;
  durationSeconds: number;
  isNewPr?: boolean;
  rating?: WorkoutRating | null;
  weeklyGoal?: WeeklyGoalProgress | null;
  /** Antall dager på rad brukeren har trent, inkludert denne økten. */
  streakDays?: number;
  /** Kun satt når et pulsbelte var tilkoblet under økten. */
  avgHeartRate?: number | null;
  /** Kun satt når et pulsbelte var tilkoblet under økten. */
  maxHeartRate?: number | null;
}

/**
 * Intelligent lokal kunnskapsbase og regelmotor for Astrid AI-trener.
 * Fungerer 100% offline uten eksterne serverkall (maksimalt personvern).
 * Kan også koble seg på Chrome Prompt API (window.ai) dersom tilgjengelig.
 */
/**
 * Slår spørsmålet opp i øvelseskatalogen.
 *
 * Regelmotoren under hadde åtte nøkkelord-regler, hvorav to gjaldt en øvelse.
 * «Hvordan gjør jeg planken?» og «Hva er push-ups?» traff ingen av dem og fikk
 * samme generiske svar — mens katalogens 74 øvelser hver har `instruks` steg
 * for steg og `vanligeFeil`.
 *
 * Svaret lå i dataene. Dette er et oppslag, ikke en modell.
 *
 * Returnerer null når spørsmålet ikke handler om en øvelse, slik at de øvrige
 * reglene får slippe til.
 */
export function answerFromCatalogue(question: string): string | null {
  const q = question.toLowerCase().trim();
  if (!q) return null;

  // Ordgrenser: uten dem ville «liv» i «et aktivt liv» truffet en øvelse, og
  // coachen svart om trening på nesten hvilket som helst spørsmål.
  const treffer = (navn: string) => {
    const n = navn.toLowerCase();
    if (n.length < 4) return false;
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Norsk bøyning: brukeren skriver «planken», ikke «planke». Suffikset er
    // valgfritt og dekker bestemt form og flertall.
    const bøyning = '(ene|en|et|er|a|e|n|s)?';
    return new RegExp(`(^|[^a-zà-ÿ])${escaped}${bøyning}([^a-zà-ÿ]|$)`, 'i').test(q);
  };

  // Lengste navn vinner: «sideplanke» inneholder «planke», og spør brukeren om
  // sideplanke skal hun ikke få svar om vanlig planke.
  const kandidater = EXERCISE_LIBRARY.filter(
    (ex) => treffer(ex.navn.nb) || (ex.navn.en ? treffer(ex.navn.en) : false)
  ).sort((a, b) => b.navn.nb.length - a.navn.nb.length);

  const ex = kandidater[0];
  if (!ex) return null;

  const linjer: string[] = [`${ex.navn.nb} — slik gjør du den:`];
  (ex.instruks?.nb ?? []).forEach((steg, i) => linjer.push(`${i + 1}. ${steg}`));

  const feil = ex.vanligeFeil?.nb ?? [];
  if (feil.length > 0) {
    linjer.push('', `Vanlige feil: ${feil.join('. ')}.`);
  }

  return linjer.join('\n');
}

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

    // 2. Øvelseskatalogen: spør brukeren om en konkret øvelse, ligger svaret
    //    allerede i dataene våre — steg for steg, med vanlige feil.
    const fraKatalogen = answerFromCatalogue(prompt);
    if (fraKatalogen) return fraKatalogen;

    // 3. Regel- og semantisk basert lokal intelligens (Lynrask & 100% offline)
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

  /**
   * Genererer Astrids personlige tilbakemelding rett etter en fullført
   * økt. Ren regelmotor - deterministisk gitt samme kontekst, ingen
   * nettverk eller window.ai. Prioritert etter hva som er mest relevant
   * å fremheve akkurat nå (ny PR slår alt, deretter ukesmål, osv.), og
   * kombinerer maks to aspekter per melding for å holde den kort.
   */
  public generateWorkoutSummaryFeedback(context: WorkoutSummaryFeedbackContext): string {
    const streakDays = context.streakDays ?? 0;
    const hasStreak = streakDays >= 3;
    const hasHeartRate = context.avgHeartRate !== undefined && context.avgHeartRate !== null;
    const streakSuffix = hasStreak ? this.streakClause(streakDays) : '';

    if (context.isNewPr) {
      return `Ny personlig rekord i ${context.workoutName}! Dette er resultatet av jevn innsats – nyt følelsen, du har all grunn til å være stolt!${streakSuffix}`;
    }

    if (context.weeklyGoal?.isGoalMet && context.weeklyGoal.completedThisWeek === context.weeklyGoal.goal) {
      return `Ukesmålet er i boks! Du har fullført ${context.weeklyGoal.goal} økter denne uken, og denne økten var den som avgjorde det. Godt jobba!${streakSuffix}`;
    }

    if (context.rating) {
      return this.buildRatingFeedback(context, hasStreak, hasHeartRate);
    }

    if (hasStreak) {
      const hrSuffix = hasHeartRate ? this.heartRateClause(context) : '';
      return `${context.streakDays} dager på rad – for en fin streak! Kontinuitet er nøkkelen til varige resultater, og du bygger vaner som varer.${hrSuffix}`;
    }

    if (hasHeartRate) {
      return this.buildHeartRateFeedback(context);
    }

    return this.durationFallback(context.durationSeconds);
  }

  private buildRatingFeedback(
    context: WorkoutSummaryFeedbackContext,
    hasStreak: boolean,
    hasHeartRate: boolean
  ): string {
    const base =
      context.rating === 'for_tungt'
        ? 'Den kjentes tung ut i dag, og det er helt greit – kroppen forteller deg noe viktig. Prioriter god søvn, rikelig med vann og lett tøying de neste dagene, så du er klar til neste økt.'
        : context.rating === 'for_lett'
        ? 'Den føltes lett i dag – bra tegn på at formen er god! Neste gang kan du legge på en ekstra runde eller noen sekunder per intervall for å presse deg litt lenger.'
        : 'Passe belastning – akkurat sånn du ønsker det! Denne balansen mellom innsats og kontroll er oppskriften på jevn fremgang over tid.';

    if (hasStreak) return base + this.streakClause(context.streakDays ?? 0);
    if (hasHeartRate) return base + this.heartRateClause(context);
    return base;
  }

  private buildHeartRateFeedback(context: WorkoutSummaryFeedbackContext): string {
    const avgHeartRate = context.avgHeartRate ?? 0;
    const durationRemark =
      context.durationSeconds > 600 ? 'Solid utholdenhet i dag!' : 'Kjapt og effektivt gjennomført!';
    return `Snittpulsen din var ${avgHeartRate} slag/min${this.zoneSuffix(avgHeartRate)}. ${durationRemark}`;
  }

  private streakClause(streakDays: number): string {
    return ` Og med ${streakDays} dager på rad er du virkelig i støtet!`;
  }

  private heartRateClause(context: WorkoutSummaryFeedbackContext): string {
    const avgHeartRate = context.avgHeartRate ?? 0;
    const peak = context.maxHeartRate ? ` Makspuls under økten var ${context.maxHeartRate}.` : '';
    return ` Snittpulsen lå på ${avgHeartRate}${this.zoneSuffix(avgHeartRate)}.${peak}`;
  }

  private zoneSuffix(avgHeartRate: number): string {
    const zone = getHeartRateZone(avgHeartRate, getUserMaxHeartRate());
    return `, i ${zone.label.toLowerCase()} (${zone.name})`;
  }

  private durationFallback(durationSeconds: number): string {
    if (durationSeconds <= 180) {
      return 'Kort og effektiv! Selv en rask økt som dette bygger gode vaner – hver eneste gang teller.';
    }
    if (durationSeconds <= 600) {
      return 'Kjapt, effektivt og godt levert! Kontinuitet er nøkkelen til langsiktig styrke og form.';
    }
    return 'Fantastisk innsats og solid utholdenhet! Husk å drikke litt vann og ta 2 minutter med rolig tøying nå.';
  }
}

export const localAiCoach = new LocalAiCoachService();
