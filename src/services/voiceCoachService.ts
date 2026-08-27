import { VoiceTone } from '../schemas/profileSchema';
import { getVoiceLine, VOICE_LINES } from '../data/voiceLines';
import { speakMessage } from './speechService';

export interface VoiceEventPlan {
  totalSeconds: number;
  tone: VoiceTone;
  isHoldMode?: boolean;
  personalRecordSeconds?: number;
}

export class VoiceCoachEngine {
  private tone: VoiceTone;
  private totalSeconds: number;
  private isHoldMode: boolean;
  private personalRecordSeconds: number;
  private firedMilestones = new Set<string>();
  private speechEnabled: boolean = true;
  private lastSpokenSubtitle: string = '';
  private onSubtitleCallback?: (text: string) => void;

  constructor(plan: VoiceEventPlan, onSubtitle?: (text: string) => void) {
    this.tone = plan.tone;
    this.totalSeconds = plan.totalSeconds;
    this.isHoldMode = !!plan.isHoldMode;
    this.personalRecordSeconds = plan.personalRecordSeconds || 0;
    this.onSubtitleCallback = onSubtitle;
  }

  public setSpeechEnabled(enabled: boolean) {
    this.speechEnabled = enabled;
  }

  public setTone(tone: VoiceTone) {
    this.tone = tone;
  }

  public reset() {
    this.firedMilestones.clear();
    this.lastSpokenSubtitle = '';
  }

  public getLastSubtitle(): string {
    return this.lastSpokenSubtitle;
  }

  private speak(text: string, rate: number = 1.0) {
    this.lastSpokenSubtitle = text;
    if (this.onSubtitleCallback) {
      this.onSubtitleCallback(text);
    }
    if (this.speechEnabled) {
      speakMessage(text, rate);
    }
  }

  /**
   * Kalles hvert sekund fra timer-loopen med elapsedSeconds og remainingSeconds
   */
  public tick(elapsedSeconds: number, remainingSeconds: number) {
    if (this.isHoldMode) {
      this.tickHoldMode(elapsedSeconds);
    } else {
      this.tickCountdownMode(elapsedSeconds, remainingSeconds);
    }
  }

  /**
   * Normal nedtellingsmodus
   */
  private tickCountdownMode(elapsed: number, remaining: number) {
    if (elapsed === 0 && !this.firedMilestones.has('start')) {
      this.firedMilestones.add('start');
      const line = getVoiceLine(this.tone, 'start');
      this.speak(line, 1.0);
      return;
    }

    if (remaining === 0 && !this.firedMilestones.has('finish')) {
      this.firedMilestones.add('finish');
      const line = getVoiceLine(this.tone, 'finish');
      this.speak(line, 1.0);
      return;
    }

    // 5-1 presis nedtelling (hvert sekund)
    if (remaining >= 1 && remaining <= 5) {
      const idx = 5 - remaining;
      const key = `count_${remaining}`;
      if (!this.firedMilestones.has(key)) {
        this.firedMilestones.add(key);
        const bank = VOICE_LINES[this.tone] || VOICE_LINES.rolig;
        const countWord = bank.phases.countdown5to1[idx] || String(remaining);
        this.speak(countWord, 1.1);
      }
      return;
    }

    // 10 sekunder igjen
    if (remaining === 10 && !this.firedMilestones.has('last10')) {
      this.firedMilestones.add('last10');
      const line = getVoiceLine(this.tone, 'last10');
      this.speak(line, 1.0);
      return;
    }

    // 15 sekunder igjen
    if (remaining === 15 && !this.firedMilestones.has('last15')) {
      this.firedMilestones.add('last15');
      const line = getVoiceLine(this.tone, 'last15');
      this.speak(line, 1.0);
      return;
    }

    // Halvveis (hvis ikke innenfor siste 15 sekunder)
    const halfwaySec = Math.floor(this.totalSeconds / 2);
    if (
      this.totalSeconds >= 20 &&
      elapsed === halfwaySec &&
      remaining > 15 &&
      !this.firedMilestones.has('halfway')
    ) {
      this.firedMilestones.add('halfway');
      const line = getVoiceLine(this.tone, 'halfway');
      this.speak(line, 1.0);
      return;
    }

    // Hvert 30. sekund (kun hvis det ikke kolliderer med halvveis eller siste 15 sekunder)
    if (
      elapsed > 0 &&
      elapsed % 30 === 0 &&
      remaining > 15 &&
      elapsed !== halfwaySec
    ) {
      const key = `every30_${elapsed}`;
      if (!this.firedMilestones.has(key)) {
        this.firedMilestones.add(key);
        const line = getVoiceLine(this.tone, 'every30');
        this.speak(line, 1.0);
      }
    }
  }

  /**
   * "Hold til du gir opp"-modus (teller oppover)
   */
  private tickHoldMode(elapsed: number) {
    if (elapsed === 0 && !this.firedMilestones.has('start')) {
      this.firedMilestones.add('start');
      const line = getVoiceLine(this.tone, 'start');
      this.speak(line, 1.0);
      return;
    }

    // Ny personlig rekord passert!
    if (
      this.personalRecordSeconds > 0 &&
      elapsed === this.personalRecordSeconds + 1 &&
      !this.firedMilestones.has('pb')
    ) {
      this.firedMilestones.add('pb');
      const line = getVoiceLine(this.tone, 'recordBeat');
      this.speak(line, 1.0);
      return;
    }

    // Hvert 30. sekund under opptelling
    if (elapsed > 0 && elapsed % 30 === 0) {
      const key = `every30_${elapsed}`;
      if (!this.firedMilestones.has(key)) {
        this.firedMilestones.add(key);
        const line = getVoiceLine(this.tone, 'every30');
        this.speak(line, 1.0);
      }
    }
  }
}
