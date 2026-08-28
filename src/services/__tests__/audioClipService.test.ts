import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioClipService } from '../audioClipService';
import { audioBufferEngine } from '../audioBufferEngine';
import { speechService } from '../speechService';

// De to lydstiene (buffer-motor og HTMLAudio) må stoppe hverandre symmetrisk,
// ellers kan to stemmer overlappe i oppvarmingsvinduet der bare noen klipp
// rakk å bli dekodet.
describe('AudioClipService – symmetrisk stopp på tvers av lydstier', () => {
  let service: AudioClipService;

  beforeEach(() => {
    service = new AudioClipService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pauser aktivt HTMLAudio-element før avspilling via buffer-motoren', async () => {
    const fakeAudio = { pause: vi.fn(), currentTime: 5 };
    (service as unknown as { activeAudio: unknown }).activeAudio = fakeAudio;
    vi.spyOn(audioBufferEngine, 'playSequence').mockResolvedValue(true);

    await service.playClipOrFallback('exercise-burpees', 'Burpees');

    expect(fakeAudio.pause).toHaveBeenCalled();
    expect(fakeAudio.currentTime).toBe(0);
  });

  it('stopper buffer-motorens kjede før HTMLAudio-fallbacken spiller', async () => {
    vi.spyOn(audioBufferEngine, 'playSequence').mockResolvedValue(false);
    const engineStopSpy = vi.spyOn(audioBufferEngine, 'stop').mockImplementation(() => {});
    // jsdom kan ikke spille HTMLAudio – demp fallback-støyen, vi tester bare stopp-kallet
    vi.spyOn(speechService, 'speak').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await service.playClipOrFallback('exercise-burpees', 'Burpees');

    expect(engineStopSpy).toHaveBeenCalled();
  });
});
