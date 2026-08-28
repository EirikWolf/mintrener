import { describe, it, expect, beforeEach } from 'vitest';
import {
  bluetoothHeartRateService,
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
