import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntervalTimer } from '../useIntervalTimer';
import { TABATA_WORKOUT } from '../../data/mockWorkouts';
import { audioService } from '../../services/audioService';
import { wakeLockService } from '../../services/wakeLockService';
import { speechService } from '../../services/speechService';
import { audioClipService } from '../../services/audioClipService';
import * as coachPersonaService from '../../services/coachPersonaService';

// A5: telemetryService importerer ../firebase, som initialiserer ekte Firebase
// Auth ved modul-load og kaster (auth/invalid-api-key) uten .env.local. Hooken
// kaller kun recordPerfTelemetry fire-and-forget – mock hele modulen slik at
// denne testfilen aldri berører firebase.ts (samme mønster som
// clockSyncService.test.ts bruker for ../firebase direkte).
vi.mock('../../services/telemetryService', () => ({
  recordPerfTelemetry: vi.fn().mockResolvedValue(undefined),
}));

// jsdom kan ikke fetche relative lyd-URL-er – demp preload-varslene fra
// buffer-motoren i alle hook-testene (preload er fyr-og-glem-optimalisering)
function silenceAudioPreloads(): void {
  vi.spyOn(audioClipService, 'preloadClips').mockImplementation(() => {});
  vi.spyOn(coachPersonaService, 'preloadPersonaAudio').mockImplementation(() => {});
}

describe('useIntervalTimer Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    silenceAudioPreloads();
  });

  it('initialiserer Tabata-økt med riktige verdier (4:00 totaltid, 10s klargjøring)', () => {
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.phase).toBe('prepare');
    expect(result.current.state.phaseRemainingSeconds).toBe(10);
    // Tabata: 10s prepare + 7 * (20s + 10s) + 20s = 240s = 04:00
    expect(result.current.state.totalRemainingSeconds).toBe(240);
    expect(result.current.state.totalRounds).toBe(1);
    expect(result.current.state.totalItems).toBe(8);
  });

  it('starter økten, låser opp lyd og aktiverer Wake Lock', async () => {
    const unlockSpy = vi.spyOn(audioService, 'unlockAudio');
    const lockSpy = vi.spyOn(wakeLockService, 'requestLock');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });

    expect(result.current.state.status).toBe('running');
    expect(unlockSpy).toHaveBeenCalledTimes(1);
    expect(lockSpy).toHaveBeenCalledTimes(1);
  });

  it('pauser økten og slipper Wake Lock', async () => {
    const releaseSpy = vi.spyOn(wakeLockService, 'releaseLock');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });

    act(() => {
      result.current.pauseWorkout();
    });

    expect(result.current.state.status).toBe('paused');
    expect(releaseSpy).toHaveBeenCalledTimes(1);
  });

  it('hopper gjennom faser ved skipNext (prepare -> work 1 -> rest 1 -> work 2)', async () => {
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });

    // 1. Fra prepare til work (Knebøy)
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.state.phase).toBe('work');
    expect(result.current.state.currentItemIndex).toBe(0);
    expect(result.current.state.currentExercise?.name).toBe('Knebøy');
    expect(result.current.state.phaseTotalSeconds).toBe(20);

    // 2. Fra work til rest
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.phaseTotalSeconds).toBe(10);

    // 3. Fra rest til work (Push-ups)
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.state.phase).toBe('work');
    expect(result.current.state.currentItemIndex).toBe(1);
    expect(result.current.state.currentExercise?.name).toBe('Push-ups');
    expect(result.current.state.phaseTotalSeconds).toBe(20);
  });

  it('fullfører økten umiddelbart etter siste arbeidsintervall er over', async () => {
    const completeSpy = vi.spyOn(audioService, 'playWorkoutComplete');
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });

    // Hopp over prepare (1)
    act(() => {
      result.current.skipNext();
    });

    // 7 første øvelser (arbeid + hvile)
    for (let i = 0; i < 7; i++) {
      act(() => {
        result.current.skipNext(); // arbeid
      });
      act(() => {
        result.current.skipNext(); // hvile
      });
    }

    // 8. øvelse (siste arbeid)
    act(() => {
      result.current.skipNext();
    });

    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.phase).toBe('complete');
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });

  it('nullstiller økten lydløst uten å trigge tale', () => {
    const prepareSpy = vi.spyOn(speechService, 'announcePrepare');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    act(() => {
      result.current.resetWorkout();
    });

    expect(result.current.state.status).toBe('idle');
    expect(prepareSpy).not.toHaveBeenCalled();
  });

  it('starter direkte med ny økt og annonserer riktig første øvelse og tone', async () => {
    const prepareSpy = vi.spyOn(speechService, 'announcePrepare');

    const barnWorkout = {
      id: 'barn-test',
      name: 'Dyre-safari',
      description: 'Lek',
      type: 'custom' as const,
      prepareDurationSeconds: 5,
      rounds: 1,
      roundRestDurationSeconds: 0,
      voiceTone: 'lek' as const,
      items: [
        { id: 'b1', exercise: { id: 'frosk', name: 'Froskehopp' }, workDurationSeconds: 25, restDurationSeconds: 10 },
      ],
    };

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout(barnWorkout);
    });

    expect(result.current.state.status).toBe('running');
    expect(result.current.state.phaseTotalSeconds).toBe(5);
    expect(result.current.state.currentExercise?.name).toBe('Froskehopp');
    expect(prepareSpy).toHaveBeenCalledWith('Froskehopp', 'lek');
  });
});

