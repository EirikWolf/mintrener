import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  bluetoothHeartRateService,
  BluetoothHeartRateService,
  parseHeartRateMeasurement,
  getReconnectDelayMs,
} from '../bluetoothHeartRateService';

function makeView(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}

describe('BluetoothHeartRateService (Pulsbelte & Klokke)', () => {
  beforeEach(() => {
    bluetoothHeartRateService.disconnect();
    bluetoothHeartRateService.setMaxHeartRate(190);
  });

  it('beregner korrekte pulssoner basert på maks-puls', () => {
    // Sone 1: < 60% (< 114 bpm for maks 190)
    expect(bluetoothHeartRateService.calculateZone(100).zone).toBe(1);

    // Sone 2: 60-70% (114 - 133 bpm)
    expect(bluetoothHeartRateService.calculateZone(125).zone).toBe(2);

    // Sone 3: 70-80% (133 - 152 bpm)
    expect(bluetoothHeartRateService.calculateZone(145).zone).toBe(3);

    // Sone 4: 80-90% (152 - 171 bpm)
    expect(bluetoothHeartRateService.calculateZone(160).zone).toBe(4);

    // Sone 5: >= 90% (>= 171 bpm)
    expect(bluetoothHeartRateService.calculateZone(180).zone).toBe(5);
  });

  it('håndterer justering av maks-puls', () => {
    bluetoothHeartRateService.setMaxHeartRate(200);
    // For 200 maks: 120 bpm er 60% -> Sone 2
    expect(bluetoothHeartRateService.calculateZone(120).zone).toBe(2);
  });
});

describe('parseHeartRateMeasurement (GATT 0x2A37)', () => {
  it('parser 8-bit puls uten RR-intervaller (flags 0x00)', () => {
    const view = makeView([0x00, 72]);
    expect(parseHeartRateMeasurement(view)).toEqual({ heartRate: 72, rrIntervals: [] });
  });

  it('parser 16-bit puls uten RR-intervaller (flags 0x01)', () => {
    // 300 little-endian -> [0x2C, 0x01]
    const view = makeView([0x01, 0x2c, 0x01]);
    expect(parseHeartRateMeasurement(view)).toEqual({ heartRate: 300, rrIntervals: [] });
  });

  it('parser 8-bit puls med to RR-intervaller (flags 0x10)', () => {
    // Råverdier 1024 (-> 1000 ms) og 512 (-> 500 ms), little-endian
    const view = makeView([0x10, 75, 0x00, 0x04, 0x00, 0x02]);
    expect(parseHeartRateMeasurement(view)).toEqual({ heartRate: 75, rrIntervals: [1000, 500] });
  });

  it('hopper over energifeltet før RR-intervaller parses (flags 0x18)', () => {
    // Energi Expended (2 byte, hoppes over) etterfulgt av én RR-verdi 1024 (-> 1000 ms)
    const view = makeView([0x18, 80, 0xf4, 0x01, 0x00, 0x04]);
    expect(parseHeartRateMeasurement(view)).toEqual({ heartRate: 80, rrIntervals: [1000] });
  });

  it('kombinerer 16-bit puls, energifelt og RR-intervall der offsettene bygger på hverandre (flags 0x19)', () => {
    // 16-bit HR 300 (-> [0x2C, 0x01]), energifelt 500 (hoppes over, -> [0xF4, 0x01]),
    // deretter én RR-verdi 1024 (-> 1000 ms). Offset for RR må hoppe over BÅDE det brede
    // HR-feltet OG energifeltet for å lande riktig.
    const view = makeView([0x19, 0x2c, 0x01, 0xf4, 0x01, 0x00, 0x04]);
    expect(parseHeartRateMeasurement(view)).toEqual({ heartRate: 300, rrIntervals: [1000] });
  });
});

