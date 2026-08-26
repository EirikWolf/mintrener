import fs from 'fs';
import path from 'path';

const KITOR_HOST = process.env.KITOR_HOST || 'https://kitor.tail49f298.ts.net';
const COMFY_PATH = '/comfy-mintrener';

function getToken(): string {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/^KITOR_TOKEN=(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  throw new Error('KITOR_TOKEN mangler i .env');
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

          if (filename && (subfolder?.includes('mintrener') || filename.includes('kneboy') || filename.includes('kettlebell') || filename.includes('push-ups'))) {
            const url = `${KITOR_HOST}${COMFY_PATH}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
            
            // Map filnavn til rent format: f.eks. kneboy-0.png, kettlebell-swing-1.png
            let cleanName = filename;
            if (filename.includes('kneboy_step0')) cleanName = 'kneboy-0.png';
            else if (filename.includes('kneboy_step1')) cleanName = 'kneboy-1.png';
            else if (filename.includes('kettlebell-swing_step0')) cleanName = 'kettlebell-swing-0.png';
            else if (filename.includes('kettlebell-swing_step1')) cleanName = 'kettlebell-swing-1.png';
            else if (filename.includes('push-ups_step0')) cleanName = 'push-ups-0.png';
            else if (filename.includes('push-ups_step1')) cleanName = 'push-ups-1.png';

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
