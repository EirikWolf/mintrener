import { ChallengeItem } from '../schemas/challengeSchema';
import { WorkoutTemplate } from '../types/workout';

/**
 * Hjelpefunksjon for å generere daglige plankeøkter
 */
function generatePlankChallenge(): ChallengeItem {
  const restDays = [4, 8, 12, 16, 20, 24, 28];
  const durations = [
    20, 25, 30, 0, 35, 40, 45, 0, 50, 60, 65, 0, 75, 85, 90, 0,
    100, 110, 120, 0, 130, 140, 150, 0, 160, 170, 180, 0, 180, 200,
  ];

  const dailyWorkouts = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);
    const dur = durations[i] || 60;

    const workout: WorkoutTemplate = {
      id: `plank-day-${day}`,
      name: `Planke Dag ${day}`,
      description: isRest ? 'Velfortjent hviledag' : `${dur} sekunder stabil planke`,
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            {
              id: `plank-item-${day}`,
              exercise: { id: 'planke', name: 'Planke', category: 'bodyweight' },
              workDurationSeconds: dur,
              restDurationSeconds: 0,
            },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Hviledag' : `Planke ${dur}s`,
      goalNote: isRest ? 'Restitusjon og lett gange' : `Hold i ${dur} sekunder`,
      workout,
    };
  });

  return {
    id: 'planke-30-dager',
    title: 'Planke 30 dager',
    category: 'styrke',
    durationDays: 30,
    description: 'Bygg en bunnsolid kjerne fra 20 sekunder til 3 minutter sammenhengende planke.',
    phases: [
      { name: 'Fase 1: Grunnlag', dayRange: [1, 7], description: 'Mestre teknikken fra 20s til 45s.' },
      { name: 'Fase 2: Bygging', dayRange: [8, 14], description: 'Nå 90 sekunders-merket.' },
      { name: 'Fase 3: Topping', dayRange: [15, 21], description: 'Passér 2 minutter stabil holdning.' },
      { name: 'Fase 4: Mestring', dayRange: [22, 30], description: 'Erobre 3 minutters planke!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-plank-master',
      name: 'Plankemester',
      icon: '🛡️',
    },
  };
}

/**
 * Hjelpefunksjon for å generere Pushups til 50
 */
function generatePushupsChallenge(): ChallengeItem {
  const restDays = [4, 8, 12, 16, 20, 24, 28];
  const targetReps = [
    5, 6, 8, 0, 10, 12, 15, 0, 16, 18, 20, 0, 22, 25, 28, 0,
    30, 32, 35, 0, 38, 40, 42, 0, 45, 48, 50, 0, 50, 55,
  ];

  const dailyWorkouts = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);
    const reps = targetReps[i] || 15;

    const workout: WorkoutTemplate = {
      id: `pushup-day-${day}`,
      name: `Armhevinger Dag ${day}`,
      description: isRest ? 'Hviledag for bryst og armer' : `${reps} repetisjoner armhevinger`,
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            {
              id: `pushup-item-${day}`,
              exercise: { id: 'push-ups', name: `${reps} Armhevinger`, category: 'bodyweight' },
              workDurationSeconds: Math.max(30, reps * 3),
              restDurationSeconds: 0,
            },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Hviledag' : `${reps} Push-ups`,
      goalNote: isRest ? 'Restitusjon og bryststrekk' : `Gjennomfør ${reps} armhevinger`,
      workout,
    };
  });

  return {
    id: 'pushups-til-50',
    title: 'Push-ups til 50',
    category: 'styrke',
    durationDays: 30,
    description: 'Systematisk opptrapping fra 5 til 50 strake armhevinger.',
    phases: [
      { name: 'Fase 1: Vekk brystet', dayRange: [1, 7], description: '5 til 15 reps med god form.' },
      { name: 'Fase 2: Volumøkning', dayRange: [8, 14], description: 'Bryt 25-reps sperren.' },
      { name: 'Fase 3: Utholdenhet', dayRange: [15, 21], description: 'Opp til 35 sammenhengende reps.' },
      { name: 'Fase 4: 50 Reps Mestring', dayRange: [22, 30], description: 'Klare 50 armhevinger i ett sett!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-pushup-beast',
      name: 'Push-up Titan',
      icon: '💪',
    },
  };
}

/**
 * Hjelpefunksjon for å generere Knebøy 30 dager
 */
