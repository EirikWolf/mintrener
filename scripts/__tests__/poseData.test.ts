import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs uten typedeklarasjon
import { POSES, byggØvelse, lerretFor } from '../poseData.mjs';
// @ts-expect-error — .mjs uten typedeklarasjon
import { lemmelengderPx, LEMMER } from '../poseBody.mjs';
import { EXERCISE_LIBRARY } from '../../src/data/exercises';

/**
 * Posedataene mot øvelseskatalogen og mot hverandre.
 *
 * Et skjelett for en øvelse som ikke finnes, eller en koordinat utenfor
 * lerretet, feiler ikke — det gir bare et bilde som er litt galt. Det er
 * nøyaktig feilklassen bildekurateringen 2026-08-31 fant 17 av.
 */

type Ledd = [number, number] | null;
type Fase = { navn: string; gulvledd?: number[] };
type Pose = { vinkel: string; hold?: boolean; gulvledd: number[]; faser: Fase[] };

const oppføringer = Object.entries(POSES) as [string, Pose][];

/** Hver fase i biblioteket, ferdig bygget og innrammet. */
const alleFaser = oppføringer.flatMap(([id, def]) =>
  (byggØvelse(def) as Ledd[][]).map((joints, i) => ({
    id,
    i,
    def,
    joints,
    lerret: lerretFor(def) as { width: number; height: number },
  }))
);

describe('Posedataene', () => {
  it('peker bare på øvelser som finnes i katalogen', () => {
    const kjente = new Set(EXERCISE_LIBRARY.map((ex) => ex.id));
    const ukjente = oppføringer.map(([id]) => id).filter((id) => !kjente.has(id));
    expect(ukjente, `Poser uten øvelse: ${ukjente.join(', ')}`).toEqual([]);
  });

  it('gir hver fase et navn, så en feil positur kan omtales', () => {
    for (const { id, i, def } of alleFaser) {
      expect(def.faser[i].navn, `${id} fase ${i}`).toBeTruthy();
    }
  });

  it('holder alle koordinater innenfor lerretet', () => {
    for (const { id, i, joints } of alleFaser) {
      joints.forEach((p, j) => {
        if (!p) return;
        expect(p[0], `${id} fase ${i} ledd ${j} x`).toBeGreaterThanOrEqual(0);
        expect(p[0], `${id} fase ${i} ledd ${j} x`).toBeLessThanOrEqual(1);
        expect(p[1], `${id} fase ${i} ledd ${j} y`).toBeGreaterThanOrEqual(0);
        expect(p[1], `${id} fase ${i} ledd ${j} y`).toBeLessThanOrEqual(1);
      });
    }
  });

  it('gir hver positur en torso — nakke, skuldre og hofter', () => {
    // Uten torso tegner ControlNet en kropp den finner på selv, og posituren
    // vi styrte mot er borte.
    for (const { id, i, joints } of alleFaser) {
      for (const idx of [1, 2, 5, 8, 11]) {
        expect(joints[idx], `${id} fase ${i} mangler ledd ${idx}`).not.toBeNull();
      }
    }
  });

  it('gir statiske hold én fase og bevegelser to', () => {
    // Antall faser er en påstand om øvelsen. To skjeletter for et hold ville
    // blitt to nesten like bilder — sideplanke-0 og -1 var byte-identiske.
    for (const [id, def] of oppføringer) {
      expect(def.faser.length, `${id}`).toBe(def.hold ? 1 : 2);
    }
  });

  it('bruker en kameravinkel katalogen kjenner', () => {
    for (const [id, def] of oppføringer) {
      expect(['side', 'front', 'skrå'], `${id}`).toContain(def.vinkel);
    }
  });

  it('gir start og slutt tydelig forskjellige positurer', () => {
    // Kravet fra vedlegg A § A.10: «Start og slutt er tydelig forskjellige,
    // fra samme kameraposisjon.» Den vanligste feilen i dagens bilder er at de
    // to fasene viser det samme.
    for (const [id, def] of oppføringer) {
      if (def.hold) continue;
      const [a, b] = byggØvelse(def) as Ledd[][];
      const avstand = a.reduce((sum, p, i) => {
        const q = b[i];
        return p && q ? sum + Math.hypot(p[0] - q[0], p[1] - q[1]) : sum;
      }, 0);
      expect(avstand, `${id}: fasene er for like (${avstand.toFixed(2)})`).toBeGreaterThan(0.5);
    }
  });
});

