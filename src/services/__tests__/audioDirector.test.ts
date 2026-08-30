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
import {
  createAudioDirector,
  resolveAnnouncementPlan,
  AudioDirectorEngine,
} from '../audioDirector';
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

// β5: getPersonaClipKey slår nå opp i det byggtids-genererte manifestet
// (autoritativt per persona) — testøvelsene må derfor være EKTE bibliotek-id-er
// med tilhørende klippfiler, ellers returnerer nøkkeloppslaget null og
// persona-kjedene degraderer. (Var tidligere fiktive 'squat'/'lunge'.)
const EX_A = { id: 'kneboy', name: 'Knebøy' };
const EX_B = { id: 'utfall-forover', name: 'Utfall' };

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

// Buffer-lageret testene deler (reviewfunn): i produksjon leser has() og
// getDuration() SAMME buffers-Map, så «cachet uten varighet» — og «varighet uten
// cache» — er verdener som ikke finnes. Begge motorspørringene rutes derfor
// gjennom ÉN kilde her, og tester setter cachen via cacheClips/cacheAllClips
// i stedet for å mocke has() direkte.
const DEFAULT_CLIP_S = 1;
let clipCache: Record<string, number> = {};
let allClipsCached = false;

/** Cacher klipp med kjent varighet (array → DEFAULT_CLIP_S per nøkkel). */
function cacheClips(keys: string[] | Record<string, number>): void {
  const entries = Array.isArray(keys)
    ? Object.fromEntries(keys.map((k) => [k, DEFAULT_CLIP_S]))
    : keys;
  clipCache = { ...clipCache, ...entries };
}