function generateSquatChallenge(): ChallengeItem {
  const restDays = [4, 8, 12, 16, 20, 24, 28];
  const targetReps = [
    20, 25, 30, 0, 35, 40, 45, 0, 50, 55, 60, 0, 65, 70, 75, 0,
    80, 85, 90, 0, 95, 100, 105, 0, 110, 115, 120, 0, 125, 130,
  ];

  const dailyWorkouts = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);
    const reps = targetReps[i] || 30;

    const workout: WorkoutTemplate = {
      id: `squat-day-${day}`,
      name: `Knebøy Dag ${day}`,
      description: isRest ? 'Hviledag for beina' : `${reps} knebøy`,
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            {
              id: `squat-item-${day}`,
              exercise: { id: 'kneboy', name: `${reps} Knebøy`, category: 'bodyweight' },
              workDurationSeconds: Math.max(30, reps * 2),
              restDurationSeconds: 0,
            },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Hviledag' : `${reps} Knebøy`,
      goalNote: isRest ? 'Gå en tur og rist løs' : `Ta ${reps} dype knebøy`,
      workout,
    };
  });

  return {
    id: 'kneboy-30-dager',
    title: 'Knebøy 30 dager',
    category: 'styrke',
    durationDays: 30,
    description: 'Sterke lår og sete: Fra 20 til 130 knebøy på 30 dager.',
    phases: [
      { name: 'Fase 1: Aktivering', dayRange: [1, 7], description: '20 til 45 knebøy.' },
      { name: 'Fase 2: Styrkebygging', dayRange: [8, 14], description: 'Nå 75 knebøy.' },
      { name: 'Fase 3: Utholdenhet', dayRange: [15, 21], description: 'Passér 90 reps.' },
      { name: 'Fase 4: 100+ Klubb', dayRange: [22, 30], description: '100 til 130 knebøy!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-squat-king',
      name: 'Knebøy-Konge',
      icon: '🦵',
    },
  };
}

/**
 * 4. Kontorvanen 28 dager (28 dager, helgefri)
 */
function generateOfficeHabitChallenge(): ChallengeItem {
  const restDays = [6, 7, 13, 14, 20, 21, 27, 28]; // Hver helg fri!

  const dailyWorkouts = Array.from({ length: 28 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);

    const workout: WorkoutTemplate = {
      id: `office-day-${day}`,
      name: `Kontorvanen Dag ${day}`,
      description: isRest ? 'Helgefri og god helg!' : '3 minutters skrivebordsavbrekk',
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            // Navnene er katalogens, ikke våre egne. Fram til 2026-09-01 skrev
            // denne økta sitt eget `name` ved siden av ID-en, og alle tre pekte
            // på en annen øvelse enn de lovet: «Skulderrulling» var
            // skulder-dislocates (krever strikk), «Knebøy til stol» var vanlig
            // kneboy selv om stol-kneboy fantes, og «Stående ryggvri» var
            // katte-ku — på alle fire, på kontorgulvet.
            { id: `o-${day}-1`, exercise: { id: 'seated-skulder-rull', name: 'Sittende skulder- og nakkeavspenning', category: 'mobility' }, workDurationSeconds: 40, restDurationSeconds: 10 },
            { id: `o-${day}-2`, exercise: { id: 'stol-kneboy', name: 'Knebøy til stol (Box Squat)', category: 'bodyweight' }, workDurationSeconds: 40, restDurationSeconds: 10 },
            { id: `o-${day}-3`, exercise: { id: 'staende-ryggvri', name: 'Stående ryggvri', category: 'mobility' }, workDurationSeconds: 40, restDurationSeconds: 0 },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Helgefri ☕' : `Kontorøkt Dag ${day}`,
      goalNote: isRest ? 'Nyt helgen og koble helt av' : '3 minutter ved pulten',
      workout,
    };
  });

  return {
    id: 'kontorvanen-28-dager',
    title: 'Kontorvanen 28 dager',
    category: 'kontor',
    durationDays: 28,
    description: 'Etablér en fast microtrening-vane på jobb: 1 kort økt hver arbeidsdag, helgefri!',
    phases: [
      { name: 'Uke 1: Innkjøring', dayRange: [1, 7], description: 'Skap vanen ved pulten.' },
      { name: 'Uke 2: Flyt', dayRange: [8, 14], description: 'Mindre stivhet i nakke og skuldre.' },
      { name: 'Uke 3: Energi', dayRange: [15, 21], description: 'Økt ettermiddagsenergi.' },
      { name: 'Uke 4: Fast rutine', dayRange: [22, 28], description: 'Varig kontorhelse etablert!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-office-hero',
      name: 'Kontorhelten',
      icon: '💼',
    },
  };
}

