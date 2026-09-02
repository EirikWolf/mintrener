import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { encodePng } from './poseSkeleton.mjs';

/**
 * Kontaktark for kurering av genererte bilder.
 *
 * Å bedømme en batch krever å SE den. Ett bilde om gangen er dyrt — femten
 * bilder ved siden av hverandre er ett blikk, og forskjellen mellom «virker
 * for alle øvelser» og «virker bare for superman» er synlig med en gang.
 *
 * Dekoderen under finnes fordi vi allerede har en PNG-KODER (poseSkeleton), men
 * ingen dekoder, og ingen bildebibliotek i prosjektet. Den dekker det ComfyUI
 * faktisk skriver: 8 bit, fargetype 2 og 6.
 *
 * Kjør:  node scripts/lagKontaktark.mjs <fil1.png> <fil2.png> ...
 *        (filer relativt til pipeline/candidates/dybdetest/)
 */

/** Minimal PNG-dekoder: 8 bit, fargetype 2 (RGB) og 6 (RGBA). */
function decodePng(buf) {
  let p = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error('kun 8 bits dybde');
      ct = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const kanaler = ct === 6 ? 4 : ct === 2 ? 3 : (() => { throw new Error('fargetype ' + ct); })();
  const raw = inflateSync(Buffer.concat(idat));
  const linje = w * kanaler;
  const ut = Buffer.alloc(h * linje);
  let f = 0, o = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[f++];
    for (let x = 0; x < linje; x++) {
      const rå = raw[f + x];
      const a = x >= kanaler ? ut[o + x - kanaler] : 0;
      const b = y > 0 ? ut[o - linje + x] : 0;
      const c = x >= kanaler && y > 0 ? ut[o - linje + x - kanaler] : 0;
      let v;
      switch (filter) {
        case 0: v = rå; break;
        case 1: v = rå + a; break;
        case 2: v = rå + b; break;
        case 3: v = rå + ((a + b) >> 1); break;
        case 4: {
          const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
          v = rå + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error('filter ' + filter);
      }
      ut[o + x] = v & 0xff;
    }
    f += linje; o += linje;
  }
  return { width: w, height: h, kanaler, data: ut };
}

const CW = 300, CH = 234, KOL = 5;
const DIR = process.env.KONTAKTARK_DIR ?? 'pipeline/candidates/dybdetest/';
const filer = process.argv.slice(2);

const rader = Math.ceil(filer.length / KOL);
const W = KOL * CW, H = rader * CH;
const stor = { width: W, height: H, data: new Uint8Array(W * H * 3) };

filer.forEach((navn, n) => {
  const img = decodePng(readFileSync(DIR + navn));
  const ox = (n % KOL) * CW, oy = Math.floor(n / KOL) * CH;
  // Nærmeste nabo — vi bedømmer positur og antall hoder, ikke skarphet.
  for (let y = 0; y < CH; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y * img.height) / CH));
    for (let x = 0; x < CW; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x * img.width) / CW));
      const s = (sy * img.width + sx) * img.kanaler;
      const d = ((oy + y) * W + ox + x) * 3;
      stor.data[d] = img.data[s]; stor.data[d + 1] = img.data[s + 1]; stor.data[d + 2] = img.data[s + 2];
    }
  }
  for (let x = 0; x < CW; x++) { const d = (oy * W + ox + x) * 3; stor.data[d] = 255; stor.data[d+1] = 60; stor.data[d+2] = 60; }
  for (let y = 0; y < CH; y++) { const d = ((oy + y) * W + ox) * 3; stor.data[d] = 255; stor.data[d+1] = 60; stor.data[d+2] = 60; }
});

const UT = process.env.KONTAKTARK_UT ?? 'kontaktark.png';
writeFileSync(UT, encodePng(stor));
console.log(filer.map((f, i) => `${i}: ${f.replace('.png','')}`).join('  |  '));
