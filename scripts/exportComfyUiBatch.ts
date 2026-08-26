import { EXERCISE_LIBRARY } from '../src/data/exercises';
import { exportAllExercisePromptJobs } from '../src/services/imagePromptService';
import * as fs from 'fs';
import * as path from 'path';

function main() {
  console.log(`Laster øvelser fra biblioteket (${EXERCISE_LIBRARY.length} øvelser)...`);
  const jobs = exportAllExercisePromptJobs(EXERCISE_LIBRARY);
  
  const outputPath = path.join(__dirname, 'comfyui_batch_payload.json');
  fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2), 'utf-8');

  console.log(`Genererte ${jobs.length} prompt-jobber til ${outputPath}`);
}

main();
