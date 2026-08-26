import { describe, it, expect, beforeEach } from 'vitest';
import { motionTrackerService } from '../motionTrackerService';

describe('MotionTrackerService (Akselerometer & Repetisjoner)', () => {
  beforeEach(() => {
    motionTrackerService.stop();
    motionTrackerService.reset();
  });

  it('starter med 0 repetisjoner og kan resettes', () => {
    expect(motionTrackerService.getCount()).toBe(0);
    motionTrackerService.reset();
    expect(motionTrackerService.getCount()).toBe(0);
  });

  it('starter og stopper sporing uten feil', () => {
    expect(() => {
      motionTrackerService.start(() => {}, 'hopp');
      motionTrackerService.stop();
    }).not.toThrow();
  });
});