/**
 * 5. Morgenmobilitet 28 dager
 */
function generateMorningMobilityChallenge(): ChallengeItem {
  const restDays = [7, 14, 21, 28];

  const dailyWorkouts = Array.from({ length: 28 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);

    const workout: WorkoutTemplate = {
      id: `morning-mob-day-${day}`,
      name: `Morgenmobilitet Dag ${day}`,
      description: isRest ? 'Hviledag med lett strekk' : '5 minutter myk morgenmobilitet',
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            { id: `mm-${day}-1`, exercise: { id: 'katte-ku', name: 'Katte-ku ryggstrekk', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 15 },
            { id: `mm-${day}-2`, exercise: { id: 'hofteapner-90-90', name: 'Hofteåpner 90/90', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 15 },
            { id: `mm-${day}-3`, exercise: { id: 'verdens-beste-toyeovelse', name: 'Verdens beste tøyeøvelse', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 0 },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Søndagsro' : `Morgenstrekk Dag ${day}`,
      goalNote: isRest ? 'Sov litt ekstra' : '5 minutter før frokost',
      workout,
    };
  });

  return {
    id: 'morgenmobilitet-28-dager',
    title: 'Morgenmobilitet 28 dager',
    category: 'mobilitet',
    durationDays: 28,
    description: 'Vekk kroppen mykt hver morgen. Si farvel til stiv rygg og stramme hofter.',
    phases: [
      { name: 'Uke 1: Myk oppstart', dayRange: [1, 7], description: 'Løsne opp i leddene.' },
      { name: 'Uke 2: Ryggsøylen', dayRange: [8, 14], description: 'Bedre rotasjon og holdning.' },
      { name: 'Uke 3: Hofteåpning', dayRange: [15, 21], description: 'Dypere bevegelsesutslag.' },
      { name: 'Uke 4: Smidig kropp', dayRange: [22, 28], description: 'Morgenfrisk og spenstig!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-morning-sun',
      name: 'Morgensol',
      icon: '🌅',
    },
  };
}

/**
 * 6. Hulekroppshold (Hollow Body) 30 dager
 */
function generateHollowHoldChallenge(): ChallengeItem {
  const restDays = [4, 8, 12, 16, 20, 24, 28];
  const durations = [
    15, 20, 25, 0, 30, 35, 40, 0, 45, 50, 55, 0, 60, 65, 70, 0,
    75, 80, 85, 0, 90, 95, 100, 0, 105, 110, 115, 0, 120, 120,
  ];

  const dailyWorkouts = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);
    const dur = durations[i] || 30;

    const workout: WorkoutTemplate = {
      id: `hollow-day-${day}`,
      name: `Hulekroppshold Dag ${day}`,
      description: isRest ? 'Hviledag for magemusklene' : `${dur} sekunder hollow hold`,
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            {
              id: `hh-${day}`,
              exercise: { id: 'hulekroppshold', name: 'Hulekroppshold', category: 'bodyweight' },
              workDurationSeconds: dur,
              restDurationSeconds: 0,
            },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Hviledag' : `Hollow Hold ${dur}s`,
      goalNote: isRest ? 'Pust med magen' : `Press korsryggen i bakken i ${dur}s`,
      workout,
    };
  });

  return {
    id: 'hollow-body-30-dager',
    title: 'Hollow Body 30 dager',
    category: 'styrke',
    durationDays: 30,
    description: 'Turnernes hemmelighet til ekstrem kjernestyrke. Fra 15s til 2 minutter.',
    phases: [
      { name: 'Fase 1: Korsrygg i gulvet', dayRange: [1, 7], description: '15s til 30s.' },
      { name: 'Fase 2: Stabilitet', dayRange: [8, 14], description: 'Nå 1 minutt.' },
      { name: 'Fase 3: Jernkjerne', dayRange: [15, 21], description: 'Opp til 85s.' },
      { name: 'Fase 4: Turnermester', dayRange: [22, 30], description: '2 minutter feilfri hulekropp!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-hollow-gymnast',
      name: 'Turnerkjernen',
      icon: '🤸',
    },
  };
}

/**
 * 7. Tabata Torment 28 dager
 */
function generateTabataTormentChallenge(): ChallengeItem {
  const restDays = [4, 7, 11, 14, 18, 21, 25, 28];

  const dailyWorkouts = Array.from({ length: 28 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);

    const workout: WorkoutTemplate = {
      id: `tabata-day-${day}`,
      name: `Tabata Torment Dag ${day}`,
      description: isRest ? 'Hviledag for lunger og puls' : '4 minutters full gass intervalløkt',
      type: 'tabata',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            { id: `tt-${day}-1`, exercise: { id: 'sprellmenn', name: 'Sprellmenn', category: 'cardio' }, workDurationSeconds: 20, restDurationSeconds: 10 },
            { id: `tt-${day}-2`, exercise: { id: 'kneboy', name: 'Knebøy', category: 'bodyweight' }, workDurationSeconds: 20, restDurationSeconds: 10 },
            { id: `tt-${day}-3`, exercise: { id: 'mountain-climbers', name: 'Mountain Climbers', category: 'cardio' }, workDurationSeconds: 20, restDurationSeconds: 10 },
            { id: `tt-${day}-4`, exercise: { id: 'push-ups', name: 'Push-ups', category: 'bodyweight' }, workDurationSeconds: 20, restDurationSeconds: 10 },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Pustepause' : `Tabata Dag ${day}`,
      goalNote: isRest ? 'Hvile og væskebalanse' : '20s jobb / 10s hvile',
      workout,
    };
  });

  return {
    id: 'tabata-torment-28-dager',
    title: 'Tabata Torment 28 dager',
    category: 'kondisjon',
    durationDays: 28,
    description: 'Rask forbrenning og rå kondisjon med 4 minutters eksplosive intervalløkter.',
    phases: [
      { name: 'Uke 1: Hjertepump', dayRange: [1, 7], description: 'Finn intervallrytmen.' },
      { name: 'Uke 2: Høyere tempo', dayRange: [8, 14], description: 'Flere reps per 20s.' },
      { name: 'Uke 3: Melkesyre', dayRange: [15, 21], description: 'Skyv terskelen videre.' },
      { name: 'Uke 4: Kondisjonsrakett', dayRange: [22, 28], description: 'Maksimal aerob kapasitet!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-tabata-fire',
      name: 'Ildpusteren',
      icon: '🔥',
    },
  };
}

/**
 * 8. Kettlebell Swing 10 000 (30 dager)
 */
function generateKettlebellChallenge(): ChallengeItem {
  const restDays = [5, 10, 15, 20, 25, 30];

  const dailyWorkouts = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);

    const workout: WorkoutTemplate = {
      id: `kb-day-${day}`,
      name: `Kettlebell Swing Dag ${day}`,
      description: isRest ? 'Hviledag for korsrygg og sete' : 'Kettlebell swings i sett',
      type: 'custom',
      rounds: 4,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 20,
      items: isRest
        ? []
        : [
            { id: `kb-item-${day}`, exercise: { id: 'kettlebell-swing', name: 'Kettlebell Swings', category: 'kettlebell' }, workDurationSeconds: 30, restDurationSeconds: 15 },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Hviledag' : `KB Swings Dag ${day}`,
      goalNote: isRest ? 'God tøyning' : 'Eksplosivt hoftekick',
      workout,
    };
  });

  return {
    id: 'kettlebell-swing-30-dager',
    title: 'Kettlebell Swing 30 dager',
    category: 'styrke',
    durationDays: 30,
    description: 'Den ultimate styrke- og kondisjonsutfordringen for bakside lår og sete.',
    phases: [
      { name: 'Fase 1: Hoftehengslet', dayRange: [1, 7], description: 'Perfeksjoner formen.' },
      { name: 'Fase 2: Akselerasjon', dayRange: [8, 14], description: 'Eksplosiv kraftutvikling.' },
      { name: 'Fase 3: Utholdenhet', dayRange: [15, 21], description: 'Større volum.' },
      { name: 'Fase 4: Jernmannen', dayRange: [22, 30], description: 'Rått volum og spenst!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-kettlebell-iron',
      name: 'Jernkula',
      icon: '⚓',
    },
  };
}

