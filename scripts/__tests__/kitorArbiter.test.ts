import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { acquireGpuLeaseWithRetry } from '../runFullKitorBatch';

/**
 * GPU-leasen mot kitor-arbiter.
 *
 * HENDELSEN 2026-09-01, 20:07: prøvebatchen ba om lease. Klienten fikk «fetch
 * failed» og gikk i gjenforsøk. På serveren hadde forespørselen LANDET —
 * mintrener sto oppført med en eksklusiv image-lease til 20:53, mens skriptet
 * trodde det ikke hadde noen. Ni jobber fra andre prosjekter sto i kø bak en
 * lease ingen brukte, og vi hadde ikke tokenet til å frigi den selv.
 *
 * Feilen er ikke nettverket. Feilen er at `acquire` IKKE ER IDEMPOTENT, og at
 * gjenforsøks-løkken behandlet den som om den var det. Et tapt svar er ikke det
 * samme som en avvist forespørsel: ved avslag (HTTP 409) finnes ingen lease, ved
 * tapt svar kan det gjøre det.
 *
 * Derfor: etter en NETTVERKSfeil skal klienten spørre `/status` om vi allerede
 * står oppført, og overta den leasen i stedet for å be om en til.
 */

const REQUESTER = 'mintrener';

function svar(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 409, json: async () => body, text: async () => JSON.stringify(body) };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('acquireGpuLeaseWithRetry', () => {
  it('returnerer tokenet når forespørselen går igjennom', async () => {
    fetchMock.mockResolvedValueOnce(svar({ token: 'abc123' }));
    await expect(acquireGpuLeaseWithRetry('t', 1, 3, { retryMs: 0 })).resolves.toBe('abc123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('overtar leasen vi allerede har når svaret gikk tapt', async () => {
    // Nøyaktig hendelsen: acquire kastet, men leasen ble opprettet.
    fetchMock
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(
        svar({ leases: [{ token: 'foreldreløs', requester: REQUESTER, kind: 'image' }] })
      );

    await expect(acquireGpuLeaseWithRetry('t', 1, 3, { retryMs: 0 })).resolves.toBe('foreldreløs');

    // Ingen ny acquire etter at vi fant vår egen lease.
    const acquires = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/acquire'));
    expect(acquires).toHaveLength(1);
  });

  it('tar ikke over en lease som tilhører et annet prosjekt', async () => {
    // SynthIQ holdt leasen samtidig. Å «overta» den ville stjålet GPU-en fra
    // dem midt i deres egen batch.
    fetchMock
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(svar({ leases: [{ token: 'deres', requester: 'synthiq' }] }))
      .mockResolvedValueOnce(svar({ token: 'vår' }));

    await expect(acquireGpuLeaseWithRetry('t', 1, 3, { retryMs: 0 })).resolves.toBe('vår');
  });

  it('spør ikke om egen lease når serveren svarte med et avslag', async () => {
    // Et HTTP-avslag betyr at serveren HAR svart, og at ingen lease ble laget.
    // Å slå opp status da er bare støy mot en delt tjeneste.
    fetchMock
      .mockResolvedValueOnce(svar({ error: 'busy' }, false))
      .mockResolvedValueOnce(svar({ token: 'endelig' }));

    await expect(acquireGpuLeaseWithRetry('t', 1, 3, { retryMs: 0 })).resolves.toBe('endelig');
    const statuser = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/status'));
    expect(statuser).toHaveLength(0);
  });

  it('gir opp med en feil framfor å love en lease vi ikke har', async () => {
    fetchMock.mockResolvedValue(svar({ error: 'busy' }, false));
    await expect(acquireGpuLeaseWithRetry('t', 1, 2, { retryMs: 0 })).rejects.toThrow(/reservere GPU/);
  });
});
