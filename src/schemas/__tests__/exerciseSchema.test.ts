import { describe, it, expect } from 'vitest';
import { validateExercise, validateExerciseList } from '../exerciseSchema';

describe('Exercise JSON Schema Validator', () => {
  const validKettlebellSwing = {
    id: 'kettlebell-swing',
    navn: { nb: 'Kettlebell-swing', en: 'Kettlebell swing' },
    type: 'reps',
    kategori: 'kettlebell',
    muskler: {
      primær: ['sete', 'bakside lår'],
      sekundær: ['korsrygg', 'skuldre'],
    },
    utstyr: ['kettlebell'],
    nivå: 'middels',
    instruks: {
      nb: [
        'Stå med føttene litt bredere enn skulderbredde, plasser kulen en fot foran deg.',
        'Hengsel i hoften og grip kulen med begge hender.',
        'Sving kulen eksplosivt opp til brysthøyde ved å skyve hoften kraftig frem.',
        'La kulen falle naturlig tilbake mellom bena i en ny hoftebøy.',
      ],
      en: [
        'Stand with feet shoulder-width apart.',
        'Hinge at the hips and grab the kettlebell.',
        'Drive through hips to swing to chest height.',
      ],
    },
    vanligeFeil: {
      nb: ['Knebøye i stedet for å hengsle i hoften', 'Løfte med armene i stedet for hoften'],
    },
    sensorProfil: 'swing',
    bildePrompt: {
      '0': 'figure hinging at hips holding kettlebell between legs',
      '1': 'figure standing tall with kettlebell floating at chest height',
    },
    bildeVinkel: 'side',
    bildeStatus: 'mangler',
  };

  it('validerer en korrekt definert øvelse med suksess', () => {
    const res = validateExercise(validKettlebellSwing);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.id).toBe('kettlebell-swing');
      expect(res.data.kategori).toBe('kettlebell');
      expect(res.data.muskler.primær).toContain('sete');
    }
  });

  it('avviser ugyldig ID (f.eks. med mellomrom eller store bokstaver)', () => {
    const invalid = { ...validKettlebellSwing, id: 'Kettlebell Swing!' };
    const res = validateExercise(invalid);
    expect(res.success).toBe(false);
  });

  it('avviser øvelse som mangler norsk navn eller har for få instruksjonspunkter', () => {
    const noName = { ...validKettlebellSwing, navn: {} };
    const resNoName = validateExercise(noName);
    expect(resNoName.success).toBe(false);

    const tooFewInstructions = {
      ...validKettlebellSwing,
      instruks: { nb: ['Kun ett punkt'] },
    };
    const resFew = validateExercise(tooFewInstructions);
    expect(resFew.success).toBe(false);
  });

  it('setter standardverdier for valgfrie felter automatisk', () => {
    const minimal = {
      id: 'armhevinger',
      navn: { nb: 'Armhevinger (Push-ups)' },
      type: 'reps',
      kategori: 'kroppsvekt',
      muskler: { primær: ['bryst', 'triceps'] },
      utstyr: ['ingen'],
      nivå: 'nybegynner',
      instruks: {
        nb: [
          'Plasser hendene i skulderbredde på gulvet.',
          'Senk kroppen til brystet nesten berører underlaget.',
          'Press opp igjen til strake armer med strak kjerne.',
        ],
      },
    };

    const res = validateExercise(minimal);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.muskler.sekundær).toEqual([]);
      expect(res.data.sensorProfil).toBe('ingen');
      expect(res.data.bildeVinkel).toBe('side');
      expect(res.data.bildeStatus).toBe('mangler');
    }
  });

  it('filtrerer korrekt i validateExerciseList for bolk-validering', () => {
    const list = [
      validKettlebellSwing,
      { id: 'ugyldig-1', navn: { nb: 'X' } }, // mangler påkrevde felt
    ];

    const result = validateExerciseList(list);
    expect(result.valid.length).toBe(1);
    expect(result.invalid.length).toBe(1);
  });
});
