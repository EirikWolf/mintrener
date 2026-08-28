import fs from 'fs';
import path from 'path';
import { getKitorToken } from './kitorEnv';

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';

function getToken(): string {
  return getKitorToken();
}

async function downloadImages() {
  const token = getToken();
  console.log('📡 Henter ComfyUI historikk...');
  const res = await fetch(`${KITOR_HOST}${COMFY_PATH}/history`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Klarte ikke hente historikk: ${res.status}`);
  }

  const history = await res.json() as Record<string, any>;
  const outputDir = path.resolve(process.cwd(), 'public', 'images', 'exercises');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let count = 0;
  for (const promptId of Object.keys(history)) {
    const item = history[promptId];
    const outputs = item?.outputs;
    if (!outputs) continue;

    for (const nodeId of Object.keys(outputs)) {
      const nodeOut = outputs[nodeId];
      if (nodeOut.images && Array.isArray(nodeOut.images)) {
        for (const img of nodeOut.images) {
          const filename = img.filename as string;
          const subfolder = img.subfolder as string;
          const type = img.type || 'output';

          if (filename && subfolder?.includes('mintrener')) {
            const url = `${KITOR_HOST}${COMFY_PATH}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
            
            // Map {exercise_id}_step{0|1}_... til {exercise_id}-{phase}.png
            let cleanName = filename;
            const match = filename.match(/^([a-zA-Z0-9-]+)_step([0-9]+)/);
            if (match) {
              cleanName = `${match[1]}-${match[2]}.png`;
            }

            console.log(`📥 Laster ned: ${filename} -> public/images/exercises/${cleanName}`);
            const imgRes = await fetch(url, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              fs.writeFileSync(path.join(outputDir, cleanName), buffer);
              count++;
            }
          }
        }
      }
    }
  }

  console.log(`✅ Ferdig! Lastet ned ${count} bilder til public/images/exercises/`);
}

downloadImages().catch(console.error);
