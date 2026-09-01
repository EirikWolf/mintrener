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
   * DETTE ER GRUNNEN TIL AT MODELLEN FINNES.
   *
   * Positurene sto tidligere som absolutte koordinater, tegnet for hånd én for
   * én. Målt på resultatet: underarmen varierte 2,20×, overarmen 1,65×, låret
   * 3,20×. ControlNet gjengir de proporsjonene trofast, og Astrid så anorektisk
   * ut i ett bilde og overvektig i det neste. Tilbakemeldingen var «hvorfor
   * endrer kroppen hennes seg så mye fra bilde til bilde».
   *
   * Toleransen er 1 px — den dekker avrunding gjennom normaliseringen, ikke et
   * avvik i modellen. Skulle noen legge tilbake absolutte koordinater, feiler
   * denne testen på første positur.
   */
  const LEM_TOLERANSE_PX = 1;

  const målinger: Record<string, { px: number; hvor: string }[]> = {};
  for (const { id, i, joints, lerret } of alleFaser) {
    for (const [navn, px] of Object.entries(
      lemmelengderPx(joints, lerret) as Record<string, number | null>
    )) {
      if (px == null) continue;
      const lem = navn.replace(/[HV]$/, '');
      (målinger[lem] ??= []).push({ px, hvor: `${id}[${i}]` });
    }
  }

  it.each(Object.keys(målinger))('holder %s lik i alle skjelettene', (lem) => {
    const liste = målinger[lem];
    const min = liste.reduce((a, b) => (a.px < b.px ? a : b));
    const max = liste.reduce((a, b) => (a.px > b.px ? a : b));
    expect(
      max.px - min.px,
      `${lem}: ${min.px.toFixed(1)} px i ${min.hvor}, ${max.px.toFixed(1)} px i ${max.hvor}`
    ).toBeLessThanOrEqual(LEM_TOLERANSE_PX);
  });

  it('måler de samme lengdene som kroppsmodellen oppgir', () => {
    // Uten denne kunne kinematikken vært konsekvent gal — like lemmer overalt,
    // men ikke de lengdene modellen faktisk beskriver.
    const { joints, lerret } = alleFaser[0];
    const målt = lemmelengderPx(joints, lerret) as Record<string, number>;
    expect(målt.overarmH).toBeCloseTo(LEMMER.overarm, 0);
    expect(målt.underarmH).toBeCloseTo(LEMMER.underarm, 0);
    expect(målt.lårH).toBeCloseTo(LEMMER.lår, 0);
    expect(målt.leggH).toBeCloseTo(LEMMER.legg, 0);
  });
});

describe('Positurene står på gulvet', () => {
  /**
   * Gulvleddene er en påstand om hvilke ledd som bærer vekt. Uten den kunne en
   * positur ha hendene i lufta og føttene i gulvet uten at noe sa fra: den
   * gamle armhevingen hadde håndleddet 122 px UNDER ankelen — en planke med
   * hendene på en kasse — og ingen test merket det.
   */
  const GULV_TOLERANSE_PX = 12;

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
