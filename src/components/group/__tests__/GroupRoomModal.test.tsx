import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { GroupRoomModal } from '../GroupRoomModal';
import { WorkoutTemplate } from '../../../types/workout';
import {
  GroupRoomState,
  createGroupRoom,
  joinGroupRoom,
  subscribeToGroupRoom,
  startGroupWorkout,
} from '../../../services/groupRoomService';
import { getServerNow } from '../../../services/clockSyncService';

// Firestore-laget mockes på tjenestegrensen (bestillingen B4): komponenttestene
// dekker UI-flyten opprett/join/start, ikke selve Firestore-protokollen — den
// dekkes av rules-testene og Playwright-røyken mot emulator.
vi.mock('../../../services/groupRoomService', () => ({
  createGroupRoom: vi.fn(),
  joinGroupRoom: vi.fn(),
  subscribeToGroupRoom: vi.fn(() => () => {}),
  startGroupWorkout: vi.fn(),
}));

vi.mock('../../../services/clockSyncService', () => ({
  estimateServerClockOffset: vi.fn().mockResolvedValue(0),
  getServerNow: vi.fn(() => 0),
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

const mockedCreate = vi.mocked(createGroupRoom);
const mockedJoin = vi.mocked(joinGroupRoom);
const mockedSubscribe = vi.mocked(subscribeToGroupRoom);
const mockedStart = vi.mocked(startGroupWorkout);
const mockedGetServerNow = vi.mocked(getServerNow);

const workout: WorkoutTemplate = {
  id: 'w-gruppe',
  name: 'Fellesøkt Torsdag',
  description: '',
  type: 'tabata',
  prepareDurationSeconds: 10,
  rounds: 1,
  roundRestDurationSeconds: 0,
  items: [
    {
      id: 'i1',
      exercise: { id: 'e1', name: 'Jumping Jacks' },
      workDurationSeconds: 20,
      restDurationSeconds: 10,
    },
  ],
};

function makeRoomState(overrides: Partial<GroupRoomState> = {}): GroupRoomState {
  return {
    roomId: 'K7M9P2',
    hostUid: 'host-1',
    hostName: 'Eirik',
    workout,
    status: 'waiting',
    participantCount: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderModal() {
  const onClose = vi.fn();
  const onStartSyncedWorkout = vi.fn();
  const utils = render(
    <GroupRoomModal workout={workout} onClose={onClose} onStartSyncedWorkout={onStartSyncedWorkout} />
  );
  return { ...utils, onClose, onStartSyncedWorkout };
}

/** Oppretter rom som vert og returnerer den fangede onSnapshot-callbacken. */
async function createRoomAsHost() {
  let snapshotCb: ((state: GroupRoomState | null) => void) | undefined;
  mockedSubscribe.mockImplementation((_roomId, cb) => {
    snapshotCb = cb;
    return () => {};
  });
  mockedCreate.mockResolvedValue('K7M9P2');

  const rendered = renderModal();
  fireEvent.click(screen.getByRole('button', { name: /Opprett rom & generer kode/ }));
  await screen.findByText('K7M9P2');

  return { ...rendered, snapshotCb: () => snapshotCb };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedSubscribe.mockImplementation(() => () => {});
  mockedGetServerNow.mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GroupRoomModal – opprett-flyt (vert)', () => {
  it('viser opprett-fanen med valgt økt som standard', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Fellesøkt Torsdag')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Opprett rom & generer kode/ })).toBeInTheDocument();
  });

  it('oppretter rom og viser romkoden til verten', async () => {
    await createRoomAsHost();

    // Verten ser romkoden og deltakertelleren
    expect(screen.getByText('K7M9P2')).toBeInTheDocument();
    expect(screen.getByText('1 i rommet (klare)')).toBeInTheDocument();
    expect(mockedCreate).toHaveBeenCalledWith('anon-host', 'Vert / Instruktør', workout);
    // Rommet abonneres for sanntidsoppdateringer
    expect(mockedSubscribe).toHaveBeenCalledWith('K7M9P2', expect.any(Function));
  });

  it('oppdaterer deltakertelleren når nye deltakere kommer inn via onSnapshot', async () => {
    const { snapshotCb } = await createRoomAsHost();

    act(() => {
      snapshotCb()!(makeRoomState({ participantCount: 3 }));
    });

    expect(screen.getByText('3 i rommet (klare)')).toBeInTheDocument();
  });

  it('viser feilmelding når romopprettelsen feiler', async () => {
    mockedCreate.mockRejectedValue(new Error('offline'));
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Opprett rom & generer kode/ }));

    expect(await screen.findByText('Kunne ikke opprette rom. Prøv igjen.')).toBeInTheDocument();
  });

  it('starter felles økt via startGroupWorkout og sperrer knappen mot dobbelttrykk', async () => {
    await createRoomAsHost();

    const startBtn = screen.getByRole('button', { name: /Start felles økt for alle/ });
    fireEvent.click(startBtn);

    await waitFor(() => expect(mockedStart).toHaveBeenCalledWith('K7M9P2'));
    // Knappen skal umiddelbart sperres (et nytt trykk ville forskjøvet starttidspunktet)
    expect(screen.getByRole('button', { name: /Starter om 3 sekunder/ })).toBeDisabled();
  });

  it('venter til det klokkesynkroniserte tidspunktet før økten starter for alle', async () => {
    const { snapshotCb, onStartSyncedWorkout, onClose } = await createRoomAsHost();

    vi.useFakeTimers();
    mockedGetServerNow.mockReturnValue(1000);
    const runningState = makeRoomState({ status: 'running', startAtServerMs: 4000 });

    act(() => {
      snapshotCb()!(runningState);
    });

    // Før tidspunktet: ingenting skal ha startet
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onStartSyncedWorkout).not.toHaveBeenCalled();

    // Ved tidspunktet: økten starter og modalen lukkes
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onStartSyncedWorkout).toHaveBeenCalledWith(runningState);
    expect(onClose).toHaveBeenCalled();
  });

  it('starter umiddelbart (fallback) når rommet mangler startAtServerMs', async () => {
    const { snapshotCb, onStartSyncedWorkout } = await createRoomAsHost();

    const runningState = makeRoomState({ status: 'running' });
    act(() => {
      snapshotCb()!(runningState);
    });

    expect(onStartSyncedWorkout).toHaveBeenCalledWith(runningState);
  });
});

