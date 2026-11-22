/**
 * Tests for the story page's small counts (bundle CALM-7c; board New-Story).
 */
import { describe, expect, it } from 'vitest';

import type { StoryPageChapter, StoryPageData } from '../api/storyPage';

import { isNewChapter, publishedWordTotal } from './storyPageNumbers';

/** A published chapter, changed as a test needs. */
function chapterWith(changes: Partial<StoryPageChapter>): StoryPageChapter {
  return {
    code: 'c1',
    number: 1,
    title: 'Fifteen',
    status: 'published',
    publishedAt: '2026-11-20T10:00:00Z',
    editedAt: null,
    wordCount: 1200,
    isTranslated: true,
    ...changes,
  } as StoryPageChapter;
}

describe('publishedWordTotal', () => {
  it('adds up the words of the published chapters only', () => {
    const story = {
      chapters: [chapterWith({}), chapterWith({ code: 'c2', status: 'draft', wordCount: 900 })],
    } as StoryPageData;
    expect(publishedWordTotal(story)).toBe(1200);
  });

  it('gives no total when a published chapter has no count, so it is never too small', () => {
    const story = {
      chapters: [chapterWith({}), chapterWith({ wordCount: null })],
    } as StoryPageData;
    expect(publishedWordTotal(story)).toBeNull();
  });
});

describe('isNewChapter', () => {
  const now = new Date('2026-11-22T10:00:00Z');

  it('calls a chapter new for a week after it went out', () => {
    expect(isNewChapter(chapterWith({ publishedAt: '2026-11-16T11:00:00Z' }), now)).toBe(true);
    expect(isNewChapter(chapterWith({ publishedAt: '2026-11-15T09:00:00Z' }), now)).toBe(false);
  });

  it('never calls a draft or a scheduled chapter new', () => {
    expect(isNewChapter(chapterWith({ status: 'scheduled' }), now)).toBe(false);
  });
});