/** «Alt er cachet» — for tester der selve cache-innholdet er irrelevant. */
function cacheAllClips(): void {
  allClipsCached = true;
}

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
    vi.spyOn(speechService, 'speak').mockImplementation(() => {});
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
    // β3 (bro + TTS): Directoren spiller bro-kjeder reaktivt via playSequence
    // og sjekker cache-status via has() — default: ingenting cachet, og dermed
    // også ingen kjente varigheter (samme Map i produksjon, se clipCache).
    vi.spyOn(audioBufferEngine, 'playSequence').mockResolvedValue(true);
    clipCache = {};
    allClipsCached = false;
    vi.spyOn(audioBufferEngine, 'has').mockImplementation(
      (k: string) => allClipsCached || k in clipCache
    );
    vi.spyOn(audioBufferEngine, 'getDuration').mockImplementation((k: string) =>
      allClipsCached ? (clipCache[k] ?? DEFAULT_CLIP_S) : (clipCache[k] ?? null)
    );
    vi.spyOn(audioBufferEngine, 'stop').mockImplementation(() => {});
    // Planrettelse 2 (flerkjedemodell): deadlineChanged/skip kansellerer nå kun
    // det SKEDULERTE via cancelScheduled(), ikke full stop() – se testene under.
    vi.spyOn(audioBufferEngine, 'cancelScheduled').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function usePersona(id: coachPersonaService.CoachPersonaId = 'hardcore'): void {
    // Spy for Directorens egne persona-sjekker (kryssmodul-bindingen) …
    vi.spyOn(coachPersonaService, 'getActiveCoachPersona').mockReturnValue(id);
    // … og lagret persona for getPersonaClipKey, som kaller modul-INTERN
    // getActiveCoachPersona (spies ikke via namespace-bindingen).
    coachPersonaService.setActiveCoachPersona(id);
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
      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith('exercise-utfall-forover', 'Neste: Utfall');
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

  describe('start_321-stigen — full → short → pip (korte faser, live timing-funn A)', () => {
    // De innspilte start_321-sporene er 19,8–27,8 s (målt: hardcore 27,8 s);
    // Tabatas 10 s-klargjøring/-pause har aldri plass (aldri-avkuttet-regelen
    // svarer false). Stigen prøver den kortere start_321_short-varianten (egen
    // TTS-cue per persona) FØR pip-fallbacken. scheduleSequence
    // svarer false uten sideeffekter (ucachet/for trangt/manglende bro), så et
    // short-forsøk etter false kan aldri gi dobbel avspilling.
    const FULL = `${HC}/start_321.mp3`;
    const SHORT = `${HC}/start_321_short.mp3`;

    it('full variant lykkes: short forsøkes ALDRI (aldri begge)', async () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await flush();

      const scheduledKeys = vi
        .mocked(audioBufferEngine.scheduleSequence)
        .mock.calls.map(([keys]) => keys[0]);
      expect(scheduledKeys).toContain(FULL);
      expect(scheduledKeys).not.toContain(SHORT);
    });

    it('for trang fase (full → false): short skeduleres mot samme frist, ingen pip', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockImplementation(
        async (keys: string[]) => keys[0] !== FULL
      );
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 10_000 });
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });

    it('ingen variant cachet (begge → false): pip-fallback markerer grensen', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 10_000 });
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);
    });

    it('short mangler i manifestet: full → false gir dagens pip-fallback direkte', async () => {
      usePersona();
      const original = coachPersonaService.getPersonaClipKey;
      vi.spyOn(coachPersonaService, 'getPersonaClipKey').mockImplementation((cue, id) =>
        cue === 'start_321_short' ? null : original(cue, id)
      );
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith([SHORT], expect.anything());
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);
    });

    it('sent false-svar etter fristflytt: short skeduleres ALDRI mot den gamle fristen', async () => {
      usePersona();
      let resolveLate!: (v: boolean) => void;
      vi.mocked(audioBufferEngine.scheduleSequence)
        .mockImplementationOnce(
          () =>
            new Promise<boolean>((resolve) => {
              resolveLate = resolve;
            })
        )
        .mockResolvedValue(true);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      emit({ type: 'phase:deadlineChanged', endsAt: 12_000 });
      // Det gamle full-forsøket svarer false ETTER at fristen flyttet — handleDeadline-
      // Changed har alt kansellert og reskedulert mot 12 000; et short-forsøk mot
      // 10 000 nå ville vært lyd mot en forlatt grense.
      resolveLate(false);
      await flush();

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith([SHORT], { endAt: 10_000 });
    });
  });

  describe('annonseringsprioritet — hodrom målt fra den FAKTISKE annonseringskjeden', () => {
    // Felttest-funn (Android, Klassisk Tabata der ALLE grensefaser er 10 s): en
    // endAt-forankret nedtellingskjede ble hørbar MIDT i fasen og preemptet
    // (becomeAudibleWithPreemption, fade) den reaktive annonseringskjeden
    // (rest-cue → bro-neste → øvelsesnavn, eller intro → øvelsesnavn i prepare),
    // så øvelsesnavnet ble ALDRI lest opp i hele økta.
    //
    // Hodrommet er derfor IKKE en konstant: det er summen av varighetene til
    // NØYAKTIG de klippene den reaktive kjeden vil spille i denne fasen — samme
    // nøkkelutledning som avspillingen bruker (deriveAnnounceChain).
    const FULL = `${HC}/start_321.mp3`;
    const SHORT = `${HC}/start_321_short.mp3`;
    const REST_CUE = `${HC}/rest.mp3`;
    const BRO_NESTE = `${HC}/bro-neste.mp3`;
    const INTRO = `${HC}/intro.mp3`;
    const EX_A_CLIP = `${HC}/exercise-kneboy.mp3`;
    const EX_MED_CLIP = `${HC}/exercise-hofteapner-90-90.mp3`;

    // REELT målte klipplengder (ffprobe på public/audio/personas/hardcore/,
    // etter at start_321_short ble regenerert som egen TTS-cue i 001f38c) —
    // fasiten for hele fiksen: rest-kjeden er 4,32 + 3,44 + navnet, og får
    // ALDRI plass i en 10 s Tabata-pause sammen med nedtellingen.
    //
    // kneboy (6,185 s) er det LENGSTE av de 25 hardcore-øvelsesklippene;
    // hofteapner-90-90 (2,115 s) er MEDIANEN. Begge er dekket under: det er
    // nettopp mediantilfellet som mistet nedtellingen uten pip da budsjettet
    // bare tok hensyn til fasen, ikke til short-cuen.
    const HC_REAL: Record<string, number> = {
      [FULL]: 27.815,
      [SHORT]: 4.44,
      [REST_CUE]: 4.32,
      [BRO_NESTE]: 3.44,
      [INTRO]: 5.68,
      [EX_A_CLIP]: 6.185,
      [EX_MED_CLIP]: 2.115,
    };
    // Median-øvelsen som EKTE bibliotek-id (getPersonaClipKey slår opp i
    // manifestet — fiktive id-er ville degradert kjeden).
    const EX_MED = { id: 'hofteapner-90-90', name: 'Hofteåpner 90/90' };

    // Boyband-fasiten (samme ffprobe-runde): median-øvelsen er den samme
    // hofteåpneren, 1,597 s hos boyband.
    const BB = '/audio/personas/boyband';
    const BB_REAL: Record<string, number> = {
      [`${BB}/start_321.mp3`]: 19.814,
      [`${BB}/start_321_short.mp3`]: 3.68,
      [`${BB}/rest.mp3`]: 3.742,
      [`${BB}/bro-neste.mp3`]: 2.74,
      [`${BB}/intro.mp3`]: 7.482,
      [`${BB}/exercise-hofteapner-90-90.mp3`]: 1.597,
    };

    it('FASIT (hardcore, 10 s Tabata-pause, MEDIAN-øvelse): BÅDE navnet og nedtellingen', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_MED, endsAt: 10_000 }));
      await flush();

      // Budsjettet er fasen MINUS short-cuen (4,44 s) minus sikkerhetsmarginen
      // = 5,41 s. Full kjede 9,88 s og [rest, navn] 6,44 s sprenger begge det,
      // så kjeden degraderes helt ned til navnet (2,115 s) …
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([EX_MED_CLIP]);
      // … og da får nedtellingen plass: short starter 5,56 s inn i fasen, godt
      // etter at navnet er ferdig (2,115 s + 0,15 s margin).
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 10_000 });
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith([FULL], expect.anything());
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([`${HC}/go-1.mp3`], {
        startAt: 10_000,
      });
      // BØR-4: cuen ble skrelt av av timing-hensyn → ingen tone oppå navnet.
      expect(audioService.playRestStart).not.toHaveBeenCalled();
      // Nedtellingen kommer som stemme → ingen pip oppå den.
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });

    it('FASIT (boyband, 10 s Tabata-pause, MEDIAN-øvelse): rest-cue + navn OG nedtellingen', async () => {
      usePersona('boyband');
      cacheClips(BB_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_MED, endsAt: 10_000 }));
      await flush();

      // Budsjett 10 − 3,68 − 0,15 = 6,17 s. Full kjede 8,08 s sprenger det, men
      // [rest, navn] = 5,34 s får plass — boyband beholder altså rest-cuen.
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${BB}/rest.mp3`,
        `${BB}/exercise-hofteapner-90-90.mp3`,
      ]);
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${BB}/start_321_short.mp3`],
        { endAt: 10_000 }
      );
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith(
        [`${BB}/start_321.mp3`],
        expect.anything()
      );
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });

    it('FASIT (hardcore, prepare 10 s, MEDIAN-øvelse): navnet spilles OG nedtellingen skeduleres', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(
        phaseStarted({ phase: 'prepare', exercise: EX_MED, durationS: 10, endsAt: 10_000 })
      );
      await flush();

      // intro 5,68 + navn 2,115 = 7,80 s > budsjettet 5,41 s → introen skrelles
      // av, navnet spilles alene, og økta starter IKKE med stillhet før GO.
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([EX_MED_CLIP]);
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 10_000 });
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });

    it('FASIT (hardcore, 10 s Tabata-pause, MAKS-øvelse): ingen nedtellingskjede, og navnet degraderes fram', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_A, endsAt: 10_000 }));
      await flush();

      // (a) INGEN endAt-forankret nedtellingskjede — og årsaken er hodroms-
      // gaten, ikke fasens lengde: short (4,44 s) ville startet 10 − 4,44 =
      // 5,56 s inn i fasen, mens den degraderte kjeden (navnet alene, 6,185 s)
      // pluss sikkerhetsmarginen krever 6,335 s. Short ville altså kommet midt
      // i navnet → gates bort. Full (27,8 s) får ikke engang plass i fasen.
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith([FULL], expect.anything());
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith(
        [SHORT],
        expect.anything()
      );
      // Go-tilropet på grensen består — fasebyttet markeres fortsatt …
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([`${HC}/go-1.mp3`], {
        startAt: 10_000,
      });
      // … og dette er en BEVISST prioritering, ikke en degradering: ingen pip.
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();

      // (b) Den reaktive kjeden degraderes til ØVELSESNAVNET alene: rest-cue og
      // bro droppes (i den rekkefølgen), navnet aldri.
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([EX_A_CLIP]);
      // (c) BØR-4 (produkteiers avgjørelse): cuen ble skrelt av av TIMING-
      // hensyn, ikke fordi den manglet — da skal tonen IKKE fyres. Den ville
      // kommet synkront rett før playSequence, altså som et pip oppå navnets
      // første ~200 ms. Fasebyttet er allerede markert av go-tilropet.
      expect(audioService.playRestStart).not.toHaveBeenCalled();
    });

    it('BØR-4: rest-cuen MANGLER (ucachet) → dagens tone består', async () => {
      usePersona();
      // Alt unntatt rest-cuen er dekodet: cuen ble aldri skrelt av, den fantes
      // bare ikke. Da er tonen fortsatt eneste markør for pausestarten.
      cacheClips({ [BRO_NESTE]: 3.44, [EX_MED_CLIP]: 2.115, [FULL]: 27.815, [SHORT]: 4.44 });
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_MED, endsAt: 10_000 }));
      await flush();

      expect(audioService.playRestStart).toHaveBeenCalledWith(true);
    });

    it('hele kjeden får plass (30 s pause): ingen degradering, og hodrommet er kjedens sum', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_A, endsAt: 30_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([REST_CUE, BRO_NESTE, EX_A_CLIP]);
      expect(audioService.playRestStart).not.toHaveBeenCalled();
      // Hodrom 13,94 s: full ville startet etter 2,2 s (preemsjon) → aldri forsøkt;
      // short starter etter 21,5 s og får plass.
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith([FULL], expect.anything());
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 30_000 });
    });

    it('mellomtrinn (12 s pause, maks-øvelse): kjeden degraderes ett hakk EKSTRA så short-cuen får plass', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      // Budsjett 12 − 4,44 − 0,15 = 7,41 s: [rest, navn] = 10,50 s sprenger det
      // (selv om det ville fått plass i FASEN), navnet alene = 6,18 s får plass.
      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_A, endsAt: 12_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([EX_A_CLIP]);
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 12_000 });
    });

    it('selv navnet alene får ikke plass (5 s pause): full kjede beholdes — vi kutter aldri navnet bevisst', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_A, endsAt: 5_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([REST_CUE, BRO_NESTE, EX_A_CLIP]);
    });

    it('prepare-kjeden degraderes til [øvelsesnavn] når intro + navn ikke får plass', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      // intro 5,68 + navn 6,18 = 11,87 s > 10 s → intro droppes; navnet spilles.
      emit(phaseStarted({ phase: 'prepare', exercise: EX_A, durationS: 10, endsAt: 10_000 }));
      await flush();

      expect(coachPersonaService.playIntroThenExercise).not.toHaveBeenCalled();
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([EX_A_CLIP]);
    });

    it('BØR-2: prepare-hodrommet regnes fra SAMME nøkler som spilles (studioklipp når persona-klippet er ucachet)', async () => {
      usePersona();
      // Kun introen og STUDIO-klippet er dekodet: den delte utledningen
      // (resolveIntroExerciseKeys) skal velge studioklippet, og hodrommet må
      // regnes fra nettopp det — ellers degraderer vi mot feil varighet.
      cacheClips({ [INTRO]: 5.68, 'exercise-kneboy': 6.185, [SHORT]: 4.44, [FULL]: 27.815 });
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', exercise: EX_A, durationS: 10, endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith(['exercise-kneboy']);
      expect(coachPersonaService.playIntroThenExercise).not.toHaveBeenCalled();
    });

    it('prepare-kjeden får plass (20 s): intro-kjeden spilles som før', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', exercise: EX_A, durationS: 20, endsAt: 20_000 }));
      await flush();

      expect(coachPersonaService.playIntroThenExercise).toHaveBeenCalledWith('kneboy');
    });

    it('hodrommet måles mot motorklokken (engine.getNow) ved utstedelse, ikke mot 0', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      // Fasen starter ved t=4000 med frist 34 000 (30 s igjen): hele kjeden
      // (13,94 s) får plass, og short-kjedestart 25 511 ≥ 4000 + 13 940.
      setNow(4_000);
      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_A, endsAt: 34_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([REST_CUE, BRO_NESTE, EX_A_CLIP]);
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 34_000 });
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith([FULL], expect.anything());
    });

    it('BØR-6: fast sikkerhetsmargin — en kandidat som «akkurat» passerer avvises', async () => {
      usePersona();
      cacheClips(HC_REAL);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      // Kjeden er 13,945 s. Full start_321 (27,815 s) ville startet 14,085 s
      // inn i fasen — bare 140 ms etter at kjeden er ferdig. Hodrommet måles fra
      // engine.getNow(), men playSequence kan vente på ctx.resume() før første
      // node starter (målte marginer i felt: 14 ms og 70 ms), så kjeden kan
      // reelt ligge lenger ut og bli preemptet på siste stavelse.
      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_A, endsAt: 41_900 }));
      await flush();

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith([FULL], expect.anything());
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 41_900 });
    });

    it('ingen annonseringskjede å beskytte (tomt buffercache): dagens stige uendret — full → short → pip', async () => {
      usePersona();
      // Ingenting dekodet: hodrommet er 0, men kandidatenes varigheter er også
      // ukjente (getDuration → null) → gaten kan ikke avgjøre, og stigen kjører
      // som før. Degraderingsflagget + replanCurrentPhase retter opp senere.
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([FULL], { endAt: 10_000 });
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 10_000 });
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);
    });

    it('BØR-1: tom kjede (hodrom 0) med varm cache — gaten er AV, pip-fallbacken består', async () => {
      usePersona();
      // Nedtellingsklippene er dekodet (varm cache), men det finnes ingen
      // annonsering å beskytte: rest-cuen er ucachet og neste øvelse har
      // verken persona- eller studioklipp → tom kjede. En tom kjede gir hodrom
      // 0 (ikke null), så en gate som kun sjekker `!== null` ville vært aktiv
      // med ingenting å beskytte — og i en 3–5 s grensefase ga det TOTAL
      // stillhet der brukeren før fikk pip.
      cacheClips({ [FULL]: 27.815, [SHORT]: 4.44 });
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_B, endsAt: 5_000 }));
      await flush();

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([FULL], { endAt: 5_000 });
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 5_000 });
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);
    });

    it('kaldstart (Ø2): short-nøkkelen finnes men bufferen er udekodet → scheduleSequence svarer false, og BÅDE pip og replan-flagg settes', async () => {
      usePersona();
      // Kommentaren i issuePending påsto at «mangler-short» konsekvent gir
      // ingen kjede og ingen flagg. Det gjelder KUN når nøkkelen er null: med
      // nøkkel + udekodet buffer kalles scheduleSequence, svarer false, og
      // beepFallback + lookaheadDegraded settes begge (riktig kaldstart-adferd).
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      await flush();

      // beepFallback: pipene markerer grensen
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).toHaveBeenCalledWith(true);

      // lookaheadDegraded: replan re-utsteder når bufferne omsider er dekodet
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(true);
      director.replanCurrentPhase();

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([FULL], { endAt: 10_000 });
    });

    it('full cachet og innenfor hodrommet, men scheduleSequence svarer false: stigen faller til short', async () => {
      usePersona();
      // Kjente varigheter, ingen annonseringskjede (intro/navn ucachet) → hodrom
      // 0: full (27,8 s) får plass i 40 s-fasen og forsøkes. Motoren svarer
      // likevel false (f.eks. for trangt vindu i praksis) → short.
      cacheClips({ [FULL]: 27.815, [SHORT]: 4.44 });
      vi.mocked(audioBufferEngine.scheduleSequence).mockImplementation(
        async (keys: string[]) => keys[0] !== FULL
      );
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 40_000 }));
      await flush();

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([FULL], { endAt: 40_000 });
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 40_000 });
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });

    it('NOTAT: studioklipp UTEN rest-cue kjedes, og er dermed beskyttet av hodrommet', async () => {
      usePersona();
      // Kun studioklippet (ingen persona-variant dekodet) og nedtellings-
      // klippene: før returnerte utledningen tom kjede her, og da var
      // studio-annonseringen usynlig for hodroms-utregningen.
      cacheClips({ 'exercise-utfall-forover': 6.0, [FULL]: 27.815, [SHORT]: 4.44 });
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_B, endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith(['exercise-utfall-forover']);
      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
      // 6 s annonsering i en 10 s fase: short ville startet 5,56 s inn, altså
      // midt i navnet → gates bort, som for persona-klippene.
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith(
        [SHORT],
        expect.anything()
      );
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith(
        [FULL],
        expect.anything()
      );
    });

    it('BØR-3: resync-annonseringen får SAMME hodromsbeskyttelse som fasestartens kjede', async () => {
      usePersona();
      cacheClips({ ...HC_REAL, [`${HC}/bro-resync.mp3`]: 2.5 });
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_MED, endsAt: 30_000 }));
      await flush();

      // 12 s inn: fasestartens kjede er ferdig, men catch-up lander og
      // resync-cuen begynner å spille (bro-resync 2,5 s + navnet 2,115 s).
      setNow(12_000);
      emit({
        type: 'resync',
        skippedPhases: 1,
        landingPhase: 'rest',
        exercise: EX_A,
        nextExercise: EX_MED,
        tone: 'rolig',
      });
      await flush();
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${HC}/bro-resync.mp3`,
        EX_MED_CLIP,
      ]);
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

      // Dvale-reankeren fyrer rett etterpå — uten beskyttelse ville full
      // start_321 (27,8 s) startet 2,2 s inn i fasen, altså midt i resync-
      // annonseringen som nettopp begynte.
      setNow(13_000);
      emit({ type: 'phase:deadlineChanged', endsAt: 30_000 });
      await flush();

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith(
        [FULL],
        expect.anything()
      );
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 30_000 });
    });

    describe('BL-1: hodrommet overlever fristflytt så lenge kjeden fortsatt SPILLER', () => {
      // Andre reviews probe mot den ekte Directoren (hardcore, 30 s pause,
      // kjede 9,88 s med median-øvelsen):
      //   [fasestart @0s]     short @{endAt:30000}, go-1 @{startAt:30000} ← gaten virker
      //   [dvale-reanker @1s] start_321 (27,8 s) @{endAt:29000} → starter på 1,2 s ← preempterte navnet
      // Utløserne er reelle for Android-felttest: timerEngine sin drift-reanker
      // (> 2000 ms ved skjerm av) og catch-up-landingens deadlineChanged.
      // Nettopp derfor kansellerer handleDeadlineChanged med cancelScheduled()
      // og ikke stop(): annonseringen kan spille HØRBART mens fristen flyttes.
      it('dvale-reanker midt i kjeden: ingen endAt-kjede som preempter navnet', async () => {
        usePersona();
        cacheClips(HC_REAL);
        const { engine, emit, setNow } = createFakeEngine();
        createAudioDirector(engine);

        emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_MED, endsAt: 30_000 }));
        await flush();
        expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
          REST_CUE,
          BRO_NESTE,
          EX_MED_CLIP,
        ]);
        vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

        // 1 s inn i fasen: 8,88 s av kjeden gjenstår, og full start_321 ville
        // startet 1,2 s inn — midt i rest-cuen.
        setNow(1_000);
        emit({ type: 'phase:deadlineChanged', endsAt: 29_000 });
        await flush();

        expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith(
          [FULL],
          expect.anything()
        );
        expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 29_000 });
        // Bevisst prioritering, ikke degradering → fortsatt ingen pip.
        emit({ type: 'countdown', secondsLeft: 3 });
        expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
      });

      it('fristflytt ETTER at kjeden er ferdigspilt: stigen fungerer normalt igjen', async () => {
        usePersona();
        cacheClips(HC_REAL);
        const { engine, emit, setNow } = createFakeEngine();
        createAudioDirector(engine);

        emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_MED, endsAt: 30_000 }));
        await flush();
        vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

        // 12 s inn: kjeden (9,88 s) er for lengst ferdig → hodrommet er
        // naturlig 0, og det er ingenting igjen å beskytte.
        setNow(12_000);
        emit({ type: 'phase:deadlineChanged', endsAt: 45_000 });
        await flush();

        expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([FULL], { endAt: 45_000 });
      });

      it('workout:paused → resumed: pausen stoppet lyden, så hodrommet nullstilles', async () => {
        usePersona();
        cacheClips(HC_REAL);
        const { engine, emit, setNow } = createFakeEngine();
        createAudioDirector(engine);

        emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_MED, endsAt: 30_000 }));
        await flush();
        vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

        // Pause stopper all hørbar persona-lyd (stopCurrentPersonaAudio), så
        // annonseringen finnes ikke lenger — resume-veien er trygg.
        setNow(1_000);
        emit({ type: 'workout:paused' });
        emit({ type: 'workout:resumed', endsAt: 45_000 });
        await flush();

        expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([FULL], { endAt: 45_000 });
      });

      it('replanCurrentPhase midt i kjeden: re-utstedelsen preempter heller ikke', async () => {
        usePersona();
        // Ved fasestart er annonseringskjeden dekodet, men nedtellingsklippene
        // ikke → dagens stige kjører og degraderingsflagget settes.
        cacheClips({ [REST_CUE]: 4.32, [BRO_NESTE]: 3.44, [EX_MED_CLIP]: 2.115 });
        vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
        const { engine, emit, setNow } = createFakeEngine();
        const director = createAudioDirector(engine);

        emit(phaseStarted({ phase: 'rest', itemIndex: 0, nextExercise: EX_MED, endsAt: 30_000 }));
        await flush();

        // Preloaden lander 2 s inn i fasen: nå er nedtellingsklippene dekodet,
        // men 7,88 s av annonseringen gjenstår.
        cacheClips({ [FULL]: 27.815, [SHORT]: 4.44 });
        vi.mocked(audioBufferEngine.scheduleSequence).mockClear();
        vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(true);
        setNow(2_000);

        director.replanCurrentPhase();
        await flush();

        expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith(
          [FULL],
          expect.anything()
        );
        expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith([SHORT], { endAt: 30_000 });
      });
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

      expect(coachPersonaService.playIntroThenExercise).toHaveBeenCalledWith('kneboy');
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

  describe('Planrettelse 4 (fix 1) — tidsbroen re-måles per fase', () => {
    it('phase:started re-måler broen med engine.getNow() (fanger frossen ctx-klokke)', () => {
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);
      setNow(4_000);

      emit(phaseStarted({ phase: 'prepare', endsAt: 14_000 }));

      expect(audioBufferEngine.setTimeBridge).toHaveBeenCalledWith(4_000);
    });

    it('phase:deadlineChanged re-måler broen FØR reskeduleringen', () => {
      usePersona();
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);
      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      setNow(6_000);
      vi.mocked(audioBufferEngine.setTimeBridge).mockClear();

      emit({ type: 'phase:deadlineChanged', endsAt: 12_000 });

      expect(audioBufferEngine.setTimeBridge).toHaveBeenCalledWith(6_000);
      // Broen skal være fersk når ankrene regnes ut: bro-kallet FØR reskeduleringen
      const bridgeOrder = vi.mocked(audioBufferEngine.setTimeBridge).mock.invocationCallOrder[0];
      const lastScheduleOrder = vi
        .mocked(audioBufferEngine.scheduleSequence)
        .mock.invocationCallOrder.slice(-1)[0];
      expect(bridgeOrder).toBeLessThan(lastScheduleOrder);
    });

    it('workout:resumed re-måler broen (ctx var typisk suspendert gjennom pausen)', () => {
      usePersona();
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);
      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      emit({ type: 'workout:paused' });
      setNow(8_000);
      vi.mocked(audioBufferEngine.setTimeBridge).mockClear();

      emit({ type: 'workout:resumed', endsAt: 15_000 });

      expect(audioBufferEngine.setTimeBridge).toHaveBeenCalledWith(8_000);
    });
  });

  describe('Planrettelse 4 (fix 2) — beepFallback nullstilles ved vellykket reskedulering', () => {
    it('mislykket skedulering + vellykket reskedulering: ingen pip oppå den skedulerte stemmen', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence)
        .mockResolvedValueOnce(false) // start_321, første forsøk (for trangt vindu)
        .mockResolvedValueOnce(false) // go, første forsøk
        .mockResolvedValue(true); // reskeduleringen mot ny frist lykkes
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      await flush();
      // Sanity: fallbacken er aktiv etter den mislykkede skeduleringen
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).toHaveBeenCalledTimes(1);

      emit({ type: 'phase:deadlineChanged', endsAt: 12_000 });
      await flush();

      emit({ type: 'countdown', secondsLeft: 2 });
      // Uten fiksen ville flagget levd videre → pip oppå korrekt skedulert tale
      expect(audioService.playCountdownBeep).toHaveBeenCalledTimes(1);
    });
  });

  describe('phaseEpoch-vakten i issuePending (Planrettelse 4, minor)', () => {
    it('sent false-svar fra forrige fases skedulering setter ikke fallback for ny fase', async () => {
      usePersona();
      let resolveLate!: (v: boolean) => void;
      vi.mocked(audioBufferEngine.scheduleSequence)
        .mockImplementationOnce(
          () =>
            new Promise<boolean>((resolve) => {
              resolveLate = resolve;
            })
        )
        .mockResolvedValue(true);
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      setNow(10_000);
      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 30_000 }));
      await flush();

      resolveLate(false); // forrige fases svar ankommer ETTER faseskiftet
      await flush();

      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).not.toHaveBeenCalled();
    });
  });

  describe('β3 — bro + TTS for egendefinerte øvelser (spec § 4, valg B)', () => {
    const CUSTOM_EX = { id: 'custom-42', name: 'Kjeglehopp' };
    // isCustom-flagget uten custom-prefiks (biblioteksøvelser); struktur-cast
    // fordi Exercise-typen ikke bærer flagget (CustomExerciseItem gjør det).
    const FLAGGED_EX = { id: 'egen-sving', name: 'Egen sving', isCustom: true } as typeof EX_A;

    it('rest med egendefinert neste: playSequence([bro-neste]) og DERETTER (await kjedeslutt) speak(navn)', async () => {
      usePersona();
      cacheClips([`${HC}/bro-neste.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: CUSTOM_EX, endsAt: 10_000 }));

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([`${HC}/bro-neste.mp3`]);
      // Aldri overlapp: TTS-navnet leses først når bro-kjeden har spilt ferdig
      expect(speechService.speak).not.toHaveBeenCalled();
      await flush();
      expect(speechService.speak).toHaveBeenCalledWith('Kjeglehopp');
      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
    });

    it('isCustom-flagget (uten custom-prefiks) behandles likt', async () => {
      usePersona();
      cacheClips([`${HC}/bro-neste.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: FLAGGED_EX, endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([`${HC}/bro-neste.mp3`]);
      expect(speechService.speak).toHaveBeenCalledWith('Egen sving');
    });

    it('bro-klippet ucachet: dagens playClipOrFallback-sti uendret (TTS «Neste: navn»)', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: CUSTOM_EX, endsAt: 10_000 }));

      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith(
        'exercise-custom-42',
        'Neste: Kjeglehopp'
      );
      expect(audioBufferEngine.playSequence).not.toHaveBeenCalled();
    });

    it('TTS-navnet leses IKKE hvis økten ikke lenger kjører når kjeden slutter (pause under broen)', async () => {
      usePersona();
      cacheClips([`${HC}/bro-neste.mp3`]);
      const { engine, emit, snapshot } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: CUSTOM_EX, endsAt: 10_000 }));
      snapshot.status = 'paused';
      await flush();

      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('persona-øvelsesklipp cachet (β5-sømmen): [bro-neste, persona-klipp] som ÉN kjede, ingen TTS', async () => {
      usePersona();
      cacheClips([`${HC}/bro-neste.mp3`, `${HC}/exercise-utfall-forover.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${HC}/bro-neste.mp3`,
        `${HC}/exercise-utfall-forover.mp3`,
      ]);
      expect(speechService.speak).not.toHaveBeenCalled();
      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
    });

    it('prepare med egendefinert øvelse: [intro, bro-naa]-kjede og DERETTER speak(navn)', async () => {
      usePersona();
      cacheClips([`${HC}/intro.mp3`, `${HC}/bro-naa.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', exercise: CUSTOM_EX, durationS: 10, endsAt: 10_000 }));

      expect(coachPersonaService.playIntroThenExercise).not.toHaveBeenCalled();
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${HC}/intro.mp3`,
        `${HC}/bro-naa.mp3`,
      ]);
      expect(speechService.speak).not.toHaveBeenCalled();
      await flush();
      expect(speechService.speak).toHaveBeenCalledWith('Kjeglehopp');
    });

    it('prepare egendefinert uten cachede klipp: degradert intro-sti (playPersonaCue), aldri intro-kjeden', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', exercise: CUSTOM_EX, durationS: 10, endsAt: 10_000 }));

      expect(coachPersonaService.playIntroThenExercise).not.toHaveBeenCalled();
      expect(coachPersonaService.playPersonaCue).toHaveBeenCalledWith('intro');
      expect(audioBufferEngine.playSequence).not.toHaveBeenCalled();
    });
  });

  describe('β3 — persona-bevisst resync (bro-resync)', () => {
    function resyncEvent(landingPhase: 'work' | 'rest' | 'round_rest'): EngineEvent {
      return {
        type: 'resync',
        skippedPhases: 2,
        landingPhase,
        exercise: EX_A,
        nextExercise: EX_B,
        tone: 'rolig',
      };
    }

    it('landing work med bro + studioklipp cachet: ÉN kjede [bro-resync, exercise-<id>]', async () => {
      usePersona();
      cacheClips([`${HC}/bro-resync.mp3`, 'exercise-kneboy']);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(resyncEvent('work'));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${HC}/bro-resync.mp3`,
        'exercise-kneboy',
      ]);
      expect(speechService.speak).not.toHaveBeenCalled();
      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
    });

    it('landing work med kun bro cachet: bro-kjede og DERETTER speak(navn)', async () => {
      usePersona();
      cacheClips([`${HC}/bro-resync.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(resyncEvent('work'));

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([`${HC}/bro-resync.mp3`]);
      expect(speechService.speak).not.toHaveBeenCalled();
      await flush();
      expect(speechService.speak).toHaveBeenCalledWith('Knebøy');
    });

    it('landing rest: navnedelen er NESTE øvelse', async () => {
      usePersona();
      cacheClips([`${HC}/bro-resync.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(resyncEvent('rest'));
      await flush();

      expect(speechService.speak).toHaveBeenCalledWith('Utfall');
    });

    it('persona-øvelsesklipp cachet (β5-sømmen): kjeden bruker personaens klipp', async () => {
      usePersona();
      cacheClips([`${HC}/bro-resync.mp3`, `${HC}/exercise-kneboy.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(resyncEvent('work'));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${HC}/bro-resync.mp3`,
        `${HC}/exercise-kneboy.mp3`,
      ]);
    });

    it('bro ucachet: dagens reaktive persona-resync uendret (playClipOrFallback)', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(resyncEvent('work'));

      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith('exercise-kneboy', 'Knebøy');
      expect(audioBufferEngine.playSequence).not.toHaveBeenCalled();
    });

    it('bro ucachet, landing rest: playClipOrFallback med «Neste:»-tekst som i dag', () => {
      usePersona();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(resyncEvent('round_rest'));

      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith('exercise-utfall-forover', 'Neste: Utfall');
    });
  });

  describe('fix-løkke — phaseEpoch-guard for TTS-etter-kjede (skip-lekkasje)', () => {
    // Funn fra spec-review: playSequence løser true BÅDE ved naturlig
    // kjedeslutt og ved bevisst stopp (fadeStopChain → finishChain(chain, true)).
    // Et skip stopper bro-kjeden via stopAudiblePersonaAudio i den nye fasens
    // reaktive sti, promiset løses true, og uten epoch-guard ville .then lese
    // det GAMLE navnet over den nye fasens kjede (status er fortsatt 'running',
    // og ved prepare→prepare-skip hjelper heller ikke fase-gaten).
    const CUSTOM_EX = { id: 'custom-42', name: 'Kjeglehopp' };

    it('skip midt i bro-kjeden (rest): TTS-navnet leses IKKE etter at ny fase har startet', async () => {
      usePersona();
      cacheClips([`${HC}/bro-neste.mp3`]);
      let resolveChain!: (v: boolean) => void;
      vi.mocked(audioBufferEngine.playSequence).mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveChain = resolve;
          })
      );
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: CUSTOM_EX, endsAt: 10_000 }));
      // Brukeren skipper FØR fristen → ny prepare-fase starter
      setNow(4_000);
      emit(phaseStarted({ phase: 'prepare', itemIndex: 1, endsAt: 14_000 }));
      // Skipets audible-stopp løser bro-kjedens promise med true (bevisst stopp)
      resolveChain(true);
      await flush();

      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('prepare→prepare-skip: fase-gaten alene hjelper ikke — epoch-guarden stopper TTS', async () => {
      usePersona();
      cacheClips([`${HC}/intro.mp3`, `${HC}/bro-naa.mp3`]);
      let resolveChain!: (v: boolean) => void;
      vi.mocked(audioBufferEngine.playSequence).mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveChain = resolve;
          })
      );
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', exercise: CUSTOM_EX, durationS: 10, endsAt: 10_000 }));
      // Skip til NY prepare (annen øvelse, ikke egendefinert) — snapshotets
      // fase er fortsatt 'prepare' og status 'running', så kun epoken skiller
      setNow(4_000);
      emit(phaseStarted({ phase: 'prepare', exercise: EX_A, itemIndex: 1, durationS: 10, endsAt: 14_000 }));
      resolveChain(true);
      await flush();

      expect(speechService.speak).not.toHaveBeenCalled();
    });

    it('degradert intro-sti (fjerde vei): prepare→prepare-skip innen 2,3 s annonserer IKKE gammel øvelse', async () => {
      // Samme lekkasjeklasse i playPrepareIntroChain sin setTimeout(2300)-
      // gjetting: fase-/status-gaten ser 'prepare'/'running' også i den NYE
      // prepare-fasen — kun epoch-guarden avslører skipet.
      vi.useFakeTimers();
      usePersona();
      vi.mocked(coachPersonaService.playIntroThenExercise).mockResolvedValue(false);
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', exercise: EX_A, durationS: 10, endsAt: 10_000 }));
      await flush(); // la .then-degraderingen sette opp timeouten
      setNow(4_000);
      emit(phaseStarted({ phase: 'prepare', exercise: EX_B, itemIndex: 1, durationS: 10, endsAt: 14_000 }));
      await vi.advanceTimersByTimeAsync(2300);

      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalledWith('exercise-kneboy', 'Knebøy');
      vi.useRealTimers();
    });

    it('resync-TTS-grenen avbrutt av fasebytte: ingen speak', async () => {
      usePersona();
      cacheClips([`${HC}/bro-resync.mp3`]);
      let resolveChain!: (v: boolean) => void;
      vi.mocked(audioBufferEngine.playSequence).mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveChain = resolve;
          })
      );
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit({
        type: 'resync',
        skippedPhases: 2,
        landingPhase: 'work',
        exercise: EX_A,
        nextExercise: EX_B,
        tone: 'rolig',
      });
      setNow(4_000);
      emit(phaseStarted({ phase: 'rest', itemIndex: 0, endsAt: 14_000 }));
      resolveChain(true);
      await flush();

      expect(speechService.speak).not.toHaveBeenCalled();
    });
  });

  describe('persona-rest-cue (siste β-oppfølging, BØR-1)', () => {
    // rest.mp3 er produsert/manifestert/preloadet for alle personaer men var
    // aldri koblet — samme bevisste aktivering av utriggret innhold som last5
    // (spec § 4/§ 5). Persona-veien spiller cuen i STEDET for playRestStart-
    // tonen; ucachet cue (eller tale av) faller tilbake til dagens tone.
    // NB: testen «rest med persona … (som i dag)» over kjører med tomt cache
    // og pinner dermed nettopp fallback-stien.
    const CUSTOM_EX = { id: 'custom-42', name: 'Kjeglehopp' };

    it('rest-cue + studioklipp cachet: ÉN kjede [rest, exercise-<id>] i stedet for tonen', () => {
      usePersona();
      cacheClips([`${HC}/rest.mp3`, 'exercise-utfall-forover']);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));

      expect(audioService.playRestStart).not.toHaveBeenCalled();
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${HC}/rest.mp3`,
        'exercise-utfall-forover',
      ]);
      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
    });

    it('rest-cue cachet, annonsering ucachet (tts-plan): cue først, fallback-kjeden ETTER kjedeslutt', async () => {
      usePersona();
      cacheClips([`${HC}/rest.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));

      expect(audioService.playRestStart).not.toHaveBeenCalled();
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([`${HC}/rest.mp3`]);
      // Aldri overlapp: annonseringen venter på kjedeslutt
      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
      await flush();
      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith(
        'exercise-utfall-forover',
        'Neste: Utfall'
      );
    });

    it('egendefinert neste + rest-cue: [rest, bro-neste]-kjede og DERETTER speak(navn)', async () => {
      usePersona();
      cacheClips([`${HC}/rest.mp3`, `${HC}/bro-neste.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: CUSTOM_EX, endsAt: 10_000 }));

      expect(audioService.playRestStart).not.toHaveBeenCalled();
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${HC}/rest.mp3`,
        `${HC}/bro-neste.mp3`,
      ]);
      await flush();
      expect(speechService.speak).toHaveBeenCalledWith('Kjeglehopp');
    });

    it('rest-cue cachet uten neste øvelse: cuen spilles alene', () => {
      usePersona();
      cacheClips([`${HC}/rest.mp3`]);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'round_rest', nextExercise: null, endsAt: 10_000 }));

      expect(audioService.playRestStart).not.toHaveBeenCalled();
      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([`${HC}/rest.mp3`]);
    });

    it('speechEnabled=false: dagens tone, aldri cue (stemme respekterer tale-bryteren)', () => {
      usePersona();
      cacheAllClips();
      const { engine, emit } = createFakeEngine({ speechEnabled: false });
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));

      expect(audioService.playRestStart).toHaveBeenCalledWith(true);
      expect(audioBufferEngine.playSequence).not.toHaveBeenCalled();
    });

    it('standard persona: playRestStart + announceRest, aldri cue (uendret)', () => {
      cacheAllClips();
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));

      expect(audioService.playRestStart).toHaveBeenCalledWith(true);
      expect(speechService.announceRest).toHaveBeenCalledWith('Utfall', 'rolig');
      expect(audioBufferEngine.playSequence).not.toHaveBeenCalled();
    });

    it('skip under rest-cuen (tts-plan): fallback-annonseringen undertrykkes (epoch-guard)', async () => {
      usePersona();
      cacheClips([`${HC}/rest.mp3`]);
      let resolveChain!: (v: boolean) => void;
      vi.mocked(audioBufferEngine.playSequence).mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveChain = resolve;
          })
      );
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));
      setNow(4_000);
      emit(phaseStarted({ phase: 'prepare', itemIndex: 1, endsAt: 14_000 }));
      resolveChain(true); // skipets audible-stopp løser rest-kjeden med true
      await flush();

      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalledWith(
        'exercise-utfall-forover',
        'Neste: Utfall'
      );
    });

    // Studio-planen mistet fallback-stigen da studioklippet ble kjedet: der
    // playClipOrFallback bar HTMLAudio → TTS bak seg, svarer playSequence bare
    // false når konteksten ikke lar seg kjøre (iOS 'interrupted' etter en
    // telefonsamtale, mislykket resume) — og annonseringen ble HELT STILLE.
    it('studio-plan: playSequence svarer false → playClipOrFallback overtar', async () => {
      usePersona();
      // Kun studioklippet er dekodet (ingen persona-variant, ingen rest-cue)
      // → plan 'studio', kjeden er navnet alene.
      cacheClips(['exercise-utfall-forover']);
      vi.mocked(audioBufferEngine.playSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith(['exercise-utfall-forover']);
      // Ingen dobbel avspilling: fallbacken venter på motorens svar
      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
      await flush();
      expect(audioClipService.playClipOrFallback).toHaveBeenCalledWith(
        'exercise-utfall-forover',
        'Neste: Utfall'
      );
    });

    it('studio-plan: true-svar (naturlig slutt ELLER bevisst stopp) gir aldri fallback', async () => {
      usePersona();
      cacheClips(['exercise-utfall-forover']);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));
      await flush();

      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
    });

    it('studio-plan: fasebytte før false-svaret → ingen gammel annonsering (stale-guard)', async () => {
      usePersona();
      cacheClips(['exercise-utfall-forover']);
      let resolveChain!: (v: boolean) => void;
      vi.mocked(audioBufferEngine.playSequence).mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveChain = resolve;
          })
      );
      const { engine, emit, setNow } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));
      // Skip til ny fase MENS motoren fortsatt venter på resume() internt …
      setNow(4_000);
      emit(phaseStarted({ phase: 'prepare', itemIndex: 1, endsAt: 14_000 }));
      // … og først DA kommer false-svaret: den gamle fasens navn skal ikke
      // legges oppå den nye fasens lyd.
      resolveChain(false);
      await flush();

      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalledWith(
        'exercise-utfall-forover',
        'Neste: Utfall'
      );
    });

    it('persona-plan: false-svar gir IKKE fallback (bevisst uendret fra main)', async () => {
      usePersona();
      // Persona-varianten er dekodet → plan 'persona'. Den veien gikk aldri
      // gjennom playClipOrFallback, og skal ikke begynne med det nå.
      cacheClips([`${HC}/exercise-utfall-forover.mp3`]);
      vi.mocked(audioBufferEngine.playSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      createAudioDirector(engine);

      emit(phaseStarted({ phase: 'rest', nextExercise: EX_B, endsAt: 10_000 }));
      await flush();

      expect(audioBufferEngine.playSequence).toHaveBeenCalledWith([
        `${HC}/exercise-utfall-forover.mp3`,
      ]);
      expect(audioClipService.playClipOrFallback).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('handle.unsubscribe stopper videre reaksjon på hendelser', () => {
      const { engine, emit } = createFakeEngine();
      const { unsubscribe } = createAudioDirector(engine);
      unsubscribe();

      emit({ type: 'workout:paused' });

      expect(coachPersonaService.stopCurrentPersonaAudio).not.toHaveBeenCalled();
    });
  });

  describe('replanCurrentPhase — preload fullført ETTER fasestart (kaldstart, funn B)', () => {
    // Kaldstart-oppsett for replan-testene (BØR-2 gjør replan betinget på at
    // noe faktisk feilet — varmstart er ren no-op, egen test): testen setter
    // scheduleSequence → false FØR emit (utstedelsen ved fasestart feiler,
    // degraderingsflagget settes), og kaller coldStart() ETTER emit: false-
    // svarene lander, spionen nullstilles, og videre utstedelser lykkes
    // («bufferne er nå dekodet»).
    async function coldStart(): Promise<void> {
      await flush();
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(true);
    }

    it('re-skedulerer aktiv grensefases lookahead mot gjeldende frist, cancelScheduled FØRST', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      await coldStart();

      director.replanCurrentPhase();

      expect(audioBufferEngine.cancelScheduled).toHaveBeenCalledTimes(1);
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/start_321.mp3`],
        { endAt: 10_000 }
      );
      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/go-1.mp3`],
        { startAt: 10_000 }
      );
      // Aldri dobbel-skedulering: kanselleringen skjer FØR re-utstedelsen, slik
      // at en allerede vellykket lookahead re-utstedes identisk (nett-effekt uendret).
      const cancelOrder = vi.mocked(audioBufferEngine.cancelScheduled).mock.invocationCallOrder[0];
      const firstScheduleOrder = vi.mocked(audioBufferEngine.scheduleSequence).mock
        .invocationCallOrder[0];
      expect(cancelOrder).toBeLessThan(firstScheduleOrder);
    });

    it('bruker GJELDENDE frist etter deadlineChanged, ikke fasestartens endsAt', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      emit({ type: 'phase:deadlineChanged', endsAt: 12_000 });
      await coldStart();

      director.replanCurrentPhase();

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/start_321.mp3`],
        { endAt: 12_000 }
      );
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalledWith(
        [`${HC}/start_321.mp3`],
        { endAt: 10_000 }
      );
    });

    it('status !== running (pause): no-op', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit, snapshot } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await coldStart();
      snapshot.status = 'paused';
      vi.mocked(audioBufferEngine.cancelScheduled).mockClear();

      director.replanCurrentPhase();

      expect(audioBufferEngine.cancelScheduled).not.toHaveBeenCalled();
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('før noen fase har startet: no-op', () => {
      usePersona();
      const { engine } = createFakeEngine();
      const director = createAudioDirector(engine);

      director.replanCurrentPhase();

      expect(audioBufferEngine.cancelScheduled).not.toHaveBeenCalled();
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('etter workout:reset: no-op (fasen er glemt)', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await coldStart();
      emit({ type: 'workout:reset' });
      vi.mocked(audioBufferEngine.cancelScheduled).mockClear();

      director.replanCurrentPhase();

      expect(audioBufferEngine.cancelScheduled).not.toHaveBeenCalled();
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('re-kjører ALDRI de reaktive annonseringene (ingen ny intro/cue)', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', durationS: 10, endsAt: 10_000 }));
      await coldStart();
      expect(coachPersonaService.playIntroThenExercise).toHaveBeenCalledTimes(1);

      director.replanCurrentPhase();
      await flush();

      expect(coachPersonaService.playIntroThenExercise).toHaveBeenCalledTimes(1);
      expect(coachPersonaService.playPersonaCue).not.toHaveBeenCalled();
    });

    it('etter fasebytte: planlegger KUN den aktive fasen — gamle ankre re-utstedes aldri', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit, setNow } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      setNow(10_050);
      emit(phaseStarted({ phase: 'work', durationS: 20, endsAt: 30_050 }));
      // Også work-fasens last5-utstedelse feilet (kaldstart) — replan skal
      // re-utstede NETTOPP den, aldri den forlatte prepare-fasens ankre.
      await coldStart();

      director.replanCurrentPhase();

      expect(audioBufferEngine.scheduleSequence).toHaveBeenCalledWith(
        [`${HC}/last5.mp3`],
        { startAt: 25_050 }
      );
      const scheduledKeys = vi
        .mocked(audioBufferEngine.scheduleSequence)
        .mock.calls.map(([keys]) => keys[0]);
      expect(scheduledKeys).not.toContain(`${HC}/start_321.mp3`);
      expect(scheduledKeys).not.toContain(`${HC}/start_321_short.mp3`);
    });

    it('kaldstart-pipeflagget nullstilles når replan lykkes: ingen pip oppå skedulert tale', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await flush();
      emit({ type: 'countdown', secondsLeft: 3 });
      expect(audioService.playCountdownBeep).toHaveBeenCalledTimes(1);

      // Preload fullførte: bufferne er nå dekodet og skeduleringen lykkes
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(true);
      director.replanCurrentPhase();
      await flush();

      emit({ type: 'countdown', secondsLeft: 2 });
      expect(audioService.playCountdownBeep).toHaveBeenCalledTimes(1);
    });

    it('re-måler tidsbroen før re-utstedelsen (samme hygiene som deadlineChanged)', async () => {
      usePersona();
      vi.mocked(audioBufferEngine.scheduleSequence).mockResolvedValue(false);
      const { engine, emit, setNow } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', endsAt: 10_000 }));
      await coldStart();
      setNow(3_000);
      vi.mocked(audioBufferEngine.setTimeBridge).mockClear();

      director.replanCurrentPhase();

      expect(audioBufferEngine.setTimeBridge).toHaveBeenCalledWith(3_000);
    });

    it('BØR-2 varmstart: alt lyktes ved fasestart → replan er ren no-op (ingen kansellering/re-utstedelse)', async () => {
      // Kanseller+reutsted her kunne kuttet en lookahead-kjede som alt HAR
      // startet (delvis varm cache) — pip over spillende stemme, eller omstart
      // av nedtellingen. Ingenting feilet → ingenting å reparere.
      usePersona();
      const { engine, emit } = createFakeEngine(); // scheduleSequence → true (default)
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      await flush();
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

      director.replanCurrentPhase();

      expect(audioBufferEngine.cancelScheduled).not.toHaveBeenCalled();
      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
    });

    it('BØR-1 utstedelses-generasjon: sent false-svar etter replan i samme fase gir ALDRI en ekstra short-kjede', async () => {
      // Hullet i stale-vakten: replan i SAMME fase mot SAMME frist endrer
      // verken phaseEpoch eller currentDeadline — et sent false-svar fra det
      // OPPRINNELIGE full-forsøket (suspendert ctx i resume-await) ville da
      // passert epoch+frist-sjekken og skedulert en short-kjede nummer to
      // oppå replanens egen stige.
      usePersona();
      let resolveLate!: (v: boolean) => void;
      vi.mocked(audioBufferEngine.scheduleSequence)
        .mockImplementationOnce(
          () =>
            new Promise<boolean>((resolve) => {
              resolveLate = resolve; // full, 1. forsøk — henger i resume-await
            })
        )
        .mockResolvedValueOnce(false) // go, 1. forsøk → degradert fase (replan har noe å reparere)
        .mockResolvedValue(true); // replan-utstedelsene lykkes
      const { engine, emit } = createFakeEngine();
      const director = createAudioDirector(engine);

      emit(phaseStarted({ phase: 'prepare', itemIndex: 0, endsAt: 10_000 }));
      await flush();
      director.replanCurrentPhase();
      await flush();
      vi.mocked(audioBufferEngine.scheduleSequence).mockClear();

      resolveLate(false); // det gamle full-forsøket svarer false ETTER replan
      await flush();

      expect(audioBufferEngine.scheduleSequence).not.toHaveBeenCalled();
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