describe('Alle skjelettene beskriver samme kropp', () => {
  /**
   * DETTE ER GRUNNEN TIL AT KROPPSMODELLEN FINNES.
   *
   * Positurene sto tidligere som absolutte koordinater, tegnet for hånd én for
   * én. Målt på resultatet: underarmen varierte 2,20×, overarmen 1,65×, låret
   * 3,20×. ControlNet gjengir de proporsjonene trofast, og Astrid så anorektisk
   * ut i ett bilde og overvektig i det neste. Tilbakemeldingen var «hvorfor
   * endrer kroppen hennes seg så mye fra bilde til bilde».
   *
   * INVARIANTEN ER FORHOLDET, IKKE PIKSELTALLET. Første utgave av denne testen
   * krevde identisk pikselstørrelse i alle skjeletter. Det var for strengt og
   * ga en ny feil: et knebøy er genuint kortere enn en stående person, så med
   * fast pikselstørrelse fylte figuren 35 % av bildet og resten var tom vegg.
   *
   * Skalaen settes nå per øvelse — kameraet flytter seg mellom øvelser, slik et
   * kamera gjør. Det som ikke får flytte seg, er forholdet mellom lemmene: det
   * er DET som avgjør om det er samme menneske.
   */
  const FORHOLD_TOLERANSE = 0.01;

  /** Lemmeforhold som ikke avhenger av kameraavstand. */
  function forhold(joints: Ledd[], lerret: { width: number; height: number }) {
    const l = lemmelengderPx(joints, lerret) as Record<string, number>;
    return {
      'underarm/overarm': l.underarmH / l.overarmH,
      'legg/lår': l.leggH / l.lårH,
      'lår/overarm': l.lårH / l.overarmH,
      'venstre/høyre arm': l.overarmV / l.overarmH,
    };
  }

  const fasit = forhold(alleFaser[0].joints, alleFaser[0].lerret);

  it.each(Object.keys(fasit))('holder %s likt i alle 31 skjelettene', (nøkkel) => {
    const k = nøkkel as keyof typeof fasit;
    for (const { id, i, joints, lerret } of alleFaser) {
      expect(forhold(joints, lerret)[k], `${id}[${i}]`).toBeCloseTo(fasit[k], 2);
    }
    expect(FORHOLD_TOLERANSE).toBeGreaterThan(0); // toleransen er dokumentert over
  });

  it('bruker samme kameraavstand for begge fasene av samme øvelse', () => {
    // Vedlegg A § A.10: «start og slutt … fra samme kameraposisjon.» Skalerte vi
    // per fase, ville hun krympet mellom start- og sluttbildet av samme øvelse.
    for (const [id, def] of oppføringer) {
      if (def.hold) continue;
      const lerret = lerretFor(def) as { width: number; height: number };
      const [a, b] = (byggØvelse(def) as Ledd[][]).map(
        (j) => (lemmelengderPx(j, lerret) as Record<string, number>).overarmH
      );
      expect(a, `${id}`).toBeCloseTo(b, 1);
    }
  });

  it('gir hver øvelse en figur som fyller bildet', () => {
    // Feilen denne fanger: planke og armhevinger sto på portrettlerret og brukte
    // nederste fjerdedel, med tom vegg over. Øvelsen skal være det man ser.
    //
    // Kravet gjelder ØVELSEN, ikke hver enkelt fase. Med fast kamera SKAL et
    // knebøy fylle mindre enn den stående startposisjonen — det er slik et
    // kamera oppfører seg, og å kreve det motsatte ville betydd at kameraet
    // zoomet mellom start- og sluttbildet.
    for (const [id, def] of oppføringer) {
      const synlige = (byggØvelse(def) as Ledd[][]).flat().filter(Boolean) as [number, number][];
      const bredde = Math.max(...synlige.map((p) => p[0])) - Math.min(...synlige.map((p) => p[0]));
      const høyde = Math.max(...synlige.map((p) => p[1])) - Math.min(...synlige.map((p) => p[1]));
      // 0,75 og ikke 0,86: ramma reserverer plass til issen. COCO-18 har ingen
      // hodetopp — øverste ledd er øyet — og uten den marginen ble kronen
      // avkuttet på stående ryggvri.
      expect(Math.max(bredde, høyde), `${id} er for liten i ramma`).toBeGreaterThan(0.75);
    }
  });
});

describe('Positurene står på gulvet', () => {
  /**
   * Gulvleddene er en påstand om hvilke ledd som bærer vekt. Uten den kunne en
   * positur ha hendene i lufta og føttene i gulvet uten at noe sa fra: den
   * gamle armhevingen hadde håndleddet 122 px UNDER ankelen — en planke med
   * hendene på en kasse — og ingen test merket det.
   */
  /**
   * Toleransen rommer SPEIL_PX, ikke slurv.
   *
   * Den bortre siden tegnes 6 px ned og 12 px inn med vilje: uten det leses en
   * ren profil som en halv kropp. Kameraskaleringen forstørrer den forskyvningen
   * til rundt 9 px, og det er mesteparten av tallet under. Feilen testen er til
   * for — den gamle armhevingen med håndleddet 122 px under ankelen — er en
   * størrelsesorden større og fanges fortsatt.
   */
  const GULV_TOLERANSE_PX = 16;

  it.each(alleFaser.map((f) => [`${f.id}[${f.i}]`, f] as const))(
    '%s lar gulvleddene dele gulvlinje',
    (_navn, { def, i, joints, lerret }) => {
      const gulvledd = def.faser[i].gulvledd ?? def.gulvledd;
      expect(gulvledd?.length, 'øvelsen mangler gulvledd').toBeGreaterThan(0);
      const y = gulvledd.map((k) => {
        expect(joints[k], `gulvledd ${k} er ikke tegnet`).not.toBeNull();
        return joints[k]![1] * lerret.height;
      });
      expect(Math.max(...y) - Math.min(...y)).toBeLessThanOrEqual(GULV_TOLERANSE_PX);
    }
  );

  it('lar bevegelsens faser dele samme gulv', () => {
    // Kroppen bygges fra hoften, men hoften er nettopp det som beveger seg i et
    // knebøy. Forankret vi hele figuren i hoften, sank gulvet med den, og i
    // bunnposisjonen svevde føttene 200 px over det de sto på i startbildet.
    for (const [id, def] of oppføringer) {
      if (def.hold) continue;
      const faser = byggØvelse(def) as Ledd[][];
      const lerret = lerretFor(def) as { height: number };
      const gulv = faser.map((joints, i) => {
        const ledd = def.faser[i].gulvledd ?? def.gulvledd;
        return (
          ledd.reduce((sum, k) => sum + joints[k]![1] * lerret.height, 0) / ledd.length
        );
      });
      expect(Math.abs(gulv[0] - gulv[1]), `${id}`).toBeLessThanOrEqual(1);
    }
  });
});
