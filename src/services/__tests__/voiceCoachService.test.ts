import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceCoachEngine } from '../voiceCoachService';

describe('voiceCoachService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fyrer av start-melding ved sekund 0', () => {
    let subtitle = '';
    const engine = new VoiceCoachEngine({ totalSeconds: 60, tone: 'rolig' }, (t) => (subtitle = t));

    engine.tick(0, 60);
    expect(subtitle.length).toBeGreaterThan(0);
    expect(engine.getLastSubtitle()).toBe(subtitle);
  });

  it('fyrer av 5-1 nedtelling i de siste 5 sekundene', () => {
    const spoken: string[] = [];
    const engine = new VoiceCoachEngine({ totalSeconds: 30, tone: 'rolig' }, (t) => spoken.push(t));

    engine.tick(0, 30); // start
    spoken.length = 0;

    engine.tick(25, 5);
    expect(spoken[0]).toBe('Fem');

    engine.tick(26, 4);
    expect(spoken[1]).toBe('Fire');

    engine.tick(27, 3);
    expect(spoken[2]).toBe('Tre');

    engine.tick(28, 2);
    expect(spoken[3]).toBe('To');

    engine.tick(29, 1);
    expect(spoken[4]).toBe('En');
  });

  it('kolliderer ikke 30-sekunders melding med halvveis for en 60s økt', () => {
    const spoken: string[] = [];
    const engine = new VoiceCoachEngine({ totalSeconds: 60, tone: 'rolig' }, (t) => spoken.push(t));

    engine.tick(0, 60); // start
    spoken.length = 0;

    // Ved 30s (som er både halvveis og 30s intervall):
    // Halvveis skal vinne, og det skal kun komme ÉN melding
    engine.tick(30, 30);
    expect(spoken.length).toBe(1);
    expect(spoken[0]).toMatch(/Halvveis/i);
  });

  it('varsler ny personlig rekord i hold-modus', () => {
    const spoken: string[] = [];
    const engine = new VoiceCoachEngine(
      { totalSeconds: 0, tone: 'rolig', isHoldMode: true, personalRecordSeconds: 45 },
      (t) => spoken.push(t)
    );

    engine.tick(0, 0); // start
    spoken.length = 0;

    engine.tick(30, 0); // 30s motivasjon
    expect(spoken[0].length).toBeGreaterThan(0);

    engine.tick(46, 0); // Passert 45s PR!
    expect(spoken[1]).toMatch(/rekord/i);
  });
});
