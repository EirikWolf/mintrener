export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface GpsWorkoutSession {
  id: string;
  activityType: 'lop' | 'ga' | 'sykkel';
  startTime: number;
  endTime?: number;
  totalDistanceMeters: number;
  elapsedSeconds: number;
  averageSpeedKmh: number;
  currentPaceMinKm: string;
  points: GpsPoint[];
}

/**
 * Haversine formel for å beregne avstand i meter mellom to GPS-punkter
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Jordens radius i meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Konverterer hastighet i m/s til tempo-streng (f.eks. "5:20 /km")
 */
export function formatPace(speedMetersPerSec?: number | null): string {
  if (!speedMetersPerSec || speedMetersPerSec < 0.5) return '--:-- /km';
  const secPerKm = 1000 / speedMetersPerSec;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs} /km`;
}

/**
 * Genererer standard GPX 1.1 XML-streng for Strava/Garmin eksport
 */
export function generateGpxString(session: GpsWorkoutSession): string {
  const trkpts = session.points
    .map(
      (p) =>
        `      <trkpt lat="${p.latitude}" lon="${p.longitude}">
        ${p.altitude ? `<ele>${p.altitude.toFixed(1)}</ele>` : ''}
        <time>${new Date(p.timestamp).toISOString()}</time>
      </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Min Trener - mintrener.web.app" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Min Trener - ${session.activityType.toUpperCase()} (${new Date(session.startTime).toLocaleDateString('nb-NO')})</name>
    <time>${new Date(session.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${session.activityType === 'lop' ? 'Løpetur' : session.activityType === 'sykkel' ? 'Sykkeltur' : 'Gåtur'}</name>
    <type>${session.activityType === 'lop' ? 'running' : session.activityType === 'sykkel' ? 'cycling' : 'walking'}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Laster ned GPX-fil direkte i nettleseren
 */
export function downloadGpxFile(session: GpsWorkoutSession): void {
  const gpx = generateGpxString(session);
  const blob = new Blob([gpx], { type: 'application/gpx+xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mintrener-${session.activityType}-${new Date(session.startTime).toISOString().split('T')[0]}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
