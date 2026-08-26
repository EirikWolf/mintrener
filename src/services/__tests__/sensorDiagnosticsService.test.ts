import { describe, it, expect } from 'vitest';
import { sensorDiagnosticsService } from '../sensorDiagnosticsService';

describe('Sensor Diagnostics Service', () => {
  it('henter en komplett liste over alle kjerne-sensorer og API-er', async () => {
    const statuses = await sensorDiagnosticsService.getSensorStatuses();
    expect(statuses.length).toBe(6);

    const ids = statuses.map((s) => s.id);
    expect(ids).toContain('web-audio');
    expect(ids).toContain('wake-lock');
    expect(ids).toContain('vibration');
    expect(ids).toContain('device-motion');
    expect(ids).toContain('web-bluetooth');
    expect(ids).toContain('geolocation');
  });

  it('hver sensorstatus inneholder nødvendig beskrivelse og status', async () => {
    const statuses = await sensorDiagnosticsService.getSensorStatuses();
    statuses.forEach((sensor) => {
      expect(sensor.name).toBeDefined();
      expect(sensor.description).toBeDefined();
      expect(['supported', 'unsupported', 'permission_required', 'active']).toContain(sensor.status);
    });
  });
});
