import { describe, it, expect } from 'vitest';
import { calculateOneRepMax } from '../strengthLogService';
import { calculateDistanceMeters, formatPace, generateGpxString } from '../gpsTrackingService';
import { generateRoomCode } from '../groupRoomService';

describe('P2 Spesifikasjon og Utvidelser', () => {
  describe('Strength Log Service (1RM Beregning)', () => {
    it('beregner 1RM korrekt med Epley formel', () => {
      // 100kg x 10 reps = 100 * (1 + 10/30) = 133.3 kg
      const orm = calculateOneRepMax(100, 10);
      expect(orm).toBe(133.3);
    });

    it('returnerer samme vekt ved 1 rep', () => {
      expect(calculateOneRepMax(80, 1)).toBe(80);
    });
  });

  describe('GPS Tracking Service', () => {
    it('beregner avstand mellom to GPS koordinater', () => {
      // Oslo S (59.9110, 10.7528) til Stortinget (59.9133, 10.7400) ~ 750m
      const dist = calculateDistanceMeters(59.9110, 10.7528, 59.9133, 10.7400);
      expect(dist).toBeGreaterThan(600);
      expect(dist).toBeLessThan(900);
    });

    it('formaterer tempo (min/km) riktig', () => {
      // 3.33 m/s = 12 km/t = 5:00 min/km
      const pace = formatPace(3.333);
      expect(pace).toBe('5:00 /km');
    });

    it('genererer gyldig GPX XML', () => {
      const gpx = generateGpxString({
        id: 'test-gps',
        activityType: 'lop',
        startTime: Date.now() - 60000,
        endTime: Date.now(),
        totalDistanceMeters: 1000,
        elapsedSeconds: 300,
        averageSpeedKmh: 12,
        currentPaceMinKm: '5:00 /km',
        points: [
          { latitude: 59.91, longitude: 10.75, timestamp: Date.now() - 60000 },
          { latitude: 59.92, longitude: 10.76, timestamp: Date.now() },
        ],
      });
      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpx).toContain('<gpx version="1.1"');
      expect(gpx).toContain('<trkpt lat="59.91" lon="10.75">');
    });
  });

  describe('Group Room Service', () => {
    it('genererer 6-tegns alfanumerisk romkode', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[2-9A-Z]{6}$/);
    });
  });
});
