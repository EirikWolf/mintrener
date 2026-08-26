export interface MotionMetrics {
  count: number;
  cadenceRpm: number; // reps / skritt per minutt
  lastPeakTime: number;
  intensity: number; // 0 to 1
}

export class MotionTrackerService {
  private isTracking: boolean = false;
  private repCount: number = 0;
  private lastPeakTime: number = 0;
  private peakTimestamps: number[] = [];
  private threshold: number = 14.5; // m/s² magnitude terskel for hopp/bøy
  private belowThreshold: boolean = true;
  private onMetricsCallback: ((metrics: MotionMetrics) => void) | null = null;

  public start(onMetrics: (metrics: MotionMetrics) => void, profile: 'hopp' | 'knebøy' | 'kadens' | 'swing' = 'hopp') {
    this.repCount = 0;
    this.lastPeakTime = 0;
    this.peakTimestamps = [];
    this.onMetricsCallback = onMetrics;
    this.belowThreshold = true;

    // Tilpass terskel basert på øvelsestype
    if (profile === 'hopp') {
      this.threshold = 15.0; // Kraftigere akselerasjon
    } else if (profile === 'kadens') {
      this.threshold = 13.0; // Rytmisk løp/kneløft
    } else {
      this.threshold = 13.5;
    }

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', this.handleMotion);
      this.isTracking = true;
    }
  }

  public stop() {
    if (this.isTracking && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleMotion);
      this.isTracking = false;
    }
  }

  public reset() {
    this.repCount = 0;
    this.lastPeakTime = 0;
    this.peakTimestamps = [];
    this.notify();
  }

  public getCount(): number {
    return this.repCount;
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    // Beregn akselerasjonsmagnitude: sqrt(x² + y² + z²)
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const now = performance.now();

    // Topp-deteksjon med debouncing (minst 350ms mellom repetisjoner)
    if (magnitude > this.threshold && this.belowThreshold && (now - this.lastPeakTime > 350)) {
      this.repCount++;
      this.lastPeakTime = now;
      this.belowThreshold = false;

      // Beregn kadens (siste 5 reps)
      this.peakTimestamps.push(now);
      if (this.peakTimestamps.length > 5) {
        this.peakTimestamps.shift();
      }

      this.notify(magnitude);
    } else if (magnitude < this.threshold * 0.85) {
      // Tilbakestill tilstand når bevegelsen er nede igjen
      this.belowThreshold = true;
    }
  };

  private notify(currentMagnitude: number = 0) {
    let cadence = 0;
    if (this.peakTimestamps.length >= 2) {
      const durationMs = this.peakTimestamps[this.peakTimestamps.length - 1] - this.peakTimestamps[0];
      if (durationMs > 0) {
        const intervalAvgSec = (durationMs / (this.peakTimestamps.length - 1)) / 1000;
        cadence = Math.round(60 / intervalAvgSec);
      }
    }

    const intensity = Math.min(1, Math.max(0, (currentMagnitude - 9.8) / 10));

    if (this.onMetricsCallback) {
      this.onMetricsCallback({
        count: this.repCount,
        cadenceRpm: cadence,
        lastPeakTime: this.lastPeakTime,
        intensity,
      });
    }
  }
}

export const motionTrackerService = new MotionTrackerService();
