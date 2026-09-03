import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { getKitorToken } from './kitorEnv';

/**
 * Henter ferdiggenererte bilder fra ComfyUIs historikk.
 *
 * Nyttig når generering lyktes, men nedlastingen i batchen feilet — bildene
 * ligger da på kitor og skal ikke lages på nytt. GPU-tid brukt to ganger på
 * samme bilde er den dyreste feilen vi kan gjøre i denne pipelinen.
 *
 * Kjør:  npx tsx scripts/fetchGeneratedImages.ts [prefiks]
 */

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UT_DIR = path.join(ROOT, 'pipeline', 'candidates');

interface BildeRef {
  filename: string;
  subfolder: string;
  type: string;
}

async function main() {
  const token = getKitorToken(ROOT);
  const prefiks = process.argv[2] ?? '';

  const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/history?max_items=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Kunne ikke lese historikk (${res.status})`);
  const historikk = (await res.json()) as Record<string, any>;

  const bilder: BildeRef[] = [];
  for (const økt of Object.values(historikk)) {
    if (økt?.status?.status_str !== 'success') continue;
    for (const utgang of Object.values(økt.outputs ?? {})) {
      for (const im of (utgang as any).images ?? []) {
        // ComfyUI-historikken er DELT med andre prosjekter på kitor. Uten
        // mappe-filteret hentet dette SynthIQ-bilder inn i vårt repo — annet
        // prosjekts innhold, som ikke skal ligge her.
        const våres = (im.subfolder ?? '').startsWith('mintrener/');
        if (im.type === 'output' && våres && im.filename.startsWith(prefiks)) bilder.push(im);
      }
    }
  }

  // Siste kjøring vinner ved samme navn: historikken er kronologisk, og en
  // regenerert positur skal erstatte den forrige.
  const unike = new Map<string, BildeRef>();
  bilder.forEach((b) => unike.set(b.filename, b));

  console.log(`${unike.size} bilder i historikken${prefiks ? ` med prefiks «${prefiks}»` : ''}`);

  let hentet = 0;
  for (const b of unike.values()) {
    // «push-ups_f0_v2_00001_.png» → øvelse «push-ups», fil «push-ups_f0_v2.png»
    const rent = b.filename.replace(/_\d+_\.png$/, '.png');
    const øvelse = rent.replace(/_f\d+_v\d+\.png$/, '');
    const mappe = path.join(UT_DIR, øvelse);
    fs.mkdirSync(mappe, { recursive: true });

    const url = `${KITOR_HOST}${COMFY_PATH}/view?filename=${encodeURIComponent(
      b.filename
    )}&subfolder=${encodeURIComponent(b.subfolder)}&type=${encodeURIComponent(b.type)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) {
      console.warn(`  ✗ ${rent} (${r.status})`);
      continue;
    }
    fs.writeFileSync(path.join(mappe, rent), Buffer.from(await r.arrayBuffer()));
    hentet++;
  }

  console.log(`Hentet ${hentet} bilder → pipeline/candidates/`);
}

main().catch((err) => {
  console.error('Henting feilet:', err);
  process.exit(1);
});
