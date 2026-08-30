import { describe, it, expect } from 'vitest';
import { EXERCISE_LIBRARY } from '../exercises/index';
import { TRAINING_PROGRAMS } from '../programs';
import { STARTER_CHALLENGES } from '../challenges';
import { SKILL_TREES } from '../skillTrees';
import {
  STRENGTH_PROGRAM_TEMPLATES,
  STERKERE_12_UKER,
  STERKERE_12_UKER_2_DAGER,
  STERKERE_12_UKER_3_DAGER,
  STERKERE_12_UKER_4_DAGER,
  STRENGTH_EVIDENCE_BASIS,
} from '../strengthPrograms';
import { StrengthProgramTemplateSchema } from '../../schemas/strengthSchema';

describe('Referanseintegritet for øvelses-ID-er og treningspakker (Revisjon 2026-08-30)', () => {
  const validExerciseIds = new Set(EXERCISE_LIBRARY.map((e) => e.id));

  it('alle øvelses-IDer i TRAINING_PROGRAMS finnes i EXERCISE_LIBRARY', () => {
    const missing: { programId: string; exerciseId: string; exerciseName: string }[] = [];

    for (const program of TRAINING_PROGRAMS) {
      for (const item of program.workout.items) {
        if (!validExerciseIds.has(item.exercise.id)) {
          missing.push({
            programId: program.id,
            exerciseId: item.exercise.id,
            exerciseName: item.exercise.name,
          });
        }
      }
    }

    expect(missing, `Fant ${missing.length} spøkelsesøvelser i programs.ts: ${JSON.stringify(missing, null, 2)}`).toEqual([]);
  });

  it('alle øvelses-IDer i STARTER_CHALLENGES finnes i EXERCISE_LIBRARY', () => {
    const missing: { challengeId: string; exerciseId: string }[] = [];

    for (const chal of STARTER_CHALLENGES) {
      if (chal.dailyWorkouts) {
        for (const day of chal.dailyWorkouts) {
          if (day.workout) {
            for (const item of day.workout.items) {
              if (!validExerciseIds.has(item.exercise.id)) {
                missing.push({
                  challengeId: chal.id,
                  exerciseId: item.exercise.id,
                });
              }
            }
          }
        }
      }
    }

    expect(missing, `Fant ${missing.length} spøkelsesøvelser i challenges.ts: ${JSON.stringify(missing, null, 2)}`).toEqual([]);
  });

  it('alle øvelses-IDer i SKILL_TREES finnes i EXERCISE_LIBRARY', () => {
    const missing: { treeId: string; level: number; exerciseId: string }[] = [];

    for (const tree of SKILL_TREES) {
      for (const level of tree.levels) {
        if (!validExerciseIds.has(level.exerciseId)) {
          missing.push({
            treeId: tree.id,
            level: level.level,
            exerciseId: level.exerciseId,
          });
        }
      }
    }

    expect(missing, `Fant ${missing.length} spøkelsesøvelser i skillTrees.ts: ${JSON.stringify(missing, null, 2)}`).toEqual([]);
  });

  describe('Spesifikke profiløvelser (Senior, Kor, Idrettslag)', () => {
    it('Senior-profilene inneholder dokumenterte Otago-øvelser for fallforebygging', () => {
      const seniorPrograms = TRAINING_PROGRAMS.filter((p) => p.targetProfileId === 'senior');
      expect(seniorPrograms.length).toBeGreaterThanOrEqual(4);

      const allSeniorExerciseIds = seniorPrograms.flatMap((p) => p.workout.items.map((i) => i.exercise.id));
      // Otago kjerneøvelser: reise-seg, tåhev, knestrekk, tandembalanse, ettbeinsstand
      expect(allSeniorExerciseIds).toContain('seated-knestrekk');
      expect(allSeniorExerciseIds).toContain('tahev-stotte');
      expect(allSeniorExerciseIds).toContain('reise-seg-stol');
      expect(allSeniorExerciseIds).toContain('balanse-tandem');
      expect(allSeniorExerciseIds).toContain('balanse-ettbein');
    });

    it('Kor-profilene inneholder diafragmapust og stemmemobilitet', () => {
      const korPrograms = TRAINING_PROGRAMS.filter((p) => p.targetProfileId === 'kor');
      expect(korPrograms.length).toBeGreaterThanOrEqual(4);

      const allKorExerciseIds = korPrograms.flatMap((p) => p.workout.items.map((i) => i.exercise.id));
      expect(allKorExerciseIds).toContain('diafragma-pust');
      expect(allKorExerciseIds).toContain('boks-pust');
      expect(allKorExerciseIds).toContain('sugeror-pust');
      expect(allKorExerciseIds).toContain('utpust-s-lyd');
      expect(allKorExerciseIds).toContain('skulder-dislocates');
    });

    it('Idrettslag-profilene inneholder FIFA 11+ skadeforebyggende øvelser', () => {
      const idrettPrograms = TRAINING_PROGRAMS.filter((p) => p.targetProfileId === 'idrettslag');
      expect(idrettPrograms.length).toBeGreaterThanOrEqual(3);

      const allIdrettExerciseIds = idrettPrograms.flatMap((p) => p.workout.items.map((i) => i.exercise.id));
      expect(allIdrettExerciseIds).toContain('nordic-hamstring');
      expect(allIdrettExerciseIds).toContain('copenhagen-planke');
      expect(allIdrettExerciseIds).toContain('ettbeins-landing');
    });
  });

  describe('Styrkeprogrammer for «Sterkere 12 uker» (2, 3 og 4 dager)', () => {
    it('alle styrkemaler validerer mot StrengthProgramTemplateSchema', () => {
      for (const template of STRENGTH_PROGRAM_TEMPLATES) {
        const parsed = StrengthProgramTemplateSchema.safeParse(template);
        expect(parsed.success, `Validering feilet for ${template.id}: ${JSON.stringify(parsed)}`).toBe(true);
      }
    });

    it('inkluderer 2-, 3- og 4-dagers ukemaler med 12 ukers varighet og 4 faser', () => {
      expect(STERKERE_12_UKER_2_DAGER.daysPerWeek).toBe(2);
      expect(STERKERE_12_UKER_3_DAGER.daysPerWeek).toBe(3);
      expect(STERKERE_12_UKER_4_DAGER.daysPerWeek).toBe(4);
      expect(STERKERE_12_UKER.durationWeeks).toBe(12);

      for (const prog of [STERKERE_12_UKER_2_DAGER, STERKERE_12_UKER_3_DAGER, STERKERE_12_UKER_4_DAGER, STERKERE_12_UKER]) {
        expect(prog.phases).toHaveLength(4);
        expect(prog.phases[0].phaseName).toContain('Hypertrofi');
        expect(prog.phases[1].phaseName).toContain('Styrkebygging');
        expect(prog.phases[2].phaseName).toContain('Topping');
        expect(prog.phases[3].phaseName).toContain('Deload');
      }
    });

    it('har eksplisitte basis-referanser til Iversen et al. 2021 og Schoenfeld', () => {
      expect(STRENGTH_EVIDENCE_BASIS.length).toBeGreaterThanOrEqual(3);

      const iversenRef = STRENGTH_EVIDENCE_BASIS.find((b) => b.ref.includes('Iversen') && b.ref.includes('2021'));
      expect(iversenRef).toBeDefined();
      expect(iversenRef?.note).toContain('Tidseffektiv');

      const schoenfeldRef = STRENGTH_EVIDENCE_BASIS.find(
        (b) => b.ref.startsWith('Schoenfeld') || b.ref.includes('Effects of Resistance Training Frequency')
      );
      expect(schoenfeldRef).toBeDefined();
      expect(schoenfeldRef?.note.toLowerCase()).toContain('frekvens');

      for (const prog of STRENGTH_PROGRAM_TEMPLATES) {
        expect(prog.basis).toEqual(STRENGTH_EVIDENCE_BASIS);
      }
    });
  });
});