describe('useIntervalTimer Hook – catch-up ved dvale/lomme (Oppgave 2)', () => {
  // Fast, vilkårlig basisverdi for performance.now() – økes manuelt per test for å
  // simulere at klokken har "hoppet" videre mens fanen lå i bakgrunnen/dvale.
  // Fake timers driver kun tick-intervallets 100ms-kadens (tickerService sin
  // setInterval-fallback), mens performance.now-spionen styrer hvor mye "ekte" tid
  // som later til å ha gått – de to må settes opp FØR startWorkout() kalles.
  const START_MS = 1_000_000;
  let nowMs = START_MS;
  let performanceNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    nowMs = START_MS;
    vi.useFakeTimers();
    // NB: restaurer KUN denne ene spionen i afterEach (ikke vi.restoreAllMocks()) –
    // audioService/wakeLockService sine moduler er singletons som deler mock-
    // implementasjoner (fra src/test/setup.ts) på tvers av testene i denne filen,
    // og en global restore ville fjernet dem permanent etter første test.
    performanceNowSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    silenceAudioPreloads();
  });

  afterEach(() => {
    vi.useRealTimers();
    performanceNowSpy.mockRestore();
    // Sikkerhetsnett: nullstill persona i tilfelle en test feiler før den rekker
    // å sette den tilbake selv (unngår lekkasje til påfølgende tester i filen).
    coachPersonaService.setActiveCoachPersona('standard');
  });

  it('normal drift ved fasegrense (overshoot ~0) er uendret – ett playWorkStart-kall, ingen resync-dobbeltkall', async () => {
    const workStartSpy = vi.spyOn(audioService, 'playWorkStart');
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });
    workStartSpy.mockClear();

    // Prepare varer 10s. Hopp presist til fasegrensen slik at overshoot = 0s,
    // godt under 1,5s-terskelen for "dvale" – dagens enkelt-avansement skal brukes.
    nowMs = START_MS + 10_000;
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state.phase).toBe('work');
    expect(result.current.state.currentItemIndex).toBe(0);
    expect(workStartSpy).toHaveBeenCalledTimes(1);
  });

  it('dvale midt i økten: spoler stille gjennom flere faser og lander riktig med nøyaktig én resync-cue', async () => {
    const workStartSpy = vi.spyOn(audioService, 'playWorkStart');
    const restStartSpy = vi.spyOn(audioService, 'playRestStart');
    const announceWorkSpy = vi.spyOn(speechService, 'announceWork');
    const announceRestSpy = vi.spyOn(speechService, 'announceRest');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });
    workStartSpy.mockClear();
    restStartSpy.mockClear();
    announceWorkSpy.mockClear();
    announceRestSpy.mockClear();

    // Tidslinje for TABATA_WORKOUT (10s prepare + 8 øvelser à 20s arbeid/10s pause,
    // 1 runde): prepare 0-10s, deretter 30s sykluser (20s arbeid + 10s pause) per
    // øvelse. Ved t=95s fra øktstart: 95 - 10 = 85s inn i øvelsessyklusene.
    // 85 / 30 = 2 fulle sykluser (60s, øvelse index 0 og 1 ferdig) + 25s inn i
    // syklus nr. 3 (øvelse index 2, "Mountain Climbers"). 25s inn i en 20s
    // arbeid + 10s pause-syklus = 5s inn i PAUSEN etter øvelse index 2 (20+5=25).
    // Forventet landing: phase='rest', currentItemIndex=2, ~5s igjen av 10s pause.
    nowMs = START_MS + 95_000;
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state.status).toBe('running');
    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.currentItemIndex).toBe(2);

    // Kun resync-cuen skal ha spilt lyd/tale – ikke én kaskade per hoppet fase
    expect(workStartSpy).toHaveBeenCalledTimes(0);
    expect(restStartSpy).toHaveBeenCalledTimes(1);
    expect(announceWorkSpy).toHaveBeenCalledTimes(0);
    expect(announceRestSpy).toHaveBeenCalledTimes(1);
    // Resync-cuen annonserer neste øvelse (index 3: "Utfall forover")
    expect(announceRestSpy).toHaveBeenCalledWith('Utfall forover', 'rolig');

    // Kjør én tick til (uten å flytte performance.now videre) slik at React-state
    // rekker å reflektere den bakdaterte phaseStartTime, og les ut gjenværende tid
    // via phaseProgress (phaseRemainingSeconds er avrundet med Math.ceil).
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const remaining = result.current.state.phaseTotalSeconds * (1 - result.current.state.phaseProgress);
    expect(remaining).toBeGreaterThan(4.8);
    expect(remaining).toBeLessThan(5.2);

    // Ingen ekstra lydkall skal ha kommet fra den andre ticken
    expect(restStartSpy).toHaveBeenCalledTimes(1);
  });

  it('dvale med ikke-standard persona: ingen spurious 3-2-1-cue rett før stille catch-up', async () => {
    // Regresjonstest for feilen der start_321-blokken kjørte FØR catchUpExpiredPhases:
    // ved oppvåkning er den utløpte fasen fortsatt 'prepare'/'rest'/'round_rest' med
    // remaining=0 (Math.max(0, ...)) idet denne sjekken evalueres, og uten en
    // remaining > 0-vakt ville den feilaktig spilt en 3-2-1-cue rett før fasen ble
    // hoppet stille over – to cuer i stedet for én.
    coachPersonaService.setActiveCoachPersona('hardcore');
    const playPersonaCueSpy = vi.spyOn(coachPersonaService, 'playPersonaCue');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });
    playPersonaCueSpy.mockClear();

    // Samme 95s-hopp som "dvale midt i økten": prepare (10s) er fortsatt den aktive
    // fasen idet ticken starter, med remaining=0 – nettopp scenarioet som trigget
    // spurious-cuen tidligere.
    nowMs = START_MS + 95_000;
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state.phase).toBe('rest');
    expect(playPersonaCueSpy).not.toHaveBeenCalledWith('start_321');

    coachPersonaService.setActiveCoachPersona('standard');
  });

  it('dvale forbi slutten av økten: fullfører direkte med nøyaktig ett playWorkoutComplete-kall', async () => {
    const completeSpy = vi.spyOn(audioService, 'playWorkoutComplete');
    const workStartSpy = vi.spyOn(audioService, 'playWorkStart');
    const restStartSpy = vi.spyOn(audioService, 'playRestStart');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));

    await act(async () => {
      await result.current.startWorkout();
    });
    completeSpy.mockClear();
    workStartSpy.mockClear();
    restStartSpy.mockClear();

    // Hele økten varer 240s (10s prepare + 7*30s sykluser + 20s siste arbeid).
    // Hopp langt forbi slutten (250s fra øktstart) for å simulere dvale gjennom
    // hele resten av økten.
    nowMs = START_MS + 250_000;
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.phase).toBe('complete');
    expect(completeSpy).toHaveBeenCalledTimes(1);
    // Ingen mellomliggende faser skal ha trigget egne lydkall under catch-up
    expect(workStartSpy).toHaveBeenCalledTimes(0);
    expect(restStartSpy).toHaveBeenCalledTimes(0);
  });
});

