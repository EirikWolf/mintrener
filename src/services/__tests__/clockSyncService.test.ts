import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocker firebase/firestore og ./firebase på samme måte som tjenesten importerer dem,
// slik at estimateServerClockOffset kan testes uten et ekte nettverkskall.
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'SERVER_TIMESTAMP_SENTINEL');

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

import {
  computeClockOffset,
  median,
  estimateServerClockOffset,
  getServerNow,
  __resetClockSyncCacheForTest,
} from '../clockSyncService';

/** Bygger et fake DocumentSnapshot-svar med et gitt server-millisekundstempel. */
function fakeSnapshot(serverMs: number) {
  return { data: () => ({ ts: { toMillis: () => serverMs } }) };
}

describe('computeClockOffset', () => {
  it('gir positiv offset når serveren er foran klienten', () => {
    // t0=1000, t1=1200 -> midtpunkt 1100; server=5100 -> offset 4000
    expect(computeClockOffset(1000, 1200, 5100)).toBe(4000);
  });

  it('gir negativ offset når klienten er foran serveren', () => {
    expect(computeClockOffset(10_000, 10_200, 1_000)).toBe(-9100);
  });

  it('gir eksakt svar ved symmetrisk rundtur (speilvendte ± offset rundt samme midtpunkt)', () => {
    // Midtpunktet er likt (2000) i begge tilfeller, men serverstempelet ligger
    // like langt før/etter — offsettene skal da bli nøyaktig speilvendte (±500).
    expect(computeClockOffset(1900, 2100, 2500)).toBe(500);
    expect(computeClockOffset(1900, 2100, 1500)).toBe(-500);
  });
});

describe('median', () => {
  it('oddetall antall elementer: returnerer midterste verdi', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('partall antall elementer: returnerer snitt av de to midterste', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('én verdi: returnerer verdien selv', () => {
    expect(median([42])).toBe(42);
  });

  it('usortert input sorteres før medianberegning', () => {
    expect(median([9, -5, 100, 0, 3])).toBe(3);
  });

  it('tom liste: returnerer 0', () => {
    expect(median([])).toBe(0);
  });
});

describe('estimateServerClockOffset', () => {
  beforeEach(() => {
    __resetClockSyncCacheForTest();
    mockDoc.mockClear();
    mockSetDoc.mockClear();
    mockGetDoc.mockClear();
    mockServerTimestamp.mockClear();
    vi.restoreAllMocks();
  });

  it('bruker median av 3 målinger med kontrollerte serverstempler', async () => {
    // t0/t1-par for hver av de 3 målingene, styrt via Date.now-mock.
    const dateNowSpy = vi.spyOn(Date, 'now');
    dateNowSpy
      .mockReturnValueOnce(1000) // sample 1: t0
      .mockReturnValueOnce(1200) // sample 1: t1
      .mockReturnValueOnce(2000) // sample 2: t0
      .mockReturnValueOnce(2100) // sample 2: t1
      .mockReturnValueOnce(3000) // sample 3: t0
      .mockReturnValueOnce(3300); // sample 3: t1

    mockSetDoc.mockResolvedValue(undefined);
    mockGetDoc
      .mockResolvedValueOnce(fakeSnapshot(5100)) // offset = 5100 - 1100 = 4000
      .mockResolvedValueOnce(fakeSnapshot(6000)) // offset = 6000 - 2050 = 3950
      .mockResolvedValueOnce(fakeSnapshot(7200)); // offset = 7200 - 3150 = 4050

    const offset = await estimateServerClockOffset();

    // median([4000, 3950, 4050]) = 4000
    expect(offset).toBe(4000);
    expect(mockSetDoc).toHaveBeenCalledTimes(3);
    expect(mockGetDoc).toHaveBeenCalledTimes(3);
    // Alle tre målingene skal skrive til samme klient-dokument.
    const docIds = mockDoc.mock.calls.map((call) => call[2]);
    expect(new Set(docIds).size).toBe(1);
    expect(mockDoc.mock.calls[0][1]).toBe('clock_sync');
  });

  it('returnerer 0 og advarer ved feil, uten å kaste', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockSetDoc.mockRejectedValue(new Error('offline'));

    await expect(estimateServerClockOffset()).resolves.toBe(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('senere kall bruker cachen uten nye målinger', async () => {
    mockSetDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue(fakeSnapshot(10_000));

    const first = await estimateServerClockOffset();
    expect(mockSetDoc).toHaveBeenCalledTimes(3);

    mockSetDoc.mockClear();
    mockGetDoc.mockClear();

    const second = await estimateServerClockOffset();
    expect(second).toBe(first);
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('force: true måler på nytt selv om cache er satt', async () => {
    mockSetDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue(fakeSnapshot(10_000));

    await estimateServerClockOffset();
    mockSetDoc.mockClear();
    mockGetDoc.mockClear();

    await estimateServerClockOffset(3, true);
    expect(mockSetDoc).toHaveBeenCalledTimes(3);
    expect(mockGetDoc).toHaveBeenCalledTimes(3);
  });
});

describe('getServerNow', () => {
  beforeEach(() => {
    __resetClockSyncCacheForTest();
    vi.restoreAllMocks();
  });

  it('returnerer Date.now() uendret når offset ikke er målt', () => {
    vi.spyOn(Date, 'now').mockReturnValue(50_000);
    expect(getServerNow()).toBe(50_000);
  });

  it('legger til cachet offset når den er satt', async () => {
    mockSetDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue(fakeSnapshot(10_000));
    await estimateServerClockOffset();

    vi.spyOn(Date, 'now').mockReturnValue(50_000);
    expect(getServerNow()).not.toBe(50_000);
  });
});
