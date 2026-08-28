// Vibration Service
// Gir haptisk tilbakemelding på støttede enheter (primært Android Chrome).
// Feiler stille uten feilmeldinger på iOS Safari der API-et ikke støttes.

/**
 * Semantisk haptikk-tabell: samler alle vibrasjonsmønstre ett sted, slik at
 * hver hendelse kan skilles fra de andre kun ved følelsen på håndleddet.
 * Viktig for kontor-profilen (lyd av) der vibrasjon er eneste signalkanal.
 *
 * - countdown: kort tikk (30 ms). Tidligere 80 ms, som var for likt
 *   restStart til å skilles fra hverandre uten å se på skjermen.
 * - workStart: ett fast, tydelig støt – markerer at arbeid starter nå.
 * - restStart: dobbel myk puls – klart adskilt fra workStart sitt enkeltstøt.
 * - workoutComplete: uendret fanfare.
 */
export const HAPTIC_PATTERNS: Record<
  'countdown' | 'workStart' | 'restStart' | 'workoutComplete',
  readonly number[]
> = {
  countdown: [30],
  workStart: [80],
  restStart: [40, 60, 40],
  workoutComplete: [100, 80, 100, 80, 400],
};

class VibrationService {
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  private vibrate(pattern: readonly number[], enabled = true) {
    if (!enabled || !this.isSupported()) return;
    try {
      navigator.vibrate(pattern as number[]);
    } catch {
      // Ignorer feil
    }
  }

  public countdown(enabled = true) {
    this.vibrate(HAPTIC_PATTERNS.countdown, enabled);
  }

  public workStart(enabled = true) {
    this.vibrate(HAPTIC_PATTERNS.workStart, enabled);
  }

  public restStart(enabled = true) {
    this.vibrate(HAPTIC_PATTERNS.restStart, enabled);
  }

  public workoutComplete(enabled = true) {
    this.vibrate(HAPTIC_PATTERNS.workoutComplete, enabled);
  }
}

export const vibrationService = new VibrationService();
