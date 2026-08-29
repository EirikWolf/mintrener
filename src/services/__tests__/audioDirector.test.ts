// Tester for AudioDirector (B3 β2, spec § 4): fristbasert lookahead-skedulering
// mot motorens endsAt, deadlineChanged-kansellering/reskedulering, pip-fallback
// ved for trangt vindu, standard-sti-speiling av LegacyAudioAdapter, samt den
// rene prioritetsresolveren (tabelltest).
//
// Mønster gjenbrukt fra legacyAudioAdapter.test.ts: injiserte hendelser via en
// minimal strukturell motor-stubb + spies på lydtjeneste-grensene. audioBufferEngine
// mockes helt — lookahead-matematikken (anker-verdiene) asserteres på kall-nivå;
// selve skeduleringen er testet i audioBufferEngine-suiten (β1).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAudioDirector, resolveAnnouncementPlan, AudioDirectorEngine } from '../audioDirector';
import { EngineEvent } from '../../types/engineEvents';
import { TimerState } from '../../types/workout';
import { audioService } from '../audioService';
import { speechService } from '../speechService';
import { audioClipService } from '../audioClipService';
import { audioBufferEngine } from '../audioBufferEngine';
import * as coachPersonaService from '../coachPersonaService';
import { motionTrackerService } from '../motionTrackerService';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';

function createFakeEngine(overrides: Partial<TimerState> = {}) {
  let handler: ((e: EngineEvent) => void) | null = null;
  // Muterbar motorklokke — samme tidsbase som endsAt i hendelsene, styres av
  // testene via setNow (skip-deteksjonen sammenligner getNow() mot forrige frist).
  const clock = { now: 0 };
  const snapshot: TimerState = {
    status: 'running',
    phase: 'prepare',
    currentRound: 1,
    totalRounds: 1,
    currentItemIndex: 0,
    totalItems: 1,
    currentExercise: null,
    nextExercise: null,
    phaseRemainingSeconds: 10,
    phaseTotalSeconds: 10,
    phaseProgress: 0,
    totalRemainingSeconds: 10,
    totalElapsedSeconds: 0,
    isLocked: false,
    soundEnabled: true,
    vibrateEnabled: true,
    wakeLockEnabled: true,
    speechEnabled: true,
    motionReps: 0,
    ...overrides,
  };
  const setMotionReps = vi.fn((v: number) => {
    snapshot.motionReps = v;
  });
  const engine: AudioDirectorEngine = {
    subscribeEvents: (h: (e: EngineEvent) => void) => {
      handler = h;
      return () => {
        handler = null;
      };
    },
    getSnapshot: () => snapshot,
    setMotionReps,
    getNow: () => clock.now,
  };
  return {
    engine,
    snapshot,
    setMotionReps,
    setNow: (v: number) => {
      clock.now = v;
    },
    emit: (e: EngineEvent) => handler?.(e),
  };
}

const EX_A = { id: 'squat', name: 'Knebøy' };
const EX_B = { id: 'lunge', name: 'Utfall' };

// Hjelper: phase:started-hendelse med fornuftige defaults.
function phaseStarted(
  overrides: Partial<Extract<EngineEvent, { type: 'phase:started' }>>
): EngineEvent {
  return {
    type: 'phase:started',
    phase: 'prepare',
    round: 1,
    itemIndex: 0,
    exercise: EX_A,
    nextExercise: EX_B,
    durationS: 10,
    tone: 'rolig',
    silent: false,
    endsAt: 10_000,
    ...overrides,
  };
}

// cuesPath-konvensjonen for testpersonaen (jf. COACH_PERSONAS i coachPersonaService)
const HC = '/audio/personas/hardcore';

