import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs uten typedeklarasjon; modulen er ren JS med dokumenterte signaturer
import { COCO18, LIMBS, COLORS, POSE_CANVAS, drawSkeleton, encodePng } from '../poseSkeleton.mjs';

/**
 * Skjelettgeneratoren.
 *
 * Vedlegg A § A.6 stiller tre krav som ikke er valgfrie, og som alle er
 * stille feil om de brytes — bildet blir bare litt galt, ikke feilende:
 *
 * 1. Lerretet må ha samme sideforhold som latenten (896×1152). Et kvadratisk
 *    skjelett gir forskjøvet positur.
 * 2. Fargekonvensjonen er OpenPose sin egen. ControlNet er trent på nøyaktig
 *    de fargene; andre farger leses som andre kroppsdeler.
 * 3. Bakgrunnen er svart. Alt annet blir tolket som signal.
 */

/** Enkel stående figur i normaliserte koordinater. */
function ståendeFigur(): ([number, number] | null)[] {
  return [
    [0.5, 0.09], // nese
    [0.5, 0.16], // nakke
    [0.44, 0.17], [0.42, 0.28], [0.41, 0.38], // høyre arm
    [0.56, 0.17], [0.58, 0.28], [0.59, 0.38], // venstre arm
    [0.46, 0.46], [0.45, 0.66], [0.45, 0.88], // høyre bein
    [0.54, 0.46], [0.55, 0.66], [0.55, 0.88], // venstre bein
    [0.48, 0.08], [0.52, 0.08], [0.46, 0.09], [0.54, 0.09], // hode
  ];
}

function pixel(canvas: { width: number; data: Uint8Array }, x: number, y: number) {
  const i = (y * canvas.width + x) * 3;
  return [canvas.data[i], canvas.data[i + 1], canvas.data[i + 2]];
}

describe('COCO-18-definisjonen', () => {
  it('har 18 ledd og 17 lemmer', () => {
    expect(COCO18).toHaveLength(18);
    expect(LIMBS).toHaveLength(17);
  });

  it('har én farge per ledd, og lemmene bruker de samme', () => {
    expect(COLORS).toHaveLength(18);
    expect(COLORS.every((c: number[]) => c.length === 3)).toBe(true);
  });

  it('refererer bare til ledd som finnes', () => {
    for (const [a, b] of LIMBS) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(18);
    }
  });

  it('bruker lerretet vedlegg A krever', () => {
    expect(POSE_CANVAS).toEqual({ width: 896, height: 1152 });
  });
});

describe('drawSkeleton', () => {
  it('tegner på svart bakgrunn', () => {
    const c = drawSkeleton(ståendeFigur());
    // Et hjørne er alltid utenfor figuren
    expect(pixel(c, 2, 2)).toEqual([0, 0, 0]);
  });

  it('setter farge der et ledd er', () => {
    const c = drawSkeleton(ståendeFigur());
    const [x, y] = [Math.round(0.5 * c.width), Math.round(0.16 * 1152)];
    expect(pixel(c, x, y).some((v) => v > 0)).toBe(true);
  });

  it('bruker lerretet fra vedlegget som standard', () => {
    const c = drawSkeleton(ståendeFigur());
    expect(c.width).toBe(896);
    expect(c.height).toBe(1152);
  });

  it('hopper over ledd som ikke er synlige, og lemmene til dem', () => {
    const skjult = ståendeFigur();
    skjult[7] = null; // venstre håndledd okkludert

    const medAlt = drawSkeleton(ståendeFigur());
    const utenHåndledd = drawSkeleton(skjult);

    const tent = (c: { data: Uint8Array }) => c.data.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
    expect(tent(utenHåndledd)).toBeLessThan(tent(medAlt));
  });

  it('avviser et skjelett som ikke har 18 ledd', () => {
    // En stille avkorting her ville gitt et skjelett uten bein, og et bilde
    // som ser nesten riktig ut.
    expect(() => drawSkeleton(ståendeFigur().slice(0, 12))).toThrow(/18 ledd/);
  });
});

describe('encodePng', () => {
  it('skriver en gyldig PNG-signatur og IHDR', () => {
    const png = encodePng(drawSkeleton(ståendeFigur()));
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(896);
    expect(png.readUInt32BE(20)).toBe(1152);
    expect(png[24]).toBe(8); // bitdybde
    expect(png[25]).toBe(2); // truecolor
  });

  it('avslutter med IEND', () => {
    const png = encodePng(drawSkeleton(ståendeFigur()));
    expect(png.subarray(png.length - 8, png.length - 4).toString('ascii')).toBe('IEND');
  });

  it('er deterministisk — samme pose gir samme fil', () => {
    // Skjelettene sjekkes inn i repoet. Var kodingen ustabil, ville hver
    // kjøring gitt en diff uten at noe var endret.
    const a = encodePng(drawSkeleton(ståendeFigur()));
    const b = encodePng(drawSkeleton(ståendeFigur()));
    expect(a.equals(b)).toBe(true);
  });
});
