// Skript for kurering og forbedringsinnsending for Kitor øvelsesbilder
import { chromium } from '@playwright/test';

export const CURATION_DATA = {
  'kneboy-0': { status: 'godkjent', feedback: 'Godkjent: God oppreist startposisjon med samlede hender.' },
  'kneboy-1': { status: 'godkjent', feedback: 'Godkjent: God dybde og nøytral rygg i bunnposisjon.' },

  'push-ups-0': { status: 'regenerer', feedback: 'Endre kameravinkel til full sideprofil som viser strak kroppslinje fra hæl til hode på strake armer.' },
  'push-ups-1': { status: 'regenerer', feedback: 'Bunnposisjon: Brystet skal senkes 2-3 cm over gulvet med 90 graders vinkel i albuene, strak kropp sett i profil.' },

  'burpees-0': { status: 'regenerer', feedback: 'Startposisjon: Stående oppreist med føttene i hoftebredde, klar for nedsprang.' },
  'burpees-1': { status: 'regenerer', feedback: 'Sluttposisjon: Spenstig opphopp med strake armer strukket over hodet, sett fra siden.' },

  'dips-pa-stol-0': { status: 'regenerer', feedback: 'Startposisjon: Ryggen vendt mot kanten av stolen/benken, hendene på kanten med strake armer og bøyde/strake ben foran.' },
  'dips-pa-stol-1': { status: 'regenerer', feedback: 'Sluttposisjon: Hoften senket ned foran stolen med 90 graders bøy i albuene, sett i profil.' },

  'goblet-squat-0': { status: 'regenerer', feedback: 'Startposisjon: Fullkroppsbilde stående med føtter i skulderbredde, hold kettlebell med begge hender inntil brystet.' },
  'goblet-squat-1': { status: 'regenerer', feedback: 'Sluttposisjon: Dyp knebøy med kettlebell holdt fast mot brystet (ikke hvilende på gulvet), lår parallelle med gulv.' },

  'hofteapner-90-90-0': { status: 'regenerer', feedback: 'Startposisjon: Sittende på gulvet med fremre ben bøyd 90° foran og bakre ben bøyd 90° ut til siden, oppreist overkropp.' },
  'hofteapner-90-90-1': { status: 'regenerer', feedback: 'Sluttposisjon: Overkroppen lent kontrollert fremover over fremre lår for strekk i setet.' },

  'hoye-kneloft-0': { status: 'godkjent', feedback: 'Godkjent: God stående startposisjon i profil.' },
  'hoye-kneloft-1': { status: 'regenerer', feedback: 'Sluttposisjon: Det ene kneet må være løftet eksplosivt opp til 90 graders vinkel (hoftehøyde).' },

  'hulekroppshold-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende flatt på ryggen på matte med korsryggen presset i gulvet og strake armer over hodet.' },
  'hulekroppshold-1': { status: 'regenerer', feedback: 'Sluttposisjon: Hollow body posisjon - skuldre og strake ben hevet 10-15 cm over gulvet i bananform.' },

  'katte-ku-0': { status: 'regenerer', feedback: 'Startposisjon (Ku/Nøytral): På alle fire med hender under skuldre og knær under hofter, ryggen lett svai og hodet løftet, sett i profil.' },
  'katte-ku-1': { status: 'regenerer', feedback: 'Sluttposisjon (Katt): På alle fire i profil med maksimalt krummet rygg opp mot taket og haken trukket mot brystet.' },

  'kettlebell-halo-0': { status: 'godkjent', feedback: 'Startposisjon: Stående med kettlebell holdt opp-ned (bunn opp) foran brystet.' },
  'kettlebell-halo-1': { status: 'regenerer', feedback: 'Sluttposisjon: Kettlebell sirkulert rundt bakhodet med bøyde albuer og stabil kjerne.' },

  'kettlebell-press-0': { status: 'godkjent', feedback: 'Startposisjon: Kettlebell i rack-posisjon ved skulderen med albuen inntil kroppen.' },
  'kettlebell-press-1': { status: 'godkjent', feedback: 'Sluttposisjon: Kettlebell presset på strak arm over hodet med låst albue.' },

  'kettlebell-row-0': { status: 'regenerer', feedback: 'Startposisjon: Foroverbøyd med nøytral rygg (45 grader), kettlebell hengende i strak arm mot gulvet.' },
  'kettlebell-row-1': { status: 'regenerer', feedback: 'Sluttposisjon: Albuen trukket tett langs kroppen opp mot taket, kettlebell ved hoften.' },

  'kettlebell-swing-0': { status: 'regenerer', feedback: 'Startposisjon (Hike): Kettlebell svunget bakover mellom lårene med bøyd hofte og rett rygg (hip hinge).' },
  'kettlebell-swing-1': { status: 'godkjent', feedback: 'Sluttposisjon: Eksplosiv hofteutretting med kettlebell flytende i brysthøyde på strake armer.' },

  'manualpress-bryst-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på rygg på benk/matte med manualer holdt ved brystet/skuldrene, 90° bøy i albuer.' },
  'manualpress-bryst-1': { status: 'regenerer', feedback: 'Sluttposisjon: Manualer presset opp på strake armer over brystkassen.' },

  'mountain-climbers-0': { status: 'godkjent', feedback: 'Startposisjon: Strak plankeposisjon på hender med kroppen i rett linje.' },
  'mountain-climbers-1': { status: 'regenerer', feedback: 'Sluttposisjon: Det ene kneet trukket eksplosivt frem mot brystet mens det andre benet er strak.' },

  'planke-0': { status: 'regenerer', feedback: 'Startposisjon: Forberedelse på underarmer og knær/tær i profil.' },
  'planke-1': { status: 'regenerer', feedback: 'Sluttposisjon: Statisk underarmsplanke i full sideprofil med strak linje fra hæl, sete til skuldre (ikke høy planke forfra).' },

  'rumensk-markloft-manualer-0': { status: 'godkjent', feedback: 'Startposisjon: Stående oppreist med manualer foran lårene, stolt bryst.' },
  'rumensk-markloft-manualer-1': { status: 'regenerer', feedback: 'Sluttposisjon: Hoften skjøvet bakover, nøytral rygg, manualene senket like under knehøyde i profil.' },

  'rygghev-superman-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på magen på matte med strake armer strukket fremover og strake ben.' },
  'rygghev-superman-1': { status: 'regenerer', feedback: 'Sluttposisjon: Samtidig løft av bryst, armer og lår opp fra gulvet med blikk rett ned.' },

  'seated-marsj-0': { status: 'godkjent', feedback: 'Startposisjon: Sittende oppreist på stol med begge føtter flatt på gulvet.' },
  'seated-marsj-1': { status: 'godkjent', feedback: 'Sluttposisjon: Det ene kneet løftet kontrollert opp fra stolen.' },

  'sideplanke-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på siden med underarmen under skulderen og bøyde/strake ben.' },
  'sideplanke-1': { status: 'regenerer', feedback: 'Sluttposisjon: Hoften løftet opp fra gulvet med strak kroppslinje og støtte på underarm og føtter.' },

  'sideplanke-hoyre-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på høyre side klar for løft.' },
  'sideplanke-hoyre-1': { status: 'regenerer', feedback: 'Sluttposisjon: Høyre sideplanke med løftet hofte og strak kroppslinje.' },

  'sideplanke-venstre-0': { status: 'regenerer', feedback: 'Startposisjon: Liggende på venstre side klar for løft.' },
  'sideplanke-venstre-1': { status: 'regenerer', feedback: 'Sluttposisjon: Venstre sideplanke med løftet hofte og strak kroppslinje.' },

  'skoytehopp-0': { status: 'godkjent', feedback: 'Startposisjon: Lett foroverbøyd på ett ben klar for sideveis fraspark.' },
  'skoytehopp-1': { status: 'regenerer', feedback: 'Sluttposisjon: Landet dypt og stabilt på motsatt ben med bakre ben kryssende bak.' },

  'skulder-dislocates-0': { status: 'godkjent', feedback: 'Startposisjon: Stående med pinne/strikk holdt med bredt grep foran hoftene.' },
  'skulder-dislocates-1': { status: 'regenerer', feedback: 'Sluttposisjon: Pinnen/strikken ført med strake armer i bue over hodet og bak til korsryggen.' },

  'skulderpress-manualer-0': { status: 'godkjent', feedback: 'Startposisjon: Manualer holdt i skulderhøyde med 90° bøy i albuer og stolt holdning.' },
  'skulderpress-manualer-1': { status: 'godkjent', feedback: 'Sluttposisjon: Manualer presset opp på strake armer over hodet.' },

  'sprellmenn-0': { status: 'godkjent', feedback: 'Startposisjon: Stående oppreist med samlede føtter og armene langs siden.' },
  'sprellmenn-1': { status: 'godkjent', feedback: 'Sluttposisjon: Hopp med spredte ben og armer strukket ut og opp over hodet.' },

  'utfall-forover-0': { status: 'godkjent', feedback: 'Startposisjon: Stående oppreist med føtter i hoftebredde og hender i siden.' },
  'utfall-forover-1': { status: 'regenerer', feedback: 'Sluttposisjon: Ett langt steg frem med 90° bøy i begge knær og oppreist overkropp i profil.' },

  'verdens-beste-toyeovelse-0': { status: 'regenerer', feedback: 'Startposisjon: Dyp utfallsposisjon med hendene på innsiden av fremre fot.' },
  'verdens-beste-toyeovelse-1': { status: 'regenerer', feedback: 'Sluttposisjon: Rotasjon av overkroppen med innvendig arm strukket loddrett opp mot taket.' }
};

async function run() {
  console.log('Starter Playwright for å oppdatere kurator-dashboardet på http://localhost:5173...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');

  // Skriv til localStorage i nettleser-konteksten
  await page.evaluate((data) => {
    const existingRaw = localStorage.getItem('mintrener_image_curator_feedback');
    let map = {};
    try {
      if (existingRaw) map = JSON.parse(existingRaw);
    } catch {}

    const now = new Date().toISOString();
    for (const [key, val] of Object.entries(data)) {
      map[key] = {
        feedback: val.feedback,
        status: val.status,
        updatedAt: now,
      };
    }

    localStorage.setItem('mintrener_image_curator_feedback', JSON.stringify(map));
  }, CURATION_DATA);

  console.log(`✅ ${Object.keys(CURATION_DATA).length} faser kurert og lagret i localStorage!`);
  await browser.close();
}

run().catch(console.error);