describe('useIntervalTimer Hook – persona-sekvensering og persona-bevisst resync (Oppgave 9+10)', () => {
  // Samme scaffolding som catch-up-testene over: fake timers driver tick-kadensen,
  // performance.now-spionen simulerer tidshopp (dvale).
  const START_MS = 2_000_000;
  let nowMs = START_MS;
  let performanceNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    nowMs = START_MS;
    vi.useFakeTimers();
    performanceNowSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    silenceAudioPreloads();
  });

  afterEach(() => {
    vi.useRealTimers();
    performanceNowSpy.mockRestore();
    coachPersonaService.setActiveCoachPersona('standard');
  });

  it('prepare med persona og cachede buffere: intro + øvelsesnavn spilles som ÉN kjede, ingen 2300ms-timeout', async () => {
    coachPersonaService.setActiveCoachPersona('hardcore');
    const introSeqSpy = vi
      .spyOn(coachPersonaService, 'playIntroThenExercise')
      .mockResolvedValue(true);
    const personaCueSpy = vi.spyOn(coachPersonaService, 'playPersonaCue').mockResolvedValue(true);
    const clipSpy = vi.spyOn(audioClipService, 'playClipOrFallback').mockResolvedValue(undefined);

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });

    expect(introSeqSpy).toHaveBeenCalledTimes(1);
    expect(introSeqSpy).toHaveBeenCalledWith('kneboy');
    expect(personaCueSpy).not.toHaveBeenCalledWith('intro');

    // Den gamle gjettede setTimeout(2300)-stien skal IKKE være aktiv
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(clipSpy).not.toHaveBeenCalled();
  });

  it('prepare med persona uten cachede buffere: degradert sti med intro-cue + setTimeout(2300) beholdes', async () => {
    coachPersonaService.setActiveCoachPersona('hardcore');
    vi.spyOn(coachPersonaService, 'playIntroThenExercise').mockResolvedValue(false);
    const personaCueSpy = vi.spyOn(coachPersonaService, 'playPersonaCue').mockResolvedValue(true);
    const clipSpy = vi.spyOn(audioClipService, 'playClipOrFallback').mockResolvedValue(undefined);

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });

    expect(personaCueSpy).toHaveBeenCalledWith('intro');
    expect(clipSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2300);
    });
    expect(clipSpy).toHaveBeenCalledWith('exercise-kneboy', 'Knebøy');
  });

  it('persona-resync etter dvale: persona-riktig øvelses-cue nøyaktig én gang, ingen standard pip/TTS', async () => {
    coachPersonaService.setActiveCoachPersona('hardcore');
    vi.spyOn(coachPersonaService, 'playIntroThenExercise').mockResolvedValue(true);
    const clipSpy = vi.spyOn(audioClipService, 'playClipOrFallback').mockResolvedValue(undefined);
    const restStartSpy = vi.spyOn(audioService, 'playRestStart');
    const workStartSpy = vi.spyOn(audioService, 'playWorkStart');
    const announceRestSpy = vi.spyOn(speechService, 'announceRest');
    const announceWorkSpy = vi.spyOn(speechService, 'announceWork');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });
    clipSpy.mockClear();
    restStartSpy.mockClear();
    workStartSpy.mockClear();

    // 95s-hopp lander i pausen etter øvelse index 2 (se catch-up-testen over):
    // neste øvelse er index 3 «Utfall forover»
    nowMs = START_MS + 95_000;
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.currentItemIndex).toBe(2);

    // Nøyaktig ÉN cue – personaens øvelsesannonsering, ikke standard beep+TTS
    expect(clipSpy).toHaveBeenCalledTimes(1);
    expect(clipSpy).toHaveBeenCalledWith('exercise-utfall-forover', 'Neste: Utfall forover');
    expect(restStartSpy).not.toHaveBeenCalled();
    expect(workStartSpy).not.toHaveBeenCalled();
    expect(announceRestSpy).not.toHaveBeenCalled();
    expect(announceWorkSpy).not.toHaveBeenCalled();
  });

  it('resync som lander i round_rest (flerrunde-økt): standard-cue annonserer første øvelse i neste runde', async () => {
    // TABATA har bare 1 runde – round_rest-grenen krever en flerrunde-økt
    const multiRoundWorkout = {
      id: 'multi-test',
      name: 'Flerrunde-test',
      description: 'To runder med runde-pause',
      type: 'custom' as const,
      prepareDurationSeconds: 10,
      rounds: 2,
      roundRestDurationSeconds: 30,
      voiceTone: 'rolig' as const,
      items: [
        {
          id: 'mr1',
          exercise: { id: 'kneboy', name: 'Knebøy' },
          workDurationSeconds: 20,
          restDurationSeconds: 10,
        },
      ],
    };

    const restStartSpy = vi.spyOn(audioService, 'playRestStart');
    const announceRestSpy = vi.spyOn(speechService, 'announceRest');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout(multiRoundWorkout);
    });
    restStartSpy.mockClear();
    announceRestSpy.mockClear();

    // Tidslinje: prepare 0-10, work 10-30, rest 30-40, round_rest 40-70.
    // t=50s → 10s inn i round_rest, 20s igjen.
    nowMs = START_MS + 50_000;
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.state.status).toBe('running');
    expect(result.current.state.phase).toBe('round_rest');
    expect(restStartSpy).toHaveBeenCalledTimes(1);
    expect(announceRestSpy).toHaveBeenCalledTimes(1);
    // round_rest-grenen annonserer FØRSTE øvelse (neste runde starter forfra)
    expect(announceRestSpy).toHaveBeenCalledWith('Knebøy', 'rolig');
  });
});

