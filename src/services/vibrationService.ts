// Vibration Service
// Gir haptisk tilbakemelding på støttede enheter (primært Android Chrome).
// Feiler stille uten feilmeldinger på iOS Safari der API-et ikke støttes.

class VibrationService {
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  private vibrate(pattern: number | number[], enabled = true) {
    if (!enabled || !this.isSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignorer feil
    }
  }

  public countdown(enabled = true) {
    this.vibrate(80, enabled);
  }

  public workStart(enabled = true) {
    this.vibrate([150, 60, 200], enabled);
  }

  public restStart(enabled = true) {
    this.vibrate([200], enabled);
  }

  public workoutComplete(enabled = true) {
    this.vibrate([100, 80, 100, 80, 400], enabled);
  }
}

export const vibrationService = new VibrationService();
