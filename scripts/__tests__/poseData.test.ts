import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs uten typedeklarasjon
import { POSES, toCoco18 } from '../poseData.mjs';
import { EXERCISE_LIBRARY } from '../../src/data/exercises';

/**
 * Posedataene mot øvelseskatalogen.
 *
 * Et skjelett for en øvelse som ikke finnes, eller en koordinat utenfor
 * lerretet, feiler ikke — det gir bare et bilde som er litt galt. Det er
 * nøyaktig feilklassen bildekurateringen 2026-08-31 fant 17 av.
 */

type Fase = { navn: string; symmetrisk?: unknown; høyre?: unknown };
type Pose = { vinkel: string; hold?: boolean; faser: Fase[] };

const oppføringer = Object.entries(POSES) as [string, Pose][];

describe('Posedataene', () => {
  it('peker bare på øvelser som finnes i katalogen', () => {
    const kjente = new Set(EXERCISE_LIBRARY.map((ex) => ex.id));
    const ukjente = oppføringer.map(([id]) => id).filter((id) => !kjente.has(id));
    expect(ukjente, `Poser uten øvelse: ${ukjente.join(', ')}`).toEqual([]);
  });

  it('gir hver fase et navn, så en feil positur kan omtales', () => {
    for (const [id, def] of oppføringer) {
      def.faser.forEach((fase, i) => {
        expect(fase.navn, `${id} fase ${i}`).toBeTruthy();
      });
    }
  });

  it('holder alle koordinater innenfor lerretet', () => {
    for (const [id, def] of oppføringer) {
      def.faser.forEach((fase, i) => {
        toCoco18(fase).forEach((p: [number, number] | null, j: number) => {
          if (!p) return;
          expect(p[0], `${id} fase ${i} ledd ${j} x`).toBeGreaterThanOrEqual(0);
          expect(p[0], `${id} fase ${i} ledd ${j} x`).toBeLessThanOrEqual(1);
          expect(p[1], `${id} fase ${i} ledd ${j} y`).toBeGreaterThanOrEqual(0);
          expect(p[1], `${id} fase ${i} ledd ${j} y`).toBeLessThanOrEqual(1);
        });
      });
    }
  });

  it('gir hver positur en torso — nakke, skuldre og hofter', () => {
    // Uten torso tegner ControlNet en kropp den finner på selv, og posituren
    // vi styrte mot er borte.
    for (const [id, def] of oppføringer) {
      def.faser.forEach((fase, i) => {
        const j = toCoco18(fase);
        for (const idx of [1, 2, 5, 8, 11]) {
          expect(j[idx], `${id} fase ${i} mangler ledd ${idx}`).not.toBeNull();
        }
      });
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
      const a = toCoco18(def.faser[0]);
      const b = toCoco18(def.faser[1]);
      const avstand = a.reduce((sum: number, p: [number, number] | null, i: number) => {
        const q = b[i];
        return p && q ? sum + Math.hypot(p[0] - q[0], p[1] - q[1]) : sum;
      }, 0);
      expect(avstand, `${id}: fasene er for like (${avstand.toFixed(2)})`).toBeGreaterThan(0.5);
    }
  });
});
