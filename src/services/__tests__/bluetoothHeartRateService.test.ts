import { describe, it, expect, beforeEach } from 'vitest';
import { bluetoothHeartRateService } from '../bluetoothHeartRateService';

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