describe('useIntervalTimer Hook – render-gating av nedtelling (Oppgave A3)', () => {
  // Samme scaffolding som catch-up-blokken over, men her lar vi performance.now følge
  // vi.advanceTimersByTime i lockstep (i stedet for ett stort sprang) for å simulere
  // normal drift tick for tick – akkurat scenarioet A3 skal gate rendringer for.
  const START_MS = 5_000_000;
  let nowMs = START_MS;
  let performanceNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    nowMs = START_MS;
    vi.useFakeTimers();
    performanceNowSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    silenceAudioPreloads();
  });

  afterEach(() => {
    vi.useRealTimers();
    performanceNowSpy.mockRestore();
  });

  it('gater React-render til ~1x/sekund under 1 simulert sekund med 10 tick à 100ms', async () => {
    // Render-probe: telleren økes inni selve render-funksjonen som kalles av
    // renderHook, altså nøyaktig én gang per faktiske React-render av komponenten
    // som bruker hooken. Uten A3-gating ville de 10 100ms-tickene gitt ~10 renders
    // (én per setPhaseRemaining/setTotalElapsed-kall); med gating skal kun tick-er
    // som krysser en hel sekundgrense (Math.ceil endres) trigge re-render.
    const renderCount = { current: 0 };
    const { result } = renderHook(() => {
      renderCount.current++;
      return useIntervalTimer({ workout: TABATA_WORKOUT });
    });

    await act(async () => {
      await result.current.startWorkout();
    });
    const baselineRenders = renderCount.current;

    const observedCeilValues = new Set<number>();
    observedCeilValues.add(result.current.state.phaseRemainingSeconds);

    for (let i = 0; i < 10; i++) {
      nowMs += 100;
      act(() => {
        vi.advanceTimersByTime(100);
      });
      observedCeilValues.add(result.current.state.phaseRemainingSeconds);
    }

    const rendersDuringSecond = renderCount.current - baselineRenders;
    expect(rendersDuringSecond).toBeLessThanOrEqual(2);
    // phaseRemainingSeconds (Math.ceil av phaseRemaining) skal maks ha endret verdi 1-2 ganger
    expect(observedCeilValues.size).toBeLessThanOrEqual(2);
  });

  it('fasetransisjon skjer fortsatt presist på riktig tick til tross for gatede renders', async () => {
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });

    // Prepare varer 10s (TABATA_WORKOUT). Tikk 100 ganger à 100ms = nøyaktig 10s,
    // i lockstep med performance.now – motoren skal fortsatt bytte fase presist på
    // riktig tick, selv om React-state kun oppdateres ~1x/sekund.
    for (let i = 0; i < 100; i++) {
      nowMs += 100;
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }

    expect(result.current.state.phase).toBe('work');
    expect(result.current.state.currentItemIndex).toBe(0);
  });
});