// La mikrotask-kjedene fra scheduleSequence().then(...) flyte gjennom.
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('audioDirector (B3 β2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('standard');
    vi.spyOn(audioService, 'playWorkStart').mockImplementation(() => {});
    vi.spyOn(audioService, 'playRestStart').mockImplementation(() => {});
    vi.spyOn(audioService, 'playWorkoutComplete').mockImplementation(() => {});
    vi.spyOn(audioService, 'playCountdownBeep').mockImplementation(() => {});
    vi.spyOn(speechService, 'announceWork').mockImplementation(() => {});
    vi.spyOn(speechService, 'announceRest').mockImplementation(() => {});
    vi.spyOn(speechService, 'announcePrepare').mockImplementation(() => {});
    vi.spyOn(speechService, 'announceComplete').mockImplementation(() => {});
    vi.spyOn(audioClipService, 'playClipOrFallback').mockResolvedValue(undefined);
    vi.spyOn(coachPersonaService, 'playPersonaCue').mockResolvedValue(true);
    vi.spyOn(coachPersonaService, 'playIntroThenExercise').mockResolvedValue(true);
    vi.spyOn(coachPersonaService, 'stopCurrentPersonaAudio').mockImplementation(() => {});
    vi.spyOn(motionTrackerService, 'start').mockImplementation(() => {});
    vi.spyOn(motionTrackerService, 'stop').mockImplementation(() => {});
    vi.spyOn(audioBufferEngine, 'setTimeBridge').mockImplementation(() => {});
    vi.spyOn(audioBufferEngine, 'scheduleSequence').mockResolvedValue(true);
    vi.spyOn(audioBufferEngine, 'stop').mockImplementation(() => {});
    // Planrettelse 2 (flerkjedemodell): deadlineChanged/skip kansellerer nå kun
    // det SKEDULERTE via cancelScheduled(), ikke full stop() – se testene under.
    vi.spyOn(audioBufferEngine, 'cancelScheduled').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function usePersona(): void {
    vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue('hardcore');
  }

  describe('workout:started — tidsbro', () => {
    it('kaller setTimeBridge med motorens nå (engine.getNow)', () => {
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);
      setNow(1234);

      emit({ type: 'workout:started', workout: TABATA_WORKOUT });

      expect(audioBufferEngine.setTimeBridge).toHaveBeenCalledTimes(1);
      expect(audioBufferEngine.setTimeBridge).toHaveBeenCalledWith(1234);
    });
  });

  describe('lookahead — persona-grensefaser (prepare/rest/round_rest)', () => {
    it('prepare med endsAt=T: scheduleSequence([start_321], {endAt:T}) OG ([go-1], {startAt:T})', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/start_321.mp3`],
        { endAt: 10_000 }
      );
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/go-1.mp3`],
        { startAt: 10_000 }
      );
    });

    it('go-rotasjon er deterministisk på itemIndex % 3 (0→go-1, 1→go-2, 2→go-3, 3→go-1)', () => {
      usePersona();
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      const cases: Array<[number, string]> = [
        [0, 'go-1'],
        [1, 'go-2'],
        [2, 'go-3'],
        [3, 'go-1'],
      ];
      let t = 0;
      for (const [itemIndex, expected] of cases) {
        // Flytt klokken forbi forrige frist slik at hendelsen leses som normal
        // overgang, ikke skip.
        setNow(t);
        emit(phaseStarted({ phase: 'rest', itemIndex, endsAt: t + 10_000 }));
        expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
          [`${HC}/${expected}.mp3`],
          { startAt: t + 10_000 }
        );
        t += 10_000;
      }
    });

    it('rest med persona: playRestStart + neste-øvelsesklipp (som i dag) PLUSS lookahead', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, endsAt: 10_000 }));

      // Reaktiv sti — speiler LegacyAudioAdapter ordrett
      expect(audioService.playRestStart).toHaveBeenCalledWith(true);
      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith('exercise-lunge', 'Neste: Utfall');
      expect(motionTrackerService.stop).toHaveBeenCalledTimes(1);
      // Lookahead i tillegg
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/start_321.mp3`],
        { endAt: 10_000 }
      );
    });

    it('silent fase: ingen lookahead-skedulering', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', silent: true, endsAt: 10_000 }));

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('speechEnabled=false: ingen lookahead-skedulering', () => {
      usePersona();
      const { engine, emit } = createFakeEngine({ speechEnabled: false });
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('endsAt=null (complete): ingen lookahead-skedulering', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'complete', durationS: 0, endsAt: null }));

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('standard persona: INGEN lookahead (standard-stien er reaktiv som i dag)', () => {
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      emit(phaseStarted({ phase: 'work', endsAt: 30_000 }));

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });
  });

  describe('lookahead — last5 (bevisst β-adferdsutvidelse)', () => {
    it('work >= 15 s med persona: scheduleSequence([last5], {startAt: endsAt - 5000})', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 20_000 }));

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/last5.mp3`],
        { startAt: 15_000 }
      );
    });

    it('work < 15 s: ingen last5-skedulering', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'work', durationS: 10, endsAt: 10_000 }));

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('standard persona: ingen last5-skedulering', () => {
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 20_000 }));

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });
  });

  describe('phase:deadlineChanged — kansellering + reskedulering', () => {
    it('med planlagt grensekjede: cancelScheduled() + reskedulering mot ny frist (Planrettelse 2)', () => {
      // Ikke full stop(): en reanker/pause må ikke kutte en samtidig HØRBAR
      // reaktiv cue (f.eks. rest-annonseringen) – kun det skedulerte fjernes.
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

      emit({ type: 'phase:deadlineChanged', endsAt: 12_000 });

      expect(audioBufferEngine.cancelScheduled).toHaveBeenCalledTimes(1);
      expect(audioBufferEngine.stop).not.toHaveBeenCalled();
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/start_321.mp3`],
        { endAt: 12_000 }
      );
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/go-1.mp3`],
        { startAt: 12_000 }
      );
    });

    it('med planlagt last5: cancelScheduled() + reskedulering til ny frist - 5000', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 20_000 }));
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

      emit({ type: 'phase:deadlineChanged', endsAt: 22_000 });

      expect(audioBufferEngine.cancelScheduled).toHaveBeenCalledTimes(1);
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/last5.mp3`],
        { startAt: 17_000 }
      );
    });

    it('uten planlagt kjede (standard persona): ingen kansellering, ingen skedulering', () => {
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      emit({ type: 'phase:deadlineChanged', endsAt: 12_000 });

      expect(audioBufferEngine.cancelScheduled).not.toHaveBeenCalled();
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });
  });

  describe('for trangt vindu → pip-fallback («aldri avkuttet tale»)', () => {
    it('scheduleSequence resolver false: persona-countdown spiller pip i stedet for taushet', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await flush();

      emit({ type: 'countdown', secondsLeft: 3 });

      expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);
    });

    it('vellykket skedulering: persona-countdown forblir stum (ingen pip-kollisjon med stemmen)', async () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await flush();

      emit({ type: 'countdown', secondsLeft: 3 });

      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });

    it('fallback-flagget nullstilles ved neste fase (gjelder kun fasen der vinduet var for trangt)', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValueOnce(false).mockResolvedValue(true);
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await flush();
      setNow(10_000);
      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 30_000 }));
      await flush();

      emit({ type: 'countdown', secondsLeft: 3 });

      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });
  });

  describe('kansellering — pause/reset/skip', () => {
    it('workout:paused → stopCurrentPersonaAudio (fade eies av bufferEngine.stop inne i den)', () => {
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit({ type: 'workout:paused' });

      expect(coachPersonaService.stopCurrentPersonaAudio).toHaveBeenCalledTimes(1);
    });

    it('workout:reset → stopCurrentPersonaAudio + glemmer planlagt kjede (resume reskedulerer ikke)', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      emit({ type: 'workout:reset' });
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

      emit({ type: 'workout:resumed', endsAt: 15_000 });

      expect(coachPersonaService.stopCurrentPersonaAudio).toHaveBeenCalledTimes(1);
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('skip (phase:started FØR forrige frist) → cancelScheduled() (Planrettelse 2, IKKE full stop)', () => {
      // Kun det skedulerte (mot den forlatte grensen) kanselleres stille; en
      // evt. hørbar cue som spiller akkurat idet skipet skjer, kuttes ikke.
      usePersona();
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      // Brukeren skipper ved t=4000 — lenge før fristen 10 000
      setNow(4_000);
      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 24_000 }));

      expect(audioBufferEngine.cancelScheduled).toHaveBeenCalledTimes(1);
      expect(audioBufferEngine.stop).not.toHaveBeenCalled();
    });

    it('normal faseovergang (ved/etter fristen) → INGEN kansellering (go-tilropet spiller akkurat nå)', () => {
      usePersona();
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      // Ticken oppdager utløp ved/etter fristen — aldri før
      setNow(10_050);
      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 30_050 }));

      expect(audioBufferEngine.cancelScheduled).not.toHaveBeenCalled();
      expect(audioBufferEngine.stop).not.toHaveBeenCalled();
    });
  });

  describe('pause/resume — reskedulering mot resumed-fristen', () => {
    it('workout:resumed med planlagt grensekjede fra før pause → reskeduleres mot ny endsAt', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      emit({ type: 'workout:paused' });
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

      emit({ type: 'workout:resumed', endsAt: 15_000 });

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/start_321.mp3`],
        { endAt: 15_000 }
      );
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/go-1.mp3`],
        { startAt: 15_000 }
      );
    });
  });

  describe('standard-stien — speiler LegacyAudioAdapter (spot-sjekker)', () => {
    it('countdown → playCountdownBeep(soundEnabled)', () => {
      const { engine, emit } = createFakeEngine({ soundEnabled: true });
      createAudioDirector(engine);

      emit({ type: 'countdown', secondsLeft: 3 });

      expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);
    });

    it('phase:started(work): playWorkStart + announceWork + motionTracker.start', () => {
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 20_000 }));

      expect(audioService.playWorkStart).toHaveBeenCalledWith(true);
      expect(speechService.announceWork).toHaveBeenCalledWith('Knebøy', 'rolig');
      expect(motionTrackerService.start).toHaveBeenCalledWith(expect.any(Function), 'hopp');
    });

    it('phase:started(prepare): announcePrepare(navn, tone)', () => {
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', tone: 'lek', endsAt: 10_000 }));

      expect(speechService.announcePrepare).toHaveBeenCalledWith('Knebøy', 'lek');
    });

    it('phase:started(complete): playWorkoutComplete + announceComplete', () => {
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'complete', durationS: 0, tone: 'gira', endsAt: null }));

      expect(audioService.playWorkoutComplete).toHaveBeenCalledWith(true);
      expect(speechService.announceComplete).toHaveBeenCalledWith('gira');
      expect(motionTrackerService.stop).toHaveBeenCalledTimes(1);
    });

    it('resync (standard, landing work): playWorkStart + announceWork', () => {
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit({
        type: 'resync',
        skippedPhases: 2,
        landingPhase: 'work',
        exercise: EX_A,
        nextExercise: EX_B,
        tone: 'rolig',
      });

      expect(audioService.playWorkStart).toHaveBeenCalledWith(true);
      expect(speechService.announceWork).toHaveBeenCalledWith('Knebøy', 'rolig');
    });
  });

  describe('persona-speiling av adapteren (reaktiv sti beholdt)', () => {
    it('prepare persona (durationS >= 6): playIntroThenExercise', async () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', durationS: 10, endsAt: 10_000 }));
      await flush();

      expect(coachPersonaService.playIntroThenExercise).toHaveBeenCalledWith('squat');
    });

    it('phase:halfway persona + speech: playPersonaCue("halfway")', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit({ type: 'phase:halfway' });

      expect(coachPersonaService.playPersonaCue).toHaveBeenCalledWith('halfway');
    });

    it('phase:started(complete) persona: playPersonaCue("finish")', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'complete', durationS: 0, endsAt: null }));

      expect(coachPersonaService.playPersonaCue).toHaveBeenCalledWith('finish');
      expect(audioService.playWorkoutComplete).not.toHaveBeenCalled();
    });

    it('phase:endingSoon ignoreres i β (lookahead overtar start_321)', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit({ type: 'phase:endingSoon' });

      expect(coachPersonaService.playPersonaCue).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('returnert opprydningsfunksjon stopper videre reaksjon på hendelser', () => {
      const { engine, emit } = createFakeEngine();
      const unsub = createAudioDirector(engine);
      unsub();

      emit({ type: 'workout:paused' });

      expect(coachPersonaService.stopCurrentPersonaAudio).not.toHaveBeenCalled();
    });
  });
});

describe('resolveAnnouncementPlan — prioritetstabell (spec § 4)', () => {
  // Kolonner: personaActive, personaClipCached, studioClipCached, isCustomExercise,
  // speechEnabled → forventet plan. Rekkefølgen speiler prioritetskjeden:
  // persona-klipp → studioklipp → bro+TTS (kun egendefinert m/persona) → tts → beep-only.
  const rows: Array<[boolean, boolean, boolean, boolean, boolean, ReturnType<typeof resolveAnnouncementPlan>]> = [
    // speech av → alltid kun pip, uansett hva som er cachet
    [true, true, true, true, false, 'beep-only'],
    [false, false, false, false, false, 'beep-only'],
    // persona-klipp vinner når persona er aktiv og klippet er cachet
    [true, true, true, false, true, 'persona'],
    [true, true, false, false, true, 'persona'],
    // studioklipp når persona-klipp mangler (eller persona er av)
    [true, false, true, false, true, 'studio'],
    [false, false, true, false, true, 'studio'],
    [false, true, true, false, true, 'studio'], // personaClipCached irrelevant uten aktiv persona
    // bro + TTS kun for egendefinerte øvelser MED aktiv persona
    [true, false, false, true, true, 'bridge-tts'],
    // egendefinert uten persona → ren TTS (broen er personaens frase)
    [false, false, false, true, true, 'tts'],
    // siste tale-utvei: ren TTS
    [true, false, false, false, true, 'tts'],
    [false, false, false, false, true, 'tts'],
  ];

  it.each(rows)(
    'persona=%s personaCached=%s studioCached=%s custom=%s speech=%s → %s',
    (personaActive, personaClipCached, studioClipCached, isCustomExercise, speechEnabled, expected) => {
      expect(
        resolveAnnouncementPlan({ personaActive, personaClipCached, studioClipCached, isCustomExercise, speechEnabled })
      ).toBe(expected);
    }
  );
});
