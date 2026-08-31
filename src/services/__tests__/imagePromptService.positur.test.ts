import { describe, it, expect } from 'vitest';
import {
  ASTRID_FLUX_DEMO_STYLE,
  POSE_CANVAS,
  buildAstridFluxPoseWorkflow,
  buildComfyPromptJob,
  seedForExercise,
} from '../imagePromptService';
import { ExerciseItem } from '../../schemas/exerciseSchema';

/**
 * Positurstyring for øvelsesbildene.
 *
 * Vedlegg A § A.6 slo fast at prompt-basert positurstyring ikke virker: «uten
 * skjelett er posisjonen upålitelig», etter at det feilet i to batcher.
 * Løsningen — ControlNet Union Pro 2.0 med OpenPose — ble spesifisert i detalj,
 * installert på kitor, og aldri koblet inn i workflowen vi faktisk kjørte.
 *
 * Vision-gjennomgangen 2026-08-31 målte følgen: 17 av 28 bildepar viser ikke
 * øvelsen. Feilene er posisjonsfeil, ikke stilfeil.
 *
 * To ting til som gjorde vondt verre, begge dekket her:
 *
 * 1. Hver fase fikk sin egen seed (`200 + total * 888`), så start og slutt
 *    ble ulik person i ulikt rom. Seeden hører til ØVELSEN, ikke bildet.
 * 2. Stilprompten krevde «warm confident encouraging smile» samtidig som
 *    øvelsesprompten krevde streng sideprofil og bunnposisjon. Bare én av dem
 *    kan vinne, og det ble smilet.
 */

const mockExercise = {
  id: 'push-ups',
  navn: { nb: 'Armhevinger', en: 'Push-ups' },
  bildePrompt: {
    '0': 'rigid high plank starting position, arms straight',
    '1': 'lowest point of a push-up, chest near floor',
  },
  bildeVinkel: 'side',
} as unknown as ExerciseItem;

describe('Seeden hører til øvelsen, ikke til bildet', () => {
  it('gir samme seed for begge faser av samme øvelse', () => {
    expect(seedForExercise('push-ups')).toBe(seedForExercise('push-ups'));
  });

  it('gir ulik seed for ulike øvelser', () => {
    expect(seedForExercise('push-ups')).not.toBe(seedForExercise('kneboy'));
  });

  it('er deterministisk mellom kjøringer, så en batch kan gjentas', () => {
    // Ingen Math.random og ingen løpende teller: samme id gir samme tall i dag
    // og om et halvt år. Uten det kan vi ikke regenerere ÉN øvelse på nytt
    // uten å endre alle de andre.
    expect(seedForExercise('planke')).toBe(seedForExercise('planke'));
    expect(Number.isInteger(seedForExercise('planke'))).toBe(true);
    expect(seedForExercise('planke')).toBeGreaterThan(0);
  });
});

describe('Fase-prompten ber ikke lenger om et smil', () => {
  it('holder smil og «treningsglede» ute av demonstrasjonsstilen', () => {
    expect(ASTRID_FLUX_DEMO_STYLE).not.toMatch(/smile/i);
    expect(ASTRID_FLUX_DEMO_STYLE).not.toMatch(/joy/i);
    expect(ASTRID_FLUX_DEMO_STYLE).not.toMatch(/radiant/i);
  });

  it('bruker demonstrasjonsstilen i jobben som sendes til ComfyUI', () => {
    const job = buildComfyPromptJob(mockExercise, 1);
    expect(job.positivePrompt).not.toMatch(/smile/i);
    expect(job.positivePrompt).toContain(ASTRID_FLUX_DEMO_STYLE);
  });

  it('setter posituren først, ikke stilen', () => {
    // Batch-scriptet satte stilen først og begravde handlingen midt i
    // prompten. Handlingen skal komme før alt annet.
    const job = buildComfyPromptJob(mockExercise, 1);
    const posisjon = job.positivePrompt.indexOf('lowest point of a push-up');
    const stil = job.positivePrompt.indexOf(ASTRID_FLUX_DEMO_STYLE);
    expect(posisjon).toBeGreaterThanOrEqual(0);
    expect(posisjon).toBeLessThan(stil);
  });
});

describe('Workflowen styrer posituren med skjelett', () => {
  const wf: Record<string, { class_type: string; inputs: Record<string, unknown> }> =
    buildAstridFluxPoseWorkflow(
    'test prompt',
    seedForExercise('push-ups'),
    'push-ups_step1',
    'mintrener/poses/push-ups-1_pose.png'
  );

  function nodeAv(type: string) {
    return Object.values(wf).find((n) => n.class_type === type);
  }

  it('laster ControlNet-modellen vedlegg A spesifiserer', () => {
    expect(nodeAv('ControlNetLoader')?.inputs.control_net_name).toBe(
      'flux1-dev-controlnet-union-pro-2.0.safetensors'
    );
  });

  it('setter union-typen til openpose', () => {
    expect(nodeAv('SetUnionControlNetType')?.inputs.type).toBe('openpose');
  });

  it('bruker styrken og vinduet fra vedlegg A', () => {
    const apply = nodeAv('ControlNetApplyAdvanced');
    expect(apply?.inputs.strength).toBe(0.9);
    expect(apply?.inputs.start_percent).toBe(0.0);
    expect(apply?.inputs.end_percent).toBe(0.65);
  });

  it('laster skjelettbildet', () => {
    expect(nodeAv('LoadImage')?.inputs.image).toBe('mintrener/poses/push-ups-1_pose.png');
  });

  it('lar samplerens positive gå gjennom ControlNet, ikke rundt den', () => {
    const applyId = Object.keys(wf).find(
      (k) => wf[k].class_type === 'ControlNetApplyAdvanced'
    );
    const sampler = nodeAv('KSampler');
    expect((sampler?.inputs.positive as [string, number])[0]).toBe(applyId);
  });

  it('holder seeden den fikk, så begge faser deler person og rom', () => {
    expect(nodeAv('KSampler')?.inputs.seed).toBe(seedForExercise('push-ups'));
  });

  it('bruker samme lerret for skjelett og latent', () => {
    // Vedlegg A: «skjelettets lerret må ha samme sideforhold som latenten —
    // 896×1152. Et kvadratisk skjelett gir forskjøvet positur.»
    const latent = nodeAv('EmptyLatentImage');
    expect(latent?.inputs.width).toBe(POSE_CANVAS.width);
    expect(latent?.inputs.height).toBe(POSE_CANVAS.height);
    expect(POSE_CANVAS).toEqual({ width: 896, height: 1152 });
  });
});
