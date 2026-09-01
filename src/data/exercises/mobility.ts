import { ExerciseInput } from '../../schemas/exerciseSchema';

export const MOBILITY_EXERCISES: ExerciseInput[] = [
  {
    id: 'katte-ku',
    navn: { nb: 'Katte-ku (Ryggmobilitet)', en: 'Cat-Cow Stretch' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['ryggsøyle', 'korsrygg'], sekundær: ['nakke', 'kjerne'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Start på alle fire med hendene under skuldrene og knærne under hoftene.',
        'Pust inn, svai ryggen forsiktig og løft blikket mot taket (Ku).',
        'Pust ut, krum ryggen maksimalt som en sint katt og trekk haken mot brystet (Katt).',
        'Beveg deg rolig i takt med pusten.',
      ],
    },
    vanligeFeil: {
      nb: ['Presser for hardt inn i ytterstilling', 'Beveger seg for fort uten pust'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in side profile on all fours on a gym mat in cow pose, hands under shoulders, knees under hips, belly dipping softly towards the mat with an arched lower back, chest open, head tilted upward looking towards ceiling with relaxed focus',
      '1': 'captured in side profile on all fours on a gym mat in full cat pose, spine forcefully rounded upwards like a dome, pressing palms into floor, tailbone tucked under, chin tucked deeply to chest, intense back stretch',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
    // `noFloor` er en ekte oppslagsnøkkel i profileCompositionService: profiler
    // med resolve: ['noFloor'] bytter automatisk til den stående varianten.
    // Kontorprofilen er nettopp en slik — ingen legger seg på alle fire ved pulten.
    alternatives: { noFloor: 'staende-ryggvri' },
  },
  {
    /**
     * Lagt inn 2026-09-01. «Kontorvanen 28 dager» hadde i praksis denne
     * øvelsen allerede: den skrev «Stående ryggvri» som navn, men lånte
     * katte-ku sin ID. Da fantes øvelsen bare i det navnet — ikke søkbar under
     * Øvelser, ikke instruert, ikke illustrert, og den som fulgte lenken fikk
     * beskjed om å gå ned på alle fire.
     *
     * Formen er verifisert mot videoreferanse fra Eirik 2026-09-01: en
     * PENDELBEVEGELSE der armene henger løst og kroppen selv finner
     * vendepunktet. Det er ikke en kontrollert tøying mot ytterstilling — første
     * utkast her beskrev armene løftet til brysthøyde og listet svingen som en
     * vanlig feil. Begge deler var motsatt av øvelsen.
     */
    id: 'staende-ryggvri',
    navn: { nb: 'Stående ryggvri', en: 'Standing Spinal Twist' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: {
      primær: ['brystrygg', 'skrå magemuskler'],
      sekundær: ['korsrygg', 'skuldre', 'hofter'],
    },
    // Poenget med øvelsen: ingenting. Den skal kunne gjøres ved en pult, i
    // arbeidsklær, uten å flytte på noe.
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Stå med føttene i hoftebreddes avstand og knærne mykt bøyd.',
        'La armene henge helt løst. De skal verken holdes oppe eller styres.',
        'Sett overkroppen i en rolig pendelbevegelse fra side til side.',
        'La kroppen selv finne vendepunktet — ikke press vridningen lenger enn pendelen tar den.',
        'Blikket følger med. Hoftene og knærne peker rett fram. Pust fritt.',
      ],
      en: [
        'Stand with feet hip-width apart, knees softly bent.',
        'Let the arms hang completely loose — neither held up nor steered.',
        'Set the torso into a calm pendulum swing from side to side.',
        'Let the body find its own turning point — never push the twist further than the swing carries it.',
        'The gaze follows along. Hips and knees stay facing forward. Breathe freely.',
      ],
    },
    vanligeFeil: {
      nb: [
        'Holder armene aktivt oppe i stedet for å la dem henge og pendle med',
        'Tvinger vridningen forbi der pendelen stopper av seg selv',
        'Lar hoftene snu med — da roterer ikke brystryggen, som er det øvelsen er til for',
      ],
    },
    sensorProfil: 'ingen',
    // Frontvinkel: en rotasjon leses ikke i ren profil. Skuldrene som svinger
    // bort fra kamera mens hoftene står stille, ER hele øvelsen.
    bildePrompt: {
      '0': 'standing upright with feet hip-width apart, knees softly bent, torso swung to her right so the shoulders turn away from the camera while the hips stay squarely forward, both arms hanging completely loose and swept out to the sides by the momentum of the swing, gaze following the movement',
      '1': 'standing upright with feet hip-width apart, knees softly bent, torso swung to her left so the shoulders turn away from the camera while the hips stay squarely forward, both arms hanging completely loose and swept out to the sides by the momentum of the swing, gaze following the movement',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
    alternatives: { seated: 'seated-skulder-rull', easier: 'katte-ku' },
  },
  {
    id: 'verdens-beste-toyeovelse',
    navn: { nb: "Verdens beste tøyeøvelse (World's Greatest Stretch)", en: "World's Greatest Stretch" },
    type: 'reps',
    kategori: 'mobilitet',
    muskler: { primær: ['hofteleddsbøyere', 'brystrygg'], sekundær: ['bakside lår', 'skuldre'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Ta et dypt utfall fremover og sett begge hendene på innsiden av fremre fot.',
        'Før fremre sides albue ned mot gulvet ved siden av ankelen.',
        'Roter overkroppen og strekk samme arm rett opp mot taket mens du følger med blikket.',
        'Gjenta på begge sider.',
      ],
    },
    vanligeFeil: {
      nb: ['Holder pusten', 'Roterer kun nakken i stedet for brystryggen'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in full body side profile in an active deep runner lunge on a gym mat, right knee bent 90 degrees forward with foot flat, left leg extended straight back with heel high, both palms planted flat on the floor inside the front foot, driving right elbow down towards right ankle, looking at the mat',
      '1': 'captured in full body side profile in a deep runner lunge, right arm pointing straight up to the ceiling in a full thoracic spine rotation, chest opened wide to the side, gazing upward along the raised fingertips, powerful athletic mobility stretch',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'hofteapner-90-90',
    navn: { nb: 'Hofteåpner 90/90', en: '90/90 Hip Mobility' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['hofteledd', 'setemuskulatur'], sekundær: ['korsrygg'] },
    utstyr: ['matte', 'ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Sitt på gulvet med begge beina bøyd i 90 graders vinkel (ett foran, ett til siden).',
        'Hold overkroppen stolt og len deg forsiktig over det fremre kneet.',
        'Hold posisjonen eller veksle beina over til motsatt side uten å bruke hendene.',
      ],
    },
    vanligeFeil: {
      nb: ['Krummer ryggen', 'Lener seg for langt bort fra hoften'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'captured in front-diagonal angle sitting upright on gym floor in a 90-90 hip mobility position, front right leg bent at 90 degrees in external rotation flat on mat, back left leg bent at 90 degrees to the side in internal rotation, tall proud spine',
      '1': 'captured in front-diagonal angle hinging forward over the front knee in a 90-90 stretch, chest lowered towards shin with flat back, hands placed lightly on mat for support, intense hip and glute stretch',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'skulder-dislocates',
    navn: { nb: 'Skulderrotasjon med strikk/stang', en: 'Shoulder Dislocates' },
    type: 'reps',
    kategori: 'mobilitet',
    muskler: { primær: ['skuldre', 'bryst'], sekundær: ['øvre rygg'] },
    utstyr: ['strikk', 'stang'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Hold en lang stang eller et elastisk bånd foran deg med et bredt overhåndsgrep.',
        'Løft armene strakt opp over hodet og før dem bak ryggen i en kontrollert sirkel.',
        'Før armene tilbake samme vei uten å bøye i albuene.',
      ],
    },
    vanligeFeil: {
      nb: ['Bøyer albuene', 'Svaier ukontrollert i korsryggen'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'standing tall in profile holding a mobility stick in front of thighs with wide overhand grip, shoulders back and down',
      '1': 'captured in side profile mid-movement rotating the mobility stick smoothly overhead and behind the back with straight arms, chest expanded, shoulders in full comfortable range of motion',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'seated-armloft',
    navn: { nb: 'Sittende armløft', en: 'Seated Arm Raises' },
    type: 'reps',
    kategori: 'mobilitet',
    muskler: { primær: ['skuldre', 'øvre rygg'], sekundær: ['holdningsmuskler'] },
    utstyr: ['stol/benk'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Sitt oppreist på stolen med stolt brystkasse og senkede skuldre.',
        'Løft begge armene strake opp over hodet, pust dypt inn og senk rolig ned.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body sitting tall on gym chair in front view, hands resting on thighs, shoulders relaxed down, tall spine',
      '1': 'full body captured in front view sitting upright on chair with both arms raised straight overhead in a wide V, chest opened high, deep diaphragmatic inhalation',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'seated-skulder-rull',
    navn: { nb: 'Sittende skulder- og nakkeavspenning', en: 'Seated Shoulder Rolls' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['nakke', 'skuldre'], sekundær: ['trapezius'] },
    utstyr: ['stol/benk', 'ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Sitt behagelig med ryggen fri fra stolryggen.',
        'Rull skuldrene bakover i store, rolige sirkler mens du puster rolig og slipper spenninger.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body sitting comfortably upright in side-diagonal view on gym chair, arms hanging loose at sides',
      '1': 'full body captured in side-diagonal view rolling shoulders upward and backward in a smooth generous circle, chest lifted, neck relaxed and neutral, releasing tension',
    },
    bildeVinkel: 'skrå',
    bildeStatus: 'mangler',
  },
  {
    id: 'balanse-tandem',
    navn: { nb: 'Tandemstand (Hæl-mot-tå balanse)', en: 'Tandem Stance Balance' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['balanse', 'ankelstabilitet'], sekundær: ['kjerne'] },
    utstyr: ['stol/benk', 'ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Sett den ene foten rett foran den andre slik at hælen berører fremre tå.',
        'Hold balansen med armene ut til siden eller lett støtte på en stolrygg.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in side-diagonal view stepping right foot directly in front of left foot with right heel touching left toes',
      '1': 'full body captured in side-diagonal view balancing in a strict heel-to-toe tandem stance, arms outstretched laterally for balance, eyes focused forward, steady aligned posture',
    },
    bildeVinkel: 'skrå',
    bildeStatus: 'mangler',
  },
  {
    id: 'balanse-ettbein',
    navn: { nb: 'Ettbeinsstand med støtte', en: 'Single-leg Balance' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['balanse', 'ankelstabilitet'], sekundær: ['sete'] },
    utstyr: ['stol/benk', 'ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Stå på ett bein med lett fingerstøtte på en stolrygg eller vegg.',
        'Fest blikket på et fast punkt foran deg og hold kjernen lett aktivert.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in front view with right fingertips resting lightly on back of gym chair, preparing to lift left foot',
      '1': 'full body captured in front view balancing steadily on right foot, left knee bent at 90 degrees with foot hovering off floor, light touch on chair, tall posture and focused gaze',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'sidesteg-stotte',
    navn: { nb: 'Sidesteg med stolstøtte', en: 'Side Steps with Support' },
    type: 'reps',
    kategori: 'mobilitet',
    muskler: { primær: ['hofter', 'sete'], sekundær: ['balanse'] },
    utstyr: ['stol/benk'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Hold i stolryggen med begge hender for trygghet.',
        'Ta kontrollerte steg ut til siden og tilbake i jevnt tempo.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in front view holding back of gym chair with both hands, feet together',
      '1': 'full body captured in front view stepping left foot wide to the side in a controlled side step holding chair back, hips level, balanced upright posture',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'sidestrekk-pust',
    navn: { nb: 'Sidestrekk for ribbeinsutvidelse', en: 'Side Stretch for Ribcage Expansion' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['interkostalmuskler', 'sidemuskler'], sekundær: ['ryggsøyle'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Strekk den ene armen over hodet og bøy overkroppen rolig over til motsatt side.',
        'Pust dypt inn i ribbeina på den åpne siden for å utvide brystkassen.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing tall in front view with feet shoulder-width apart, arms at sides',
      '1': 'full body captured in front view with right arm sweeping gracefully overhead in a lateral side bend to the left, left hand on hip, ribcage expanded open taking a deep breath',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'diafragma-pust',
    navn: { nb: 'Diafragmapust (Magepust)', en: 'Diaphragmatic Breathing' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['diafragma', 'pustemuskulatur'], sekundær: ['kjerne'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Legg en hånd på magen og senk skuldrene helt ned.',
        'Pust dypt inn gjennom nesen slik at magen løfter seg, og pust rolig ut.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in side-diagonal view with one hand on belly and one on chest, shoulders relaxed',
      '1': 'full body captured in side-diagonal view taking a deep belly inhale, abdomen visibly expanded beneath lower hand while upper chest stays calm and relaxed, shoulders dropped',
    },
    bildeVinkel: 'skrå',
    bildeStatus: 'mangler',
  },
  {
    id: 'boks-pust',
    navn: { nb: 'Bokspust (4-4-8)', en: 'Box Breathing (4-4-8)' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['diafragma', 'parasympatisk nervesystem'], sekundær: ['kjerne'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Pust inn rolig gjennom nesen i 4 sekunder, og hold pusten i 4 sekunder.',
        'Pust langsomt og fullstendig ut gjennom munnen over 8 sekunder.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body sitting comfortably in front view on gym mat with legs crossed, hands resting on knees, upright poised posture, eyes gently focused',
      '1': 'full body captured in front view in a serene seated pose, sitting tall with relaxed shoulders, chest slightly elevated during a calm measured inhalation',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'sugeror-pust',
    navn: { nb: 'Sugerør-pust', en: 'Straw Breathing' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['diafragma', 'støttemuskulatur'], sekundær: ['lepper'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Form leppene som om du skal puste gjennom et smalt sugerør.',
        'Pust langsomt ut mot lett leppemotstand for å aktivere den dype støttemuskulaturen.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body sitting tall on gym chair in side-diagonal view, spine long, hands resting on lap',
      '1': 'full body captured in side-diagonal view exhaling slowly through gently pursed lips as if through a straw, deep abdominal support engaged, calm relaxed expression',
    },
    bildeVinkel: 'skrå',
    bildeStatus: 'mangler',
  },
  {
    id: 'utpust-s-lyd',
    navn: { nb: 'Langsom utpust på s-lyd', en: 'S-Sound Exhalation' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['diafragma', 'tverrgående magemuskel'], sekundær: ['stemmestøtte'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Fyll lungene med en dyp og uanstrengt mageinnpust.',
        'Slipp luften ut på en jevn og kontrollert "ssss"-lyd så lenge du klarer uten å presse.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing tall in front view, taking a full expansive inhalation into lower ribs and belly',
      '1': 'full body captured in front view standing with hands placed on sides of lower ribs, exhaling on a sustained smooth hiss with core engaged, shoulders down',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'handledd-sirkler',
    navn: { nb: 'Håndleddsirkler & underarmsstrekk', en: 'Wrist Circles & Forearm Stretch' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['håndledd', 'underarmer'], sekundær: ['fingre'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Roter håndleddene i rolige sirkler, først med klokken og deretter mot klokken.',
        'Flett fingrene sammen og strekk håndflatene utover for å tøye underarmene.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in front view with arms extended in front, rolling wrists in wide smooth circles',
      '1': 'full body captured in front view with right arm extended forward and left hand gently pressing right fingers back to stretch forearm flexors, palm forward, straight posture',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'finger-strekk',
    navn: { nb: 'Fingerspredning & gripe-sirkler', en: 'Finger Extension & Grip Mobility' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['fingre', 'håndmuskler'], sekundær: ['underarmer'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Spred fingrene så bredt som mulig og hold spenningen i 2 sekunder.',
        'Lukk hånden til en myk knyttneve og gjenta i jevn rytme.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in front view with hands held in front of chest forming soft relaxed fists',
      '1': 'full body captured in front view extending and spreading all ten fingers wide apart with active muscular tension, arms held in front, focused athletic expression',
    },
    bildeVinkel: 'front',
    bildeStatus: 'mangler',
  },
  {
    id: 'quad-stretch',
    navn: { nb: 'Stående forside lår & hoftebøyer', en: 'Standing Quad Stretch' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['forside lår', 'hofteleddsbøyere'], sekundær: ['balanse'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Ta tak i vristen bak setet med hånden på samme side.',
        'Press hoften lett frem, hold knærne samlet og kjenn strekken foran på låret.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in side profile, balanced on right leg and reaching back with left hand toward left ankle',
      '1': 'full body captured in side profile holding left ankle against left glute in a standing quad stretch, knees aligned together, hips pushed gently forward, upright proud chest',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
  {
    id: 'hamstring-stretch',
    navn: { nb: 'Bakside lår & leggstrekk', en: 'Standing Hamstring & Calf Stretch' },
    type: 'tid',
    kategori: 'mobilitet',
    muskler: { primær: ['bakside lår', 'legger'], sekundær: ['korsrygg'] },
    utstyr: ['ingen'],
    nivå: 'nybegynner',
    instruks: {
      nb: [
        'Sett den ene hælen i bakken foran deg med tærne pekende opp mot taket.',
        'Len overkroppen lett frem fra hoften med rett rygg til du kjenner strekken på baksiden.',
      ],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in side profile, stepping right heel forward onto floor with toes pointed up toward ceiling',
      '1': 'full body captured in side profile hinging forward from hips with flat neutral spine, hands resting on left thigh, right heel dug into floor with toes pulled back, deep hamstring stretch',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  },
];
