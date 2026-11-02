/**
 * Tests for lib/itemAddress.ts: where each kind of Story Atlas item opens (stories S1-E17-30,
 * S1-E17-31 and S1-E17-12).
 */
import { describe, expect, it } from 'vitest';

import { itemAddress, type AtlasItemReference } from './itemAddress';

/** An item of a kind, with a reference and, for a scene, its chapter. */
const item = (kind: AtlasItemReference['kind'], ref: string, chapter: string | null = null) => ({
  kind,
  ref,
  chapter,
});

describe('itemAddress', () => {
  it('opens characters, entries and chapters on their own pages', () => {
    expect(itemAddress('farul', item('character', 'a1'))).toBe('/plan/s/farul/characters/a1');
    expect(itemAddress('farul', item('entry', 'e1'))).toBe('/plan/s/farul/world/e1');
    expect(itemAddress('farul', item('chapter', 'c1'))).toBe('/write/s/farul/c/c1');
  });

  it('opens a scene in its chapter', () => {
    expect(itemAddress('farul', item('scene', 's1', 'c2'))).toBe('/write/s/farul/c/c2');
  });

  it('opens a note with every note shown, an event on the timeline and a marketing field', () => {
    expect(itemAddress('farul', item('idea', 'i1'))).toBe(
      '/plan/s/farul/ideas?show=all#atlas-idea-i1',
    );
    expect(itemAddress('farul', item('event', 'v1'))).toBe('/plan/s/farul/storyline?view=timeline');
    expect(itemAddress('farul', item('marketing', 'query_pitch'))).toBe(
      '/plan/s/farul/marketing#atlas-marketing-query_pitch',
    );
  });
});
