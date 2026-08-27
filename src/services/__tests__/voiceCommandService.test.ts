import { describe, it, expect } from 'vitest';
import { voiceCommandService } from '../voiceCommandService';

describe('voiceCommandService', () => {
  it('tolker norske pause-kommandoer riktig', () => {
    expect(voiceCommandService.parseCommand('kan du ta en pause')).toBe('pause');
    expect(voiceCommandService.parseCommand('stopp')).toBe('pause');
    expect(voiceCommandService.parseCommand('vent litt')).toBe('pause');
  });

  it('tolker norske fortsett- og start-kommandoer riktig', () => {
    expect(voiceCommandService.parseCommand('fortsett')).toBe('resume');
    expect(voiceCommandService.parseCommand('kjør på')).toBe('resume');
    expect(voiceCommandService.parseCommand('start')).toBe('resume');
  });

  it('tolker neste- og hopp over-kommandoer', () => {
    expect(voiceCommandService.parseCommand('neste øvelse')).toBe('next');
    expect(voiceCommandService.parseCommand('hopp over')).toBe('next');
    expect(voiceCommandService.parseCommand('skip')).toBe('next');
  });

  it('tolker engelske kommandoer', () => {
    expect(voiceCommandService.parseCommand('pause timer')).toBe('pause');
    expect(voiceCommandService.parseCommand('next exercise')).toBe('next');
    expect(voiceCommandService.parseCommand('resume')).toBe('resume');
  });
});