describe('useIntervalTimer Hook – veggklokke-re-anker ved dvale (Oppgave A6)', () => {
  // performance.now og Date.now spiones uavhengig av hverandre: performance.now
  // "fryser" (holdes konstant) for å simulere kjent iOS/macOS Safari-oppførsel der
  // dvale stopper performance.now-klokken, mens Date.now (veggklokken) fortsetter.
  const START_MS = 6_000_000;
  let nowMs = START_MS;
  let dateNowMs = START_MS;
  let performanceNowSpy: ReturnType<typeof vi.spyOn>;
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    nowMs = START_MS;
    dateNowMs = START_MS;
    vi.useFakeTimers();
    performanceNowSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => dateNowMs);
    silenceAudioPreloads();
  });

  afterEach(() => {
    vi.useRealTimers();
    performanceNowSpy.mockRestore();
    dateNowSpy.mockRestore();
    coachPersonaService.setActiveCoachPersona('standard');
  });

  it('performance.now fryser under dvale: visibilitychange re-ankrer via Date.now og lander riktig, med maks én resync-cue', async () => {
    const workStartSpy = vi.spyOn(audioService, 'playWorkStart');
    const restStartSpy = vi.spyOn(audioService, 'playRestStart');
    const announceWorkSpy = vi.spyOn(speechService, 'announceWork');
    const announceRestSpy = vi.spyOn(speechService, 'announceRest');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });
    workStartSpy.mockClear();
    restStartSpy.mockClear();
    announceWorkSpy.mockClear();
    announceRestSpy.mockClear();

    // Date.now hopper 95s frem (ekte veggklokketid som gikk mens enheten sov), men
    // performance.now (nowMs) forblir UENDRET – det er nettopp dette som gjorde at
    // catch-up-logikken (performance.now-basert) tidligere ville "mistet" søvnperioden.
    dateNowMs = START_MS + 95_000;

    // jsdom sin document.visibilityState er 'visible' som standard, så vi trenger
    // ikke overstyre den – kun trigge selve hendelsen mens status er 'running'.
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Samme forventede landing som performance.now-baserte "dvale midt i økten"-testen
    // for t=95s (se catch-up-blokken over): rest-fase, øvelse index 2, ~5s igjen.
    expect(result.current.state.status).toBe('running');
    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.currentItemIndex).toBe(2);

    // Maks én resync-cue, ikke en kaskade per hoppet fase
    expect(workStartSpy).toHaveBeenCalledTimes(0);
    expect(restStartSpy).toHaveBeenCalledTimes(1);
    expect(announceWorkSpy).toHaveBeenCalledTimes(0);
    expect(announceRestSpy).toHaveBeenCalledTimes(1);
  });

  it('race-regresjon: en vanlig tick som kjører FØR visibilitychange etter frosset performance.now fanger driften likevel', async () => {
    // Ved ekte oppvåkning er workerens/setInterval-fallbackens ventende tick og selve
    // visibilitychange-hendelsen begge makrotasks med USPESIFISERT rekkefølge. Før
    // fiksen målte kun visibilitychange-handleren drift, mens tick() ubetinget
    // overskrev lastTickWallMs/lastTickPerfMs FØR noen drift-sjekk – kjørte en vanlig
    // tick først, ville ankrene alt vært ferske (post-oppvåkning) når
    // visibilitychange-handleren omsider målte drift, og dvale-perioden ville vært
    // stille tapt (nøyaktig A6-buggen, nå re-introdusert som en race). Fiksen flytter
    // drift-sjekken INN i tick() selv, FØR ankrene overskrives – så selv en "vanlig"
    // tick som vinner racet fanger driften.
    const workStartSpy = vi.spyOn(audioService, 'playWorkStart');
    const restStartSpy = vi.spyOn(audioService, 'playRestStart');
    const announceWorkSpy = vi.spyOn(speechService, 'announceWork');
    const announceRestSpy = vi.spyOn(speechService, 'announceRest');

    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });
    workStartSpy.mockClear();
    restStartSpy.mockClear();
    announceWorkSpy.mockClear();
    announceRestSpy.mockClear();

    // Samme dvale-simulering som testen over: Date.now hopper 95s, performance.now fryser.
    dateNowMs = START_MS + 95_000;

    // Racet: den vanlige 100ms-tickeren (setInterval-fallback i testmiljøet) rekker å
    // kjøre FØR visibilitychange-hendelsen dispatches under.
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // visibilitychange kommer i etterkant – skal være ufarlig (ankrene er allerede
    // ferske fra ticken over, så drift ≈ 0 her og ingen dobbel re-ankring skjer).
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Samme forventede landing som forrige test – catch-up skal ha fanget hele
    // 95s-driften selv om det var en «vanlig» tick, ikke visibilitychange, som først
    // observerte den.
    expect(result.current.state.status).toBe('running');
    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.currentItemIndex).toBe(2);
    expect(workStartSpy).toHaveBeenCalledTimes(0);
    expect(restStartSpy).toHaveBeenCalledTimes(1);
    expect(announceWorkSpy).toHaveBeenCalledTimes(0);
    expect(announceRestSpy).toHaveBeenCalledTimes(1);
  });

  it('drift under terskelen (500ms) re-ankrer IKKE og påvirker ikke gjenværende tid', async () => {
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });

    // Normal drift: performance.now og Date.now går begge ~2s frem, men med 500ms
    // avvik mellom dem – godt under SLEEP_REANCHOR_THRESHOLD_MS (2000ms). Dette skal
    // IKKE trigge noen re-ankring av phaseStartTime/workoutStartTime.
    nowMs += 2000;
    dateNowMs += 2500;

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Prepare er 10s; uten re-ankring skal gjenværende tid reflektere de faktiske
    // 2s (performance.now-baserte) som har gått, avrundet oppover: 8s igjen.
    expect(result.current.state.phase).toBe('prepare');
    expect(result.current.state.phaseRemainingSeconds).toBe(8);
  });

  it('negativ drift (veggklokken justert bakover) re-ankrer IKKE', async () => {
    const { result } = renderHook(() => useIntervalTimer({ workout: TABATA_WORKOUT }));
    await act(async () => {
      await result.current.startWorkout();
    });

    // performance.now går normalt 3s frem, men Date.now hopper BAKOVER (f.eks. NTP-
    // korrigering av en veggklokke som gikk feil) – negativ drift skal ignoreres helt,
    // ikke tolkes som at tid har "forsvunnet".
    nowMs += 3000;
    dateNowMs -= 5000;

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.state.phase).toBe('prepare');
    expect(result.current.state.phaseRemainingSeconds).toBe(7);
  });
});