describe('getReconnectDelayMs (eksponentiell backoff)', () => {
  it('følger skjemaet 1000, 2000, 4000, 8000, 16000 for forsøk 0-4', () => {
    expect(getReconnectDelayMs(0)).toBe(1000);
    expect(getReconnectDelayMs(1)).toBe(2000);
    expect(getReconnectDelayMs(2)).toBe(4000);
    expect(getReconnectDelayMs(3)).toBe(8000);
    expect(getReconnectDelayMs(4)).toBe(16000);
  });

  it('gir opp (null) fra forsøk 5 og for negative forsøk', () => {
    expect(getReconnectDelayMs(5)).toBeNull();
    expect(getReconnectDelayMs(6)).toBeNull();
    expect(getReconnectDelayMs(-1)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Reconnect-tilstandsmaskinen (gattserverdisconnected -> backoff -> forsøk).
// Stubber navigator.bluetooth med minimale, strukturelt kompatible fakes -
// den faktiske Web Bluetooth-flyten er hardware-avhengig og ikke målet her.
// ---------------------------------------------------------------------------

interface FakeCharacteristic {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  startNotifications: () => Promise<FakeCharacteristic>;
  stopNotifications: () => Promise<FakeCharacteristic>;
}

function createFakeCharacteristic(): FakeCharacteristic {
  const characteristic: FakeCharacteristic = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    startNotifications: () => Promise.resolve(characteristic),
    stopNotifications: () => Promise.resolve(characteristic),
  };
  return characteristic;
}

interface FakeGattServer {
  connected: boolean;
  connect: () => Promise<FakeGattServer>;
  disconnect: ReturnType<typeof vi.fn>;
  getPrimaryService: ReturnType<typeof vi.fn>;
}

/** Standard-oppsett: alle GATT-kall lykkes. Enkeltmetoder overstyres per test ved behov. */
function createFakeGatt(): FakeGattServer {
  const gatt = {} as FakeGattServer;
  gatt.connected = false;
  gatt.connect = vi.fn(async () => {
    gatt.connected = true;
    return gatt;
  });
  gatt.disconnect = vi.fn(() => {
    gatt.connected = false;
  });
  gatt.getPrimaryService = vi.fn(async () => ({
    getCharacteristic: vi.fn(async () => createFakeCharacteristic()),
  }));
  return gatt;
}

type FakeListener = (event: Event) => void;

interface FakeBluetoothDevice {
  name?: string;
  gatt: FakeGattServer;
  addEventListener: (type: string, listener: FakeListener) => void;
  removeEventListener: (type: string, listener: FakeListener) => void;
}

function createFakeDevice(gatt: FakeGattServer): {
  device: FakeBluetoothDevice;
  fireDisconnected: () => void;
} {
  const listeners: Record<string, FakeListener[]> = {};
  const device: FakeBluetoothDevice = {
    name: 'Stub HRM',
    gatt,
    addEventListener: (type, listener) => {
      (listeners[type] ??= []).push(listener);
    },
    removeEventListener: (type, listener) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
    },
  };
  const fireDisconnected = () => {
    (listeners['gattserverdisconnected'] ?? []).forEach((listener) => listener({} as Event));
  };
  return { device, fireDisconnected };
}

function stubBluetoothNavigator(requestDevice: () => Promise<FakeBluetoothDevice>) {
  (navigator as unknown as { bluetooth: { requestDevice: () => Promise<FakeBluetoothDevice> } }).bluetooth = {
    requestDevice,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('BLE reconnect-tilstandsmaskin (fake timers)', () => {
  let service: BluetoothHeartRateService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new BluetoothHeartRateService();
  });

  afterEach(() => {
    service.disconnect();
    vi.useRealTimers();
    delete (navigator as unknown as { bluetooth?: unknown }).bluetooth;
  });

  it('følger backoff-skjemaet 1000/2000/4000/8000/16000 ved gjentatte feil og gir opp med nøyaktig én onDisconnect', async () => {
    const gatt = createFakeGatt();
    let connectCallCount = 0;
    gatt.connect = vi.fn(async () => {
      connectCallCount += 1;
      if (connectCallCount === 1) {
        gatt.connected = true;
        return gatt; // Første (opprinnelige) tilkobling lykkes
      }
      throw new Error('reconnect feilet'); // Alle reconnect-forsøk etter uventet drop feiler
    });
    const { device, fireDisconnected } = createFakeDevice(gatt);
    stubBluetoothNavigator(async () => device);

    const onData = vi.fn();
    const onDisconnect = vi.fn();
    const onReconnecting = vi.fn();

    const ok = await service.connect(onData, onDisconnect, onReconnecting);
    expect(ok).toBe(true);

    fireDisconnected(); // Beltet mister kontakt uventet

    for (const delay of [1000, 2000, 4000, 8000, 16000]) {
      await vi.advanceTimersByTimeAsync(delay);
    }

    expect(onReconnecting.mock.calls.map((call) => call[0])).toEqual([0, 1, 2, 3, 4]);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('nullstiller telleren ved vellykket reconnect, så neste drop starter på 1000 ms igjen', async () => {
    const gatt = createFakeGatt(); // gatt.connect() lykkes alltid i denne testen
    const { device, fireDisconnected } = createFakeDevice(gatt);
    stubBluetoothNavigator(async () => device);

    const onReconnecting = vi.fn();
    await service.connect(vi.fn(), vi.fn(), onReconnecting);

    fireDisconnected();
    await vi.advanceTimersByTimeAsync(1000); // Forsøk 0 (1000 ms) - lykkes, telleren nullstilles

    fireDisconnected(); // Ny uventet drop etter en vellykket reconnect
    await vi.advanceTimersByTimeAsync(1000); // Skal igjen planlegges som forsøk 0 (1000 ms)

    expect(onReconnecting.mock.calls.map((call) => call[0])).toEqual([0, 0]);
  });

  it('manuell disconnect midt i et pågående reconnect-forsøk hindrer re-abonnering og videre databehandling', async () => {
    const gatt = createFakeGatt(); // Første tilkobling skal lykkes normalt
    const { device, fireDisconnected } = createFakeDevice(gatt);
    stubBluetoothNavigator(async () => device);

    const onData = vi.fn();
    const onDisconnect = vi.fn();
    await service.connect(onData, onDisconnect);
    gatt.getPrimaryService.mockClear(); // Nullstill: kun re-abonnering under reconnect-forsøket teller

    // Bytt gatt.connect til å henge først NÅ, slik at det er reconnect-forsøket (ikke den
    // opprinnelige tilkoblingen) som blir stående i flight når vi kobler fra manuelt under.
    const deferred = createDeferred<FakeGattServer>();
    gatt.connect = vi.fn(() => deferred.promise);

    fireDisconnected();
    await vi.advanceTimersByTimeAsync(1000); // Trigger tryReconnect - nå hengende på deferred.promise

    service.disconnect(); // Brukeren kobler fra manuelt mens gatt.connect() fortsatt er i flight
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(service.isConnected()).toBe(false);

    // Det forsinkede reconnect-forsøket lykkes FØRST NÅ, etter den manuelle frakoblingen
    gatt.connected = true;
    deferred.resolve(gatt);
    await vi.advanceTimersByTimeAsync(0); // Flush microtasks/kjeden i tryReconnect

    expect(gatt.disconnect).toHaveBeenCalled(); // Den ferske koblingen skal rives fysisk ned igjen
    expect(gatt.getPrimaryService).not.toHaveBeenCalled(); // Ingen re-abonnering skal starte
    expect(onData).not.toHaveBeenCalled();
    expect(onDisconnect).toHaveBeenCalledTimes(1); // Ikke kalt på nytt
    expect(service.isConnected()).toBe(false);
  });
});
