import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimerDisplay } from '../TimerDisplay';
import { TimerState, WorkoutTemplate } from '../../../types/workout';

// Samme tjenestegrense-mocker som TimerDisplay.test.tsx (B4): Firebase-appen og
// Web Bluetooth skal aldri initialiseres i komponenttester.
vi.mock('../../../services/firebase', () => ({
  app: {},
  auth: {},
  db: {},
  googleProvider: {},
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
  }),
}));

vi.mock('../../../services/bluetoothHeartRateService', () => ({
  bluetoothHeartRateService: {
    isSupported: vi.fn(() => false),
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    reattach: vi.fn(),
  },
}));

const knebay = { id: 'e1', name: 'Knebøy' };
const planke = { id: 'e2', name: 'Planke' };

const workout: WorkoutTemplate = {
  id: 'w-test',
  name: 'Testøkt',
  description: 'Testfixture',
  type: 'custom',
  prepareDurationSeconds: 5,
  rounds: 2,
  roundRestDurationSeconds: 15,
  items: [
    { id: 'i1', exercise: knebay, workDurationSeconds: 20, restDurationSeconds: 10 },
    { id: 'i2', exercise: planke, workDurationSeconds: 20, restDurationSeconds: 10 },
  ],
};

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    status: 'idle',
    phase: 'prepare',
    currentRound: 1,
    totalRounds: 2,
    currentItemIndex: 0,
    totalItems: 2,
    currentExercise: knebay,
    nextExercise: planke,
    phaseRemainingSeconds: 20,
    phaseTotalSeconds: 20,
    phaseProgress: 0,
    totalRemainingSeconds: 115,
    totalElapsedSeconds: 0,
    isLocked: false,
    soundEnabled: true,
    vibrateEnabled: true,
    wakeLockEnabled: true,
    speechEnabled: true,
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onSelectWorkout: vi.fn(),
    onStartWorkoutDirectly: vi.fn(),
    onStart: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onReset: vi.fn(),
    onSkipNext: vi.fn(),
    onPrevious: vi.fn(),
    onToggleLock: vi.fn(),
    onToggleSound: vi.fn(),
    onToggleVibrate: vi.fn(),
    onToggleWakeLock: vi.fn(),
  };
}

function renderDisplay(state: TimerState, handlers = makeHandlers()) {
  const utils = render(
    <TimerDisplay
      workout={workout}
      state={state}
      presets={[workout]}
      {...handlers}
    />
  );
  return { ...utils, handlers };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mintrener_favorite_program_ids', JSON.stringify([workout.id]));
});

// jsdom 26 mangler PointerEvent — Testing Library faller da tilbake på
// window.Event og MISTER clientX/clientY. En minimal polyfill oppå MouseEvent
// gir fireEvent.pointerDown/Up ekte koordinater, som gest-testene krever.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class FakePointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    (window as unknown as { PointerEvent: typeof FakePointerEvent }).PointerEvent =
      FakePointerEvent;
  }
});

/** Simulerer en pekerbevegelse fra (x1,y1) til (x2,y2) på et element. */
function pointerGesture(el: Element, x1: number, y1: number, x2: number, y2: number) {
  fireEvent.pointerDown(el, { clientX: x1, clientY: y1, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: x2, clientY: y2, pointerId: 1 });
}

/** Ett enkelt trykk (ingen bevegelse) på et element. */
function tap(el: Element, x = 180, y = 300) {
  pointerGesture(el, x, y, x, y);
}

/** Bakgrunnsflaten gestene skal virke på (ikke-interaktivt element i main). */
function getGestureSurface(): Element {
  return screen.getByTestId('workout-surface');
}

describe('TimerDisplay – persona-aksent i fokusmodus (B6.1)', () => {
  it('rundelinjen leser aksentfargen fra --persona-accent i fokusmodus', () => {
    renderDisplay(makeState({ status: 'running', phase: 'work' }));

    const roundLine = screen.getByText(/RUNDE 1 AV 2/).closest('div');
    expect(roundLine).not.toBeNull();
    expect(roundLine!.style.color).toContain('var(--persona-accent');
  });

  it('fasebadgen får aksentfarget kant i fokusmodus', () => {
    renderDisplay(makeState({ status: 'running', phase: 'work' }));

    const badge = screen.getByText('Arbeid');
    expect(badge.style.borderColor).toContain('var(--persona-accent');
  });

  it('idle-visningen bruker IKKE persona-aksenten (kun fokusmodus)', () => {
    renderDisplay(makeState({ status: 'idle' }));

    const roundLine = screen.getByText(/RUNDE 1 AV 2/).closest('div');
    expect(roundLine!.style.color).toBe('');
    const badge = screen.getByText('Klargjøring');
    expect(badge.style.borderColor).toBe('');
  });
});

