import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPose, POSE_CANVAS, POSE_CANVAS_LANDSCAPE } from './poseSkeleton.mjs';
import { POSES, toCoco18 } from './poseData.mjs';

/**
 * Tegner OpenPose-skjelettene og legger dem i pipeline/poses/.
 *
 * Vedlegg A § A.6: skjelettene sjekkes inn i repoet. «De er små og er det som
 * faktisk definerer biblioteket visuelt.» Derfor skrives også leddkoordinatene
 * ved siden av PNG-en — en positur som må rettes, rettes i JSON og tegnes på
 * nytt, ikke i et bilderedigeringsprogram.
 *
 * Kjør: node scripts/buildPoseSkeletons.mjs
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UT = join(ROOT, 'pipeline', 'poses');

let antallØvelser = 0;
let antallSkjeletter = 0;
const hold = [];

for (const [id, def] of Object.entries(POSES)) {
  const mappe = join(UT, id);
  mkdirSync(mappe, { recursive: true });
  antallØvelser++;
  if (def.hold) hold.push(id);

  const lerret = def.lerret === 'liggende' ? POSE_CANVAS_LANDSCAPE : POSE_CANVAS;

  def.faser.forEach((fase, i) => {
    const joints = toCoco18(fase);
    writeFileSync(join(mappe, `${i}_pose.png`), renderPose(joints, lerret));
    writeFileSync(
      join(mappe, `${i}_pose.json`),
      JSON.stringify(
        {
          øvelse: id,
          fase: i,
          navn: fase.navn,
          vinkel: def.vinkel,
          lerret,
          format: 'COCO-18, normaliserte koordinater (0–1), null = ikke synlig',
          ledd: joints,
        },
        null,
        2
      ) + '\n'
    );
    antallSkjeletter++;
  });
}

console.log(`[poser] ${antallSkjeletter} skjeletter for ${antallØvelser} øvelser → pipeline/poses/`);
if (hold.length > 0) {
  console.log(`[poser] statiske hold med én fase: ${hold.join(', ')}`);
}
