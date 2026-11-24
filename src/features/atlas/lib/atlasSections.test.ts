/**
 * Tests for the Atlas sections list (design books item 17): links into the Atlas ask for the last
 * section, and only a real section name is ever opened from storage.
 */
import { describe, expect, it } from 'vitest';

import { atlasEntryAddress, isAtlasSection } from './atlasSections';

describe('atlasSections', () => {
  it('sends a link from outside the Atlas to the last section with ?resume', () => {
    expect(atlasEntryAddress('my-story')).toBe('/plan/s/my-story?resume');
  });

  it('accepts a section name and refuses anything else from storage', () => {
    expect(isAtlasSection('storyline')).toBe(true);
    expect(isAtlasSection('toString')).toBe(false);
    expect(isAtlasSection('../admin')).toBe(false);
    expect(isAtlasSection(3)).toBe(false);
  });
});
