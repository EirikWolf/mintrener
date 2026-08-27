import { describe, it, expect } from 'vitest';
import {
  calculateMaxHeartRate,
  getHeartRateZone,
  isPulseRecovered,
} from '../heartRateZoneService';

describe('heartRateZoneService', () => {
  it('beregner makspuls etter Tanakas formel', () => {
    // 208 - (0.7 * 40) = 208 - 28 = 180
    const maxHr = calculateMaxHeartRate(40);
    expect(maxHr).toBe(180);
  });

  it('plasserer puls i riktig sone for en person med 190 i makspuls', () => {
    // Sone 1: 95 - 113 bpm
    // Sone 2: 114 - 132 bpm
    // Sone 3: 133 - 151 bpm
    // Sone 4: 152 - 170 bpm
    // Sone 5: 171 - 190 bpm
    expect(getHeartRateZone(100, 190).zone).toBe(1);
    expect(getHeartRateZone(125, 190).zone).toBe(2);
    expect(getHeartRateZone(145, 190).zone).toBe(3);
    expect(getHeartRateZone(165, 190).zone).toBe(4);
    expect(getHeartRateZone(180, 190).zone).toBe(5);
  });

  it('sjekker om pulsen er restituert til ønsket sone', () => {
    expect(isPulseRecovered(120, 2, 190)).toBe(true); // 120 bpm er i sone 2
    expect(isPulseRecovered(160, 2, 190)).toBe(false); // 160 bpm er i sone 4
  });
});
