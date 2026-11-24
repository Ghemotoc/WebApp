/**
 * Tests for the browser's copy of remembered places (design books item 17): places come back,
 * the oldest go first past 200, and blocked storage never breaks the page.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readLocalPlace, writeLocalPlace } from './localPlaces';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('localPlaces', () => {
  it('gives back the place kept for a story, and nothing for another story', () => {
    writeLocalPlace('atlas_section', 'my-story', { section: 'storyline' });
    expect(readLocalPlace('atlas_section', 'my-story')).toEqual({ section: 'storyline' });
    expect(readLocalPlace('atlas_section', 'other-story')).toBeNull();
    expect(readLocalPlace('write_caret', 'my-story')).toBeNull();
  });

  it('keeps the newest 200 stories of a kind and drops the oldest', () => {
    for (let index = 0; index <= 200; index += 1) {
      writeLocalPlace('story_edition', `story-${String(index)}`, { languageCode: 'en' });
    }
    expect(readLocalPlace('story_edition', 'story-0')).toBeNull();
    expect(readLocalPlace('story_edition', 'story-200')).toEqual({ languageCode: 'en' });
  });

  it('starts from nothing when storage is blocked, without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeLocalPlace('write_caret', 'my-story', { position: 4 })).not.toThrow();
    expect(readLocalPlace('write_caret', 'my-story')).toBeNull();
  });

  it('ignores something stored that is not a list of places', () => {
    window.localStorage.setItem('remembered-atlas_section', '["not", "places"]');
    expect(readLocalPlace('atlas_section', 'my-story')).toBeNull();
  });
});