describe('TimerDisplay – gestflate i fokusmodus (B6.2)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sveip mot venstre på bakgrunnsflaten utløser neste øvelse', () => {
    const { handlers } = renderDisplay(makeState({ status: 'running', phase: 'work' }));
    pointerGesture(getGestureSurface(), 250, 300, 180, 305);
    expect(handlers.onSkipNext).toHaveBeenCalledTimes(1);
    expect(handlers.onPrevious).not.toHaveBeenCalled();
  });

  it('sveip mot høyre på bakgrunnsflaten utløser forrige øvelse', () => {
    const { handlers } = renderDisplay(makeState({ status: 'running', phase: 'work' }));
    pointerGesture(getGestureSurface(), 100, 300, 190, 295);
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    expect(handlers.onSkipNext).not.toHaveBeenCalled();
  });

  it('avviser for kort sveip og for bratt diagonal', () => {
    const { handlers } = renderDisplay(makeState({ status: 'running', phase: 'work' }));
    // 40 px < 50 px-terskelen
    pointerGesture(getGestureSurface(), 200, 300, 160, 300);
    // 60 px horisontalt, men 45 graders vinkel
    pointerGesture(getGestureSurface(), 200, 300, 140, 360);
    expect(handlers.onSkipNext).not.toHaveBeenCalled();
    expect(handlers.onPrevious).not.toHaveBeenCalled();
  });

  it('dobbelttrykk pauser en kjørende økt', () => {
    const { handlers } = renderDisplay(makeState({ status: 'running', phase: 'work' }));
    const surface = getGestureSurface();
    tap(surface);
    tap(surface);
    expect(handlers.onPause).toHaveBeenCalledTimes(1);
  });

  it('dobbelttrykk gjenopptar en pauset økt', () => {
    const { handlers } = renderDisplay(makeState({ status: 'paused', phase: 'work' }));
    const surface = getGestureSurface();
    tap(surface);
    tap(surface);
    expect(handlers.onResume).toHaveBeenCalledTimes(1);
    expect(handlers.onPause).not.toHaveBeenCalled();
  });

  it('enkelttrykk og to trege trykk (> 300 ms mellomrom) pauser IKKE', () => {
    vi.useFakeTimers();
    const { handlers } = renderDisplay(makeState({ status: 'running', phase: 'work' }));
    const surface = getGestureSurface();

    tap(surface);
    vi.advanceTimersByTime(400);
    expect(handlers.onPause).not.toHaveBeenCalled();

    tap(surface);
    vi.advanceTimersByTime(400);
    expect(handlers.onPause).not.toHaveBeenCalled();
  });

  it('gestene er inaktive i idle', () => {
    const { handlers } = renderDisplay(makeState({ status: 'idle' }));
    const surface = getGestureSurface();
    pointerGesture(surface, 250, 300, 150, 300);
    tap(surface);
    tap(surface);
    expect(handlers.onSkipNext).not.toHaveBeenCalled();
    expect(handlers.onPause).not.toHaveBeenCalled();
  });

  it('gestene er inaktive når skjermen er låst', () => {
    const { handlers } = renderDisplay(
      makeState({ status: 'running', phase: 'work', isLocked: true })
    );
    const surface = getGestureSurface();
    pointerGesture(surface, 250, 300, 150, 300);
    expect(handlers.onSkipNext).not.toHaveBeenCalled();
  });

  it('gest som starter på en knapp ignoreres (kolliderer ikke med knappene)', () => {
    const { handlers } = renderDisplay(makeState({ status: 'running', phase: 'work' }));
    const pauseButton = screen.getByRole('button', { name: 'PAUSE' });
    // Sveip som starter på PAUSE-knappen skal verken sveipe...
    pointerGesture(pauseButton, 250, 300, 150, 300);
    expect(handlers.onSkipNext).not.toHaveBeenCalled();
    // ...eller telle som trykk i dobbelttrykk-vinduet
    tap(pauseButton);
    tap(pauseButton);
    expect(handlers.onPause).not.toHaveBeenCalled();
  });

  it('to samtidige pekere utløser ikke sveip (multi-touch-vern)', () => {
    const { handlers } = renderDisplay(makeState({ status: 'running', phase: 'work' }));
    const surface = getGestureSurface();

    // To fingre ned samtidig; finger 2 (som overskrev startpunktet) beveger seg
    // horisontalt og løftes FØRST — den sårbare rekkefølgen uten vern
    fireEvent.pointerDown(surface, { clientX: 200, clientY: 300, pointerId: 1 });
    fireEvent.pointerDown(surface, { clientX: 250, clientY: 300, pointerId: 2 });
    fireEvent.pointerUp(surface, { clientX: 150, clientY: 302, pointerId: 2 });
    fireEvent.pointerUp(surface, { clientX: 200, clientY: 300, pointerId: 1 });
    expect(handlers.onSkipNext).not.toHaveBeenCalled();
    expect(handlers.onPrevious).not.toHaveBeenCalled();

    // Vernet slipper når alle pekere er løftet — vanlig én-finger-sveip virker igjen
    pointerGesture(surface, 250, 300, 180, 302);
    expect(handlers.onSkipNext).toHaveBeenCalledTimes(1);
  });
});

