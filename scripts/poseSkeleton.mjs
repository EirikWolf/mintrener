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

/** Enkel RGB-buffer med svart bakgrunn — OpenPose-skjeletter tegnes på svart. */
function createCanvas(width, height) {
  return { width, height, data: new Uint8Array(width * height * 3) };
}

function blend(canvas, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const i = (y * canvas.width + x) * 3;
  for (let c = 0; c < 3; c++) {
    canvas.data[i + c] = Math.round(canvas.data[i + c] * (1 - alpha) + color[c] * alpha);
  }
}

/**
 * Fylt sirkel med myk kant.
 *
 * Antialiasing er ikke pynt her: harde trappetrinn i skjelettet gir ControlNet
 * et signal som ikke finnes i treningsdataene, og posituren blir mindre stabil.
 */
function fillCircle(canvas, cx, cy, radius, color) {
  const r0 = Math.floor(cx - radius - 1);
  const r1 = Math.ceil(cx + radius + 1);
  const c0 = Math.floor(cy - radius - 1);
  const c1 = Math.ceil(cy + radius + 1);
  for (let y = c0; y <= c1; y++) {
    for (let x = r0; x <= r1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const alpha = Math.min(1, Math.max(0, radius + 0.5 - d));
      if (alpha > 0) blend(canvas, x, y, color, alpha);
    }
  }
}

/** Tykk strek med runde ender — stempler sirkler langs segmentet. */
function drawThickLine(canvas, x0, y0, x1, y1, halfWidth, color) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(canvas, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, halfWidth, color);
  }
}

/**
 * Tegner ett skjelett.
 *
 * `joints` er 18 punkter som [x, y] i 0–1, eller null for et ledd som ikke er
 * synlig i denne posituren. Et utelatt ledd tegnes ikke, og lemmene til det
 * tegnes heller ikke — det er slik OpenPose markerer okklusjon, og ControlNet
 * tolker fraværet riktig.
 */
export function drawSkeleton(joints, opts = {}) {
  const width = opts.width ?? POSE_CANVAS.width;
  const height = opts.height ?? POSE_CANVAS.height;
  const limbHalfWidth = opts.limbHalfWidth ?? 7;
  const jointRadius = opts.jointRadius ?? 9;

  if (joints.length !== 18) {
    throw new Error(`Skjelettet må ha 18 ledd (COCO-18), fikk ${joints.length}`);
  }

  const canvas = createCanvas(width, height);
  const px = (p) => [p[0] * width, p[1] * height];

  // Lemmer først, ledd over: knutepunktene skal være synlige der lemmer møtes
  LIMBS.forEach(([a, b], i) => {
    const pa = joints[a];
    const pb = joints[b];
    if (!pa || !pb) return;
    const [x0, y0] = px(pa);
    const [x1, y1] = px(pb);
    drawThickLine(canvas, x0, y0, x1, y1, limbHalfWidth, COLORS[i]);
  });

  joints.forEach((p, i) => {
    if (!p) return;
    const [x, y] = px(p);
    fillCircle(canvas, x, y, jointRadius, COLORS[i]);
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
