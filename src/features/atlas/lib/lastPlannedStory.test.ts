/**
 * Tests for which story Story Atlas opens (story S1-E17-02).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { lastPlannedStory, rememberPlannedStory, storyToOpen } from './lastPlannedStory';

describe('the story Story Atlas opens (S1-E17-02)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('opens the story the writer had open last on this device', () => {
    rememberPlannedStory('harta-din-pod');
    expect(storyToOpen(['statia-meteo', 'harta-din-pod'], lastPlannedStory())).toBe(
      'harta-din-pod',
    );
  });

  it('opens the newest story when the remembered one is gone', () => {
    expect(storyToOpen(['statia-meteo', 'harta-din-pod'], 'deleted-story')).toBe('statia-meteo');
  });

  it('opens nothing when the writer has no stories yet', () => {
    expect(storyToOpen([], null)).toBeNull();
  });

  it('still works when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => rememberPlannedStory('statia-meteo')).not.toThrow();
    expect(lastPlannedStory()).toBeNull();
  });
});