describe('TimerDisplay – dimme-modus (B6.3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function rerenderDisplay(
    utils: ReturnType<typeof renderDisplay>,
    state: TimerState
  ) {
    utils.rerender(
      <TimerDisplay
        workout={workout}
        state={state}
        presets={[workout]}
        {...utils.handlers}
      />
    );
  }

  it('dimmer økt-visningen med brightness(0.6) etter 10 s uten interaksjon under running', () => {
    renderDisplay(makeState({ status: 'running', phase: 'work' }));
    const surface = screen.getByTestId('workout-surface') as HTMLElement;

    expect(surface.style.filter).toBe('none');
    act(() => vi.advanceTimersByTime(10_000));
    expect(surface.style.filter).toBe('brightness(0.6)');
    expect(surface.dataset.dimmed).toBe('true');
  });

  it('berøring opphever dimmingen umiddelbart', () => {
    renderDisplay(makeState({ status: 'running', phase: 'work' }));
    const surface = screen.getByTestId('workout-surface') as HTMLElement;

    act(() => vi.advanceTimersByTime(10_000));
    expect(surface.style.filter).toBe('brightness(0.6)');

    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(surface.style.filter).toBe('none');
  });

  it('faseovergang vekker skjermen (lys ved ny øvelse)', () => {
    const utils = renderDisplay(makeState({ status: 'running', phase: 'work' }));
    const surface = screen.getByTestId('workout-surface') as HTMLElement;

    act(() => vi.advanceTimersByTime(10_000));
    expect(surface.style.filter).toBe('brightness(0.6)');

    rerenderDisplay(utils, makeState({ status: 'running', phase: 'rest' }));
    expect(surface.style.filter).toBe('none');
  });

  it('siste 5 sekunder av en fase vekker skjermen (§ 4.4)', () => {
    const utils = renderDisplay(
      makeState({ status: 'running', phase: 'work', phaseRemainingSeconds: 20 })
    );
    const surface = screen.getByTestId('workout-surface') as HTMLElement;

    act(() => vi.advanceTimersByTime(10_000));
    expect(surface.style.filter).toBe('brightness(0.6)');

    rerenderDisplay(
      utils,
      makeState({ status: 'running', phase: 'work', phaseRemainingSeconds: 5 })
    );
    expect(surface.style.filter).toBe('none');
  });

  it('suspenderer dimmingen mens TV-modus er åpen (fixed-overlay må ikke re-scopes av filter)', () => {
    // Åpnes fra idle (TV-knappen finnes ikke i fokusmodus), deretter startes økten
    const utils = renderDisplay(makeState({ status: 'idle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Storskjerm- og TV-visning' }));
    rerenderDisplay(utils, makeState({ status: 'running', phase: 'work' }));

    const surface = screen.getByTestId('workout-surface') as HTMLElement;
    act(() => vi.advanceTimersByTime(30_000));
    expect(surface.style.filter).toBe('none');

    // Når TV-modus lukkes gjenopptas dimmingen på mobilflaten
    fireEvent.click(screen.getByRole('button', { name: 'Lukk storskjermvisning' }));
    act(() => vi.advanceTimersByTime(10_000));
    expect(surface.style.filter).toBe('brightness(0.6)');
  });

  it('dimmer ikke i idle eller pause', () => {
    const utils = renderDisplay(makeState({ status: 'idle' }));
    const surface = screen.getByTestId('workout-surface') as HTMLElement;
    act(() => vi.advanceTimersByTime(30_000));
    expect(surface.style.filter).toBe('none');

    rerenderDisplay(utils, makeState({ status: 'paused', phase: 'work' }));
    act(() => vi.advanceTimersByTime(30_000));
    expect(surface.style.filter).toBe('none');
  });
});
