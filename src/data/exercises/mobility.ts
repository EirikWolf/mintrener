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
        'Sitt oppreist på stolen med stolt brystkasse, fotsålene flatt i gulvet og senkede skuldre.',
        'Løft begge armene strake opp over hodet i en vid V-form mens du puster dypt inn.',
        'Åpne brystkassen på toppen og hold i ett sekund.',
        'Senk armene rolig og kontrollert ned langs siden mens du puster ut.',
      ],
    },
    vanligeFeil: {
      nb: ['Svaier kraftig i korsryggen for å få armene høyere opp', 'Heiser skuldrene opp mot ørene'],
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
        'Sitt behagelig med rett rygg og skuldrene fullstendig avspent.',
        'Trekk skuldrene opp mot ørene, rull dem bakover og klem skulderbladene lett sammen.',
        'Før skuldrene helt ned og frem i en stor, myk og sammenhengende sirkelbevegelse.',
        'Pust rolig og slipp alle spenninger i nakke og kjeve.',
      ],
    },
    vanligeFeil: {
      nb: ['Gjør bevegelsen for raskt og rykkete', 'Skyter hodet frem i stedet for å bevege skuldrene'],
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
        'Plasser den ene foten rett foran den andre slik at hælen berører tærne på bakre fot.',
        'Fordel kroppsvekten jevnt mellom begge føttene.',
        'Hold blikket festet på et fast punkt i øyehøyde for å stabilisere balansen.',
        'Bruk armene ut til siden eller ha en stolrygg tilgjengelig for lett fingerstøtte.',
      ],
    },
    vanligeFeil: {
      nb: ['Ser ned i gulvet i stedet for frem', 'Lener hele kroppsvekten kun på bakre fot'],
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
        'Stå stødig ved siden av en stolrygg eller vegg med én hånd klar for støtte.',
        'Flytt tyngdepunktet over på standbeinet med et svakt bøyd kne.',
        'Løft den andre foten rolig fra bakken og finn likevekten.',
        'Stram setet og magen, og forsøk gradvis å slippe fingerstøtten etter hvert som balansen sitter.',
      ],
    },
    vanligeFeil: {
      nb: ['Overstrekker (låser) kneet på standbeinet', 'Slipper hoften ned på siden som er løftet'],
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
        'Stå med føttene samlet bak en solid stol og hold lett i stolryggen med begge hender.',
        'Ta et kontrollert og passe bredt skritt ut til siden med det ene beinet.',
        'Flytt vekten rolig over før du fører det andre beinet inntil.',
        'Gjenta til motsatt side med jevne, stabile bevegelser.',
      ],
    },
    vanligeFeil: {
      nb: ['Subber føttene langs gulvet', 'Lener overkroppen kraftig sideveis i stedet for å ta et rent steg'],
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
        'Stå stødig med hoftebreddes avstand mellom føttene og stram magen lett.',
        'Løft den ene armen strakt opp og bøy overkroppen rolig sideveis til motsatt side.',
        'Pust dypt inn i ribbeina på den åpne siden slik at mellomrommet mellom ribbeina strekkes.',
        'Kom rolig tilbake til midten ved utpust og gjenta til den andre siden.',
      ],
    },
    vanligeFeil: {
      nb: ['Roterer overkroppen forover under strekken', 'Kollapser i nedsiden i stedet for å forlenge oppsiden'],
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
        'Plasser en hånd på magen like under navlen og en hånd på brystkassen.',
        'Pust rolig og dypt inn gjennom nesen slik at magen hever seg uten at brystkassen løftes nevneverdig.',
        'Pust langsomt og passivt ut gjennom munnen eller nesen mens magen synker naturlig inn igjen.',
        'Hold skuldrene og kjeven helt avspent gjennom hele øvelsen.',
      ],
    },
    vanligeFeil: {
      nb: ['Puster høyt i brystet og heiser skuldrene', 'Tvinger eller presser luften ut i stedet for å slippe den passivt'],
    },
    sensorProfil: 'ingen',
    bildePrompt: {
      '0': 'full body standing in three-quarter view, calm upright posture, left hand gently resting flat on lower ribcage and right hand on upper chest, shoulders lowered and relaxed, looking straight ahead',
      '1': 'full body captured in three-quarter view in a calm standing breathing pose, upright natural posture, with left palm placed flat on stomach below navel and right hand on chest, relaxed shoulders, peaceful focused expression, gentle deep breath',
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
        'Sitt eller ligg i en behagelig stilling med nøytral rygg og lukkede øyne.',
        'Pust langsomt inn gjennom nesen mens du teller rolig til 4 i magen.',
        'Hold pusten rolig og uten anstrengelse i 4 sekunder med åpent svelg.',
        'Pust mykt og kontrollert ut gjennom leppene mens du teller rolig til 8.',
      ],
    },
    vanligeFeil: {
      nb: ['Lukker halsen og klemmer kjeven når pusten holdes', 'Tømmer lungene for fort på utpusten'],
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
        'Innta en god holdning med stolt bryst og senkede skuldre.',
        'Ta en rolig innpust gjennom nesen og la luften fylle de nederste delene av lungene.',
        'Form leppene som om du skal blåse forsiktig gjennom et tynt sugerør.',
        'Blås en jevn, smal og uavbrutt luftstrøm ut til lungene er behagelig tømt, og merk at magemusklene strammes forsiktig.',
      ],
    },
    vanligeFeil: {
      nb: ['Biter tennene sammen eller anspenner nakken', 'Blåser for hardt slik at luften tar slutt umiddelbart'],
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
        'Stå med føttene stødig i bakken og hendene hvilende på nedre ribbein.',
        'Trekk pusten dypt og lydløst inn slik at ribbeina vider seg ut sideveis.',
        'Plasser tungen lett bak fortennene og slipp luften ut på en lang og jevn «ssss»-lyd.',
        'Hold lydstyrken og trykket konstant helt til utpusten er fullført uten å kollapse i brystet.',
      ],
    },
    vanligeFeil: {
      nb: ['Kollapser i holdningen og krummer ryggen mot slutten av utpusten', 'Ujevn luftstrøm med varierende s-lyd'],
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
        'Strekk armene frem foran deg i brysthøyde med løse hender.',
        'Roter begge håndleddene i store, rolige sirkler – 10 ganger med klokken og 10 ganger mot klokken.',
        'Strekk deretter den ene armen strak frem med håndflaten pekende opp/frem.',
        'Bruk motsatt hånd til å trekke fingrene forsiktig bakover til du kjenner en god strekk på undersiden av underarmen.',
      ],
    },
    vanligeFeil: {
      nb: ['Trekker for hardt i fingrene slik at det oppstår smerte i håndleddet', 'Beveger albuene i stedet for selve håndleddet'],
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
        'Hold hendene foran brystet og spred alle ti fingre så langt fra hverandre du klarer.',
        'Hold den maksimale spredningen og strekkingen i 2 sekunder.',
        'Knytt hendene deretter til faste knyttnever i 2 sekunder.',
        'Gjenta vekslingen rytmisk for å stimulere blodsirkulasjonen og redusere stivhet etter tastaturbruk.',
      ],
    },
    vanligeFeil: {
      nb: ['Gjør bevegelsen halvhjertet uten reell strekk i ytterstilling', 'Spenningssmerter i skuldrene under utførelse'],
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
        'Stå på ett bein med lett støtte til en vegg eller stolrygg om nødvendig.',
        'Bøy det andre beinet bakover og ta tak rundt vristen eller ankelen med hånden på samme side.',
        'Hold knærne parallelle og tett inntil hverandre, og skyv hoften forsiktig fremover.',
        'Kjenn en behagelig og tydelig strekk på forsiden av låret uten å svaie i korsryggen.',
      ],
    },
    vanligeFeil: {
      nb: ['Kneet dras ut til siden i stedet for å holdes parallelt', 'Svaier kraftig i korsryggen for å kompensere'],
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
        'Sett det ene beinet et lite skritt foran deg med hælen i bakken og tærne pekende rett opp.',
        'Bøy lett i det bakre kneet og plasser hendene støttende på det bøyde låret.',
        'Skyv hoften og setet bakover med strak og flat rygg til du kjenner strekken bak i låret og leggen.',
        'Hold brystet hevet og pust rolig i posisjonen.',
      ],
    },
    vanligeFeil: {
      nb: ['Krummer ryggen og prøver å nå tærne med hendene', 'Legger trykk på kneet i stedet for låret'],
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
