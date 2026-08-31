import { deflateSync } from 'node:zlib';

/**
 * Tegner OpenPose COCO-18-skjeletter og koder dem som PNG.
 *
 * Vedlegg A § A.6: ControlNet med skjelett er det som gjorde at posituren ble
 * riktig etter at to prompt-baserte batcher feilet. Skjelettene kan komme fra
 * DWPose på referansefoto, eller tegnes programmatisk. Vi tegner: det krever
 * ingen bildekilde, ingen lisensavklaring, og gir oss full kontroll på posen.
 *
 * Ingen nye avhengigheter. PNG er enkel nok å skrive selv med Nodes zlib, og
 * en byggtidsavhengighet for å tegne streker er ikke verdt vedlikeholdet.
 *
 * KOORDINATER er normaliserte (0–1) slik at posene er uavhengige av lerretet.
 * Vedlegget er tydelig: skjelettets lerret må ha samme sideforhold som
 * latenten, ellers blir posituren forskjøvet.
 */

/** COCO-18, i den rekkefølgen ControlNet forventer. */
export const COCO18 = [
  'nese',
  'nakke',
  'høyre skulder',
  'høyre albue',
  'høyre håndledd',
  'venstre skulder',
  'venstre albue',
  'venstre håndledd',
  'høyre hofte',
  'høyre kne',
  'høyre ankel',
  'venstre hofte',
  'venstre kne',
  'venstre ankel',
  'høyre øye',
  'venstre øye',
  'høyre øre',
  'venstre øre',
];

/** Lemmene, som indekspar i COCO18. Rekkefølgen bestemmer fargen. */
export const LIMBS = [
  [1, 2], [1, 5], [2, 3], [3, 4], [5, 6], [6, 7],
  [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13],
  [1, 0], [0, 14], [14, 16], [0, 15], [15, 17],
];

/** OpenPose sin egen fargekonvensjon — ControlNet er trent på nøyaktig disse. */
export const COLORS = [
  [255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0],
  [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255],
  [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255],
  [255, 0, 255], [255, 0, 170], [255, 0, 85],
];

export const POSE_CANVAS = { width: 896, height: 1152 };

/**
 * Liggende lerret for liggende øvelser.
 *
 * Målt 2026-08-31: hvor mye av lerrethøyden skjelettet bruker, forutsier
 * resultatet nesten perfekt. Sprellmenn brukte 0,82 og ble riktig; superman
 * brukte 0,04 — en vannrett strek — og ble to personer, deretter en sittende
 * kvinne. Et portrettlerret tvinger en liggende kropp inn i en tynn stripe.
 *
 * Vedlegg A krever at skjelett og latent har SAMME sideforhold. Det kravet
 * holdes; det er portrett-formatet som ikke var et krav.
 */
export const POSE_CANVAS_LANDSCAPE = { width: 1152, height: 896 };

/** Enkel RGB-buffer med svart bakgrunn — OpenPose-skjeletter tegnes på svart. */
function createCanvas(width, height) {
  return { width, height, data: new Uint8Array(width * height * 3) };
}

function setPixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const i = (y * canvas.width + x) * 3;
  canvas.data[i] = color[0];
  canvas.data[i + 1] = color[1];
  canvas.data[i + 2] = color[2];
}

/**
 * Kanonisk lemme: en ROTERT ELLIPSE, ikke en kapsel med runde ender.
 *
 * `draw_bodypose` i comfyui_controlnet_aux bygger den med
 * `cv2.ellipse2Poly(midtpunkt, (lengde/2, stickwidth), vinkel, …)` og fyller
 * den med `fillConvexPoly` på 60 % av leddfargen. Forskjellen fra en kapsel er
 * ikke kosmetisk: ellipsen SMALNER mot endene, og et sterkt forkortet lem
 * degenererer nesten helt. ControlNet er trent på det, inkludert degenerasjonen.
 */
function fillLimbEllipse(canvas, x0, y0, x1, y1, stickwidth, color) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const a = Math.hypot(x1 - x0, y1 - y0) / 2;
  const b = stickwidth;
  if (a <= 0) return;

  const vinkel = Math.atan2(y1 - y0, x1 - x0);
  const cos = Math.cos(vinkel);
  const sin = Math.sin(vinkel);
  const r = Math.ceil(Math.max(a, b)) + 1;

  // 60 % lysstyrke, som int(float(c) * 0.6) i kilden
  const dempet = color.map((c) => Math.trunc(c * 0.6));

  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      // Roter inn i ellipsens eget koordinatsystem
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      // Hard kant, ingen kantutjevning: treningsdataene er aliaserte
      if ((u * u) / (a * a) + (v * v) / (b * b) <= 1) setPixel(canvas, x, y, dempet);
    }
  }
}

/** Kanonisk ledd: fylt sirkel, radius 4, full farge, hard kant. */
function fillJoint(canvas, cx, cy, radius, color) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= radius * radius) setPixel(canvas, x, y, color);
    }
  }
}

/**
 * Tegner ett skjelett, tro mot `draw_bodypose` i comfyui_controlnet_aux.
 *
 * Standardverdiene er kildens egne: stickwidth 4 (stick_scale 1), leddradius 4,
 * lemmer på 60 % lysstyrke, harde kanter. Første utkast brukte 7, 9, full
 * lysstyrke og kantutjevning — verdier jeg fant på fordi de så ryddige ut. Da
 * er det uvisst om en test måler ControlNet eller vår egen renderer.
 *
 * `joints` er 18 punkter som [x, y] i 0–1, eller null for et ledd som ikke er
 * synlig. Et utelatt ledd tegnes ikke, og lemmene til det heller ikke — det er
 * slik OpenPose markerer okklusjon.
 */
export function drawSkeleton(joints, opts = {}) {
  const width = opts.width ?? POSE_CANVAS.width;
  const height = opts.height ?? POSE_CANVAS.height;
  const stickwidth = opts.stickwidth ?? 4;
  const jointRadius = opts.jointRadius ?? 4;

  if (joints.length !== 18) {
    throw new Error(`Skjelettet må ha 18 ledd (COCO-18), fikk ${joints.length}`);
  }

  const canvas = createCanvas(width, height);
  const px = (p) => [p[0] * width, p[1] * height];

  // Lemmer først, ledd over — samme rekkefølge som kilden
  LIMBS.forEach(([a, b], i) => {
    const pa = joints[a];
    const pb = joints[b];
    if (!pa || !pb) return;
    const [x0, y0] = px(pa);
    const [x1, y1] = px(pb);
    fillLimbEllipse(canvas, x0, y0, x1, y1, stickwidth, COLORS[i]);
  });

  joints.forEach((p, i) => {
    if (!p) return;
    const [x, y] = px(p);
    fillJoint(canvas, x, y, jointRadius, COLORS[i]);
  });

  return canvas;
}

// --- PNG-koding ---------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

/** Koder en RGB-canvas som PNG (fargetype 2, 8 bit, filter 0). */
export function encodePng(canvas) {
  const { width, height, data } = canvas;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bitdybde
  ihdr[9] = 2; // truecolor RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptiv filtrering
  ihdr[12] = 0; // ingen interlace

  // Én filterbyte (0 = None) foran hver scanline
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const dst = y * (1 + width * 3);
    raw[dst] = 0;
    Buffer.from(data.buffer, y * width * 3, width * 3).copy(raw, dst + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Skjelett → PNG i ett steg. */
export function renderPose(joints, opts) {
  return encodePng(drawSkeleton(joints, opts));
}
