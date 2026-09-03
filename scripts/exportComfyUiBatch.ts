import { EXERCISE_LIBRARY } from '../src/data/exercises';
import {
  exportAllExercisePromptJobs,
  buildAstridFluxWorkflow,
  buildAstridWanVideoWorkflow,
} from '../src/services/imagePromptService';
import * as fs from 'fs';
import * as path from 'path';

export function exportBatchFiles() {
  console.log(`===========================================================`);
  console.log(`📦 Eksporterer ComfyUI batch-filer for ${EXERCISE_LIBRARY.length} øvelser...`);
  console.log(`===========================================================`);

  const jobs = exportAllExercisePromptJobs(EXERCISE_LIBRARY);
  
  // 1. Eksporter prompt-jobber payload (JSON)
  const payloadPath = path.resolve(process.cwd(), 'scripts', 'comfyui_batch_payload.json');
  fs.writeFileSync(payloadPath, JSON.stringify(jobs, null, 2), 'utf-8');
  console.log(`✅ Genererte ${jobs.length} prompt-jobber til ${payloadPath}`);

  // 2. Eksporter fullstendige Flux.1 API-workflows (JSON)
  const fluxWorkflows = jobs.map((job, idx) => ({
    exerciseId: job.exerciseId,
    phaseIndex: job.phaseIndex,
    outputFilename: job.outputFilename,
    workflow: buildAstridFluxWorkflow(job.positivePrompt, 1000 + idx * 777, `${job.exerciseId}_step${job.phaseIndex}`),
  }));
  const fluxWorkflowsPath = path.resolve(process.cwd(), 'scripts', 'comfyui_flux_workflows.json');
  fs.writeFileSync(fluxWorkflowsPath, JSON.stringify(fluxWorkflows, null, 2), 'utf-8');
  console.log(`✅ Genererte ${fluxWorkflows.length} Flux.1 API-workflows til ${fluxWorkflowsPath}`);

  // 3. Eksporter Wan2.1 I2V Video-workflows (JSON)
  const wanWorkflows = jobs.map((job, idx) => ({
    exerciseId: job.exerciseId,
    phaseIndex: job.phaseIndex,
    inputImage: job.outputFilename,
    workflow: buildAstridWanVideoWorkflow(
      job.outputFilename,
      `${job.exerciseName} smooth repetition movement`,
      2000 + idx * 999,
      `${job.exerciseId}_motion_phase${job.phaseIndex}`
    ),
  }));
  const wanWorkflowsPath = path.resolve(process.cwd(), 'scripts', 'comfyui_wan_workflows.json');
  fs.writeFileSync(wanWorkflowsPath, JSON.stringify(wanWorkflows, null, 2), 'utf-8');
  console.log(`✅ Genererte ${wanWorkflows.length} Wan2.1 Video API-workflows til ${wanWorkflowsPath}`);
  console.log(`🎉 Eksport fullført for alle 74 øvelser (148 faser)!`);
}

if (process.argv[1] && (process.argv[1].endsWith('exportComfyUiBatch.ts') || process.argv[1].endsWith('exportComfyUiBatch.js'))) {
  exportBatchFiles();
}