describe('GroupRoomModal – join-flyt (deltaker)', () => {
  function switchToJoinTab() {
    fireEvent.click(screen.getByRole('button', { name: 'Bli med i rom' }));
  }

  it('avviser for kort romkode uten å kontakte tjenesten', () => {
    renderModal();
    switchToJoinTab();

    fireEvent.change(screen.getByLabelText('Tast inn 6-tegns romkode'), {
      target: { value: 'K7M' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Bli med i rommet/ }));

    expect(screen.getByText('Tast inn en 6-tegns romkode.')).toBeInTheDocument();
    expect(mockedJoin).not.toHaveBeenCalled();
  });

  it('viser feilmelding når romkoden ikke finnes', async () => {
    mockedJoin.mockResolvedValue(null);
    renderModal();
    switchToJoinTab();

    fireEvent.change(screen.getByLabelText('Tast inn 6-tegns romkode'), {
      target: { value: 'XXXXXX' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Bli med i rommet/ }));

    expect(await screen.findByText('Fant ikke noe aktivt rom med den koden.')).toBeInTheDocument();
  });

  it('viser venterommet med vertens navn etter vellykket join', async () => {
    mockedJoin.mockResolvedValue(makeRoomState({ participantCount: 2 }));
    renderModal();
    switchToJoinTab();

    fireEvent.change(screen.getByLabelText('Tast inn 6-tegns romkode'), {
      target: { value: 'k7m9p2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Bli med i rommet/ }));

    expect(await screen.findByText('Tilkoblet rom K7M9P2!')).toBeInTheDocument();
    expect(screen.getByText(/Venter på at verten \(Eirik\) skal starte økten/)).toBeInTheDocument();
    // Input oppercases før innsending
    expect(mockedJoin).toHaveBeenCalledWith('K7M9P2');
    // Deltakeren abonnerer på rommet for å fange vertens start
    expect(mockedSubscribe).toHaveBeenCalledWith('K7M9P2', expect.any(Function));
  });
});

describe('GroupRoomModal – lukking', () => {
  it('lukkes med Escape-tasten (WCAG)', () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
