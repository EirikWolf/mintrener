import { describe, it, expect, vi } from 'vitest';
import { EXERCISE_LIBRARY } from '../../src/data/exercises';
import {
  exportAllExercisePromptJobs,
  formatViewAngle,
  buildAstridFluxWorkflow,
  buildAstridWanVideoWorkflow,
  buildComfyPromptJob,
  ASTRID_FLUX_BASE_STYLE,
} from '../../src/services/imagePromptService';
import { exportBatchFiles } from '../exportComfyUiBatch';
import { runFullBatch } from '../runFullKitorBatch';
import fs from 'fs';
import path from 'path';

describe('Kitor Batch Infrastructure & 74 Exercises Coverage', () => {
  it('alle 74 øvelser finnes i EXERCISE_LIBRARY', () => {
    expect(EXERCISE_LIBRARY.length).toBe(74);
  });

  it('alle 74 øvelser har fullverdige prompt-definisjoner for både fase 0 og fase 1', () => {
    for (const ex of EXERCISE_LIBRARY) {
      expect(ex.bildePrompt, `Øvelse ${ex.id} (${ex.navn.nb}) mangler bildePrompt`).toBeDefined();
      expect(ex.bildePrompt?.['0'], `Øvelse ${ex.id} mangler fase 0 prompt`).toBeDefined();
      expect(ex.bildePrompt?.['1'], `Øvelse ${ex.id} mangler fase 1 prompt`).toBeDefined();
      
      expect(ex.bildePrompt!['0'].length, `Fase 0 prompt for ${ex.id} er for kort`).toBeGreaterThanOrEqual(20);
      expect(ex.bildePrompt!['1'].length, `Fase 1 prompt for ${ex.id} er for kort`).toBeGreaterThanOrEqual(20);

      // Sjekk at vinkel er satt
      expect(['side', 'front', 'skrå']).toContain(ex.bildeVinkel || 'side');
    }
  });

  it('formatViewAngle konverterer vinkler til optimal diffusion-engelsk', () => {
    expect(formatViewAngle('side')).toBe('side profile view');
    expect(formatViewAngle('front')).toBe('front view');
    expect(formatViewAngle('skrå')).toBe('three-quarter front-diagonal view');
    expect(formatViewAngle(undefined)).toBe('side profile view');
  });

  it('buildComfyPromptJob konstruerer komplette prompts med Astrid basis-stil', () => {
    const job0 = buildComfyPromptJob(EXERCISE_LIBRARY[0], 0);
    expect(job0.exerciseId).toBe(EXERCISE_LIBRARY[0].id);
    expect(job0.phaseIndex).toBe(0);
    expect(job0.outputFilename).toBe(`${EXERCISE_LIBRARY[0].id}-0.png`);
    expect(job0.positivePrompt).toContain('ASTRID');
    expect(job0.positivePrompt).toContain(EXERCISE_LIBRARY[0].bildePrompt!['0']);
  });

  it('exportAllExercisePromptJobs genererer nøyaktig 148 prompt-jobber (74 × 2)', () => {
    const jobs = exportAllExercisePromptJobs(EXERCISE_LIBRARY);
    expect(jobs.length).toBe(148);

    const filenames = new Set(jobs.map((j) => j.outputFilename));
    expect(filenames.size).toBe(148);
  });

  it('buildAstridFluxWorkflow genererer gyldig ComfyUI API graf med KSampler, LoRA og SaveImage', () => {
    const wf = buildAstridFluxWorkflow('Astrid workout prompt', 12345, 'test_exercise');
    expect(wf['1'].class_type).toBe('UNETLoader');
    expect(wf['2'].class_type).toBe('DualCLIPLoader');
    expect(wf['3'].class_type).toBe('VAELoader');
    expect(wf['4'].class_type).toBe('LoraLoaderModelOnly');
    expect(wf['4'].inputs.lora_name).toBe('synthiq/astrid_k.safetensors');
    expect(wf['5'].inputs.text).toBe('Astrid workout prompt');
    expect(wf['8'].inputs.seed).toBe(12345);
    expect(wf['10'].inputs.filename_prefix).toBe('mintrener/library/test_exercise');
  });

  it('buildAstridWanVideoWorkflow genererer gyldig Wan2.1 I2V videograf for ComfyUI', () => {
    const videoWf = buildAstridWanVideoWorkflow('kneboy-0.png', 'deep dynamic squat movement', 9999, 'kneboy_vid');
    expect(videoWf['1'].class_type).toBe('LoadImage');
    expect(videoWf['1'].inputs.image).toBe('kneboy-0.png');
    expect(videoWf['2'].inputs.unet_name).toBe('wan2.1_i2v_480p_14B_fp8.safetensors');
    expect(videoWf['5'].inputs.text).toContain('deep dynamic squat movement');
    expect(videoWf['7'].inputs.seed).toBe(9999);
    expect(videoWf['9'].class_type).toBe('VHS_VideoCombine');
  });

  it('exportBatchFiles eksporterer batch JSON-filer uten feil', () => {
    exportBatchFiles();

    const payloadPath = path.resolve(process.cwd(), 'scripts', 'comfyui_batch_payload.json');
    const fluxPath = path.resolve(process.cwd(), 'scripts', 'comfyui_flux_workflows.json');
    const wanPath = path.resolve(process.cwd(), 'scripts', 'comfyui_wan_workflows.json');

    expect(fs.existsSync(payloadPath)).toBe(true);
    expect(fs.existsSync(fluxPath)).toBe(true);
    expect(fs.existsSync(wanPath)).toBe(true);

    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));
    const flux = JSON.parse(fs.readFileSync(fluxPath, 'utf-8'));
    const wan = JSON.parse(fs.readFileSync(wanPath, 'utf-8'));

    expect(payload.length).toBe(148);
    expect(flux.length).toBe(148);
    expect(wan.length).toBe(148);
  });

  it('runFullBatch kjører i --dry-run modus uten å kaste feil', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(runFullBatch(['--dry-run'])).resolves.not.toThrow();
    consoleSpy.mockRestore();
  });
});
