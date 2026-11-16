/**
 * Tests for the remembered reading language (bundle TRANSLATE-1b).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  REMEMBERED_EDITIONS_KEY,
  readRememberedEdition,
  saveRememberedEdition,
} from './rememberedEdition';

describe('the language a reader chose for a story', () => {
  beforeEach(() => window.localStorage.clear());

  it('is null until the reader chooses one', () => {
    expect(readRememberedEdition('statia-meteo')).toBeNull();
  });

  it('is kept per story', () => {
    saveRememberedEdition('statia-meteo', 'en');
    saveRememberedEdition('another-story', 'ro');
    expect(readRememberedEdition('statia-meteo')).toBe('en');
    expect(readRememberedEdition('another-story')).toBe('ro');
  });

  it('survives something else written under its key', () => {
    window.localStorage.setItem(REMEMBERED_EDITIONS_KEY, 'not json');
    expect(readRememberedEdition('statia-meteo')).toBeNull();
    expect(saveRememberedEdition('statia-meteo', 'en')).toBe(true);
    expect(readRememberedEdition('statia-meteo')).toBe('en');
  });

  it('drops the oldest choices past 200 stories', () => {
    for (let index = 0; index < 205; index += 1) saveRememberedEdition(`story-${index}`, 'en');
    expect(readRememberedEdition('story-0')).toBeNull();
    expect(readRememberedEdition('story-204')).toBe('en');
  });
});