/**
 * 9. Balanse & Ettbensstyrke 28 dager
 */
function generateBalanceChallenge(): ChallengeItem {
  const restDays = [7, 14, 21, 28];

  const dailyWorkouts = Array.from({ length: 28 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);

    const workout: WorkoutTemplate = {
      id: `balance-day-${day}`,
      name: `Balanse Dag ${day}`,
      description: isRest ? 'Hviledag for anklene' : 'Ettbens stabilitet og balanse',
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            { id: `bal-${day}-1`, exercise: { id: 'sideplanke-hoyre', name: 'Sideplanke Høyre', category: 'mobility' }, workDurationSeconds: 30, restDurationSeconds: 10 },
            { id: `bal-${day}-2`, exercise: { id: 'sideplanke-venstre', name: 'Sideplanke Venstre', category: 'mobility' }, workDurationSeconds: 30, restDurationSeconds: 10 },
            { id: `bal-${day}-3`, exercise: { id: 'utfall-forover', name: 'Stående utfall', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 0 },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Hviledag' : `Balanse Dag ${day}`,
      goalNote: isRest ? 'Gå barbeint' : 'Fokus på ankelstabilitet',
      workout,
    };
  });

  return {
    id: 'balanse-28-dager',
    title: 'Balanse & Ettbensstyrke 28 dager',
    category: 'mobilitet',
    durationDays: 28,
    description: 'Stabile ankler, sterke knær og super balanse for løping og hverdag.',
    phases: [
      { name: 'Uke 1: Fotroten', dayRange: [1, 7], description: 'Fotbuestyrke.' },
      { name: 'Uke 2: Kne & Hoftestabilitet', dayRange: [8, 14], description: 'Ettbens balanse.' },
      { name: 'Uke 3: Dynamisk balanse', dayRange: [15, 21], description: 'Balanse i bevegelse.' },
      { name: 'Uke 4: Fjellstø', dayRange: [22, 28], description: 'Ustoppelig balansekontroll!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-balance-guru',
      name: 'Balansemester',
      icon: '🦩',
    },
  };
}

/**
 * 10. Kveldsro & God Natt 28 dager
 */
function generateNightCalmChallenge(): ChallengeItem {
  const restDays = [7, 14, 21, 28];

  const dailyWorkouts = Array.from({ length: 28 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);

    const workout: WorkoutTemplate = {
      id: `night-day-${day}`,
      name: `Kveldsro Dag ${day}`,
      description: isRest ? 'God natt-ro' : 'Rolig tøyning og dyp pust før søvn',
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            { id: `nc-${day}-1`, exercise: { id: 'katte-ku', name: 'Kattestrekk i rolig tempo', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 15 },
            { id: `nc-${day}-2`, exercise: { id: 'hofteapner-90-90', name: 'Hofteåpner og ro', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 15 },
            { id: `nc-${day}-3`, exercise: { id: 'verdens-beste-toyeovelse', name: 'Dyp bryståpner & pust', category: 'mobility' }, workDurationSeconds: 45, restDurationSeconds: 0 },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Søvn & Ro' : `Kveldsro Dag ${day}`,
      goalNote: isRest ? 'Legg deg tidlig' : 'Gjøres 20 min før leggetid',
      workout,
    };
  });

  return {
    id: 'kveldsro-28-dager',
    title: 'Kveldsro & God Natt 28 dager',
    category: 'mobilitet',
    durationDays: 28,
    description: 'Ro ned nervesystemet før leggetid for dypere søvn og bedre restitusjon.',
    phases: [
      { name: 'Uke 1: Senk skuldrene', dayRange: [1, 7], description: 'Pust og ro.' },
      { name: 'Uke 2: Slipp spenninger', dayRange: [8, 14], description: 'Løsne nakke og rygg.' },
      { name: 'Uke 3: Dyp hvile', dayRange: [15, 21], description: 'Kroppen faller til ro.' },
      { name: 'Uke 4: Søvnharmoni', dayRange: [22, 28], description: 'Optimal kveldsrutine!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-night-sleep',
      name: 'Nattugla',
      icon: '🌙',
    },
  };
}

/**
 * 11. Familie-utfordringen 28 dager
 */
function generateFamilyChallenge(): ChallengeItem {
  const restDays = [6, 7, 13, 14, 20, 21, 27, 28];

  const dailyWorkouts = Array.from({ length: 28 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);

    const workout: WorkoutTemplate = {
      id: `fam-day-${day}`,
      name: `Familie-moro Dag ${day}`,
      description: isRest ? 'Helg og utetid!' : '4 minutters latter og bevegelse i stua',
      type: 'custom',
      rounds: 1,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 0,
      items: isRest
        ? []
        : [
            { id: `fc-${day}-1`, exercise: { id: 'sprellmenn', name: 'Kenguruhopp', category: 'cardio' }, workDurationSeconds: 30, restDurationSeconds: 10 },
            { id: `fc-${day}-2`, exercise: { id: 'kneboy', name: 'Froskesprett', category: 'cardio' }, workDurationSeconds: 30, restDurationSeconds: 10 },
            { id: `fc-${day}-3`, exercise: { id: 'rygghev-superman', name: 'Flyvende superhelter', category: 'bodyweight' }, workDurationSeconds: 30, restDurationSeconds: 0 },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Familiehelg 🎈' : `Stuemoro Dag ${day}`,
      goalNote: isRest ? 'Tur i skog eller park' : 'Gjør det sammen med barna!',
      workout,
    };
  });

  return {
    id: 'familie-utfordringen-28-dager',
    title: 'Familie-utfordringen 28 dager',
    category: 'barn',
    durationDays: 28,
    description: 'Skap bevegelsesglede og latter i stua sammen med barna hver ettermiddag.',
    phases: [
      { name: 'Uke 1: Dyrehagen', dayRange: [1, 7], description: 'Lek og moro.' },
      { name: 'Uke 2: Superhelter', dayRange: [8, 14], description: 'Hopp og sprett.' },
      { name: 'Uke 3: Hinderløype', dayRange: [15, 21], description: 'Latter og samarbeid.' },
      { name: 'Uke 4: Familiegjengen', dayRange: [22, 28], description: 'Aktiv familie fullført!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-family-love',
      name: 'Familiestjerna',
      icon: '🧸',
    },
  };
}

/**
 * 12. Rygg- & Holdningsløftet 28 dager
 */
function generatePostureLiftChallenge(): ChallengeItem {
  const restDays = [4, 8, 12, 16, 20, 24, 28];

  const dailyWorkouts = Array.from({ length: 28 }, (_, i) => {
    const day = i + 1;
    const isRest = restDays.includes(day);

    const workout: WorkoutTemplate = {
      id: `posture-day-${day}`,
      name: `Holdningsløftet Dag ${day}`,
      description: isRest ? 'Hviledag' : 'Styrk rygg, skuldre og holdning',
      type: 'custom',
      rounds: 2,
      prepareDurationSeconds: 5,
      roundRestDurationSeconds: 15,
      items: isRest
        ? []
        : [
            { id: `po-${day}-1`, exercise: { id: 'rygghev-superman', name: 'Rygghev', category: 'bodyweight' }, workDurationSeconds: 35, restDurationSeconds: 10 },
            { id: `po-${day}-2`, exercise: { id: 'skulder-dislocates', name: 'Skulderåpnere', category: 'mobility' }, workDurationSeconds: 35, restDurationSeconds: 10 },
            { id: `po-${day}-3`, exercise: { id: 'verdens-beste-toyeovelse', name: 'Bryststrekk', category: 'mobility' }, workDurationSeconds: 35, restDurationSeconds: 0 },
          ],
    };

    return {
      day,
      isRestDay: isRest,
      title: isRest ? 'Hviledag' : `Holdningsøkt Dag ${day}`,
      goalNote: isRest ? 'Husk god holdning når du går' : 'Rett rygg og lave skuldre',
      workout,
    };
  });

  return {
    id: 'holdningsloftet-28-dager',
    title: 'Holdningsløftet 28 dager',
    category: 'styrke',
    durationDays: 28,
    description: 'Mindre lut rygg og stramme skuldre. Bygg en oppreist, stolt og sterk holdning.',
    phases: [
      { name: 'Uke 1: Åpne brystet', dayRange: [1, 7], description: 'Tøy stramme brystmuskler.' },
      { name: 'Uke 2: Vekk øvre rygg', dayRange: [8, 14], description: 'Aktiver trapezius og rhomboideus.' },
      { name: 'Uke 3: Holdningsstyrke', dayRange: [15, 21], description: 'Sterkere holdningsmuskler.' },
      { name: 'Uke 4: Rank og stolt', dayRange: [22, 28], description: 'Naturlig god holdning hele dagen!' },
    ],
    restDays,
    dailyWorkouts,
    badgeReward: {
      id: 'badge-posture-crown',
      name: 'Kronen på verket',
      icon: '👑',
    },
  };
}

export const STARTER_CHALLENGES: ChallengeItem[] = [
  generatePlankChallenge(),
  generatePushupsChallenge(),
  generateSquatChallenge(),
  generateOfficeHabitChallenge(),
  generateMorningMobilityChallenge(),
  generateHollowHoldChallenge(),
  generateTabataTormentChallenge(),
  generateKettlebellChallenge(),
  generateBalanceChallenge(),
  generateNightCalmChallenge(),
  generateFamilyChallenge(),
  generatePostureLiftChallenge(),
];
