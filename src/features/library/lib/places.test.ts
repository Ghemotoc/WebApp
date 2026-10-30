/**
 * Tests for the rules about a reader's place (story S1-E4-03).
 */
import { describe, expect, it } from 'vitest';

import type { StoryPlace } from '../api/library';

import {
  continueAddress,
  continueChapterNumber,
  newChapterNumber,
  placeWithinChapter,
} from './places';

/** A place in chapter 14 of 15, with chapter 15 out. */
function placeAt(percent: number, nextCode: string | null = 'chap0015'): StoryPlace {
  return {
    chapterCode: 'chap0014',
    number: 14,
    total: 15,
    percent,
    deviceKind: 'phone',
    savedAt: '2026-11-02T10:00:00Z',
    nextCode,
  };
}

describe('placeWithinChapter', () => {
  it('splits a chapter into its start, middle and end', () => {
    expect(placeWithinChapter(10)).toBe('start');
    expect(placeWithinChapter(50)).toBe('middle');
    expect(placeWithinChapter(90)).toBe('end');
  });
});

describe('continueAddress', () => {
  it('reopens the chapter a reader stopped part-way through', () => {
    expect(continueAddress('salt', placeAt(50))).toBe('/s/salt/chap0014');
    expect(continueChapterNumber(placeAt(50))).toBe(14);
  });

  it('opens the next chapter once the reader finished theirs', () => {
    expect(continueAddress('salt', placeAt(98))).toBe('/s/salt/chap0015');
    expect(continueChapterNumber(placeAt(98))).toBe(15);
  });

  it('stays on the last chapter when no newer one is out', () => {
    expect(continueAddress('salt', placeAt(98, null))).toBe('/s/salt/chap0014');
  });
});

describe('newChapterNumber', () => {
  it('names the chapter that came out after the one the reader finished', () => {
    expect(newChapterNumber(placeAt(100))).toBe(15);
    expect(newChapterNumber(placeAt(40))).toBeNull();
    expect(newChapterNumber(placeAt(100, null))).toBeNull();
  });
});
