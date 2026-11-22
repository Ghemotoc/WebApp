/**
 * Tests for recentUpdates (bundle CALM-7c): the Read page's "updated this week" count and the
 * featured story's "New chapter" state.
 */
import { describe, expect, it } from 'vitest';

import { hadChapterThisWeek, storiesUpdatedThisWeek } from './recentUpdates';

const now = new Date('2026-11-22T12:00:00Z');

describe('recentUpdates', () => {
  it('counts a chapter out six days ago as this week', () => {
    expect(hadChapterThisWeek({ lastChapterPublishedAt: '2026-11-16T12:00:00Z' }, now)).toBe(true);
  });

  it('does not count a chapter out eight days ago', () => {
    expect(hadChapterThisWeek({ lastChapterPublishedAt: '2026-11-14T12:00:00Z' }, now)).toBe(false);
  });

  it('does not count a story with no published chapter', () => {
    expect(hadChapterThisWeek({ lastChapterPublishedAt: null }, now)).toBe(false);
  });

  it('counts only the stories updated in the last seven days', () => {
    const stories = [
      { lastChapterPublishedAt: '2026-11-21T12:00:00Z' },
      { lastChapterPublishedAt: '2026-11-01T12:00:00Z' },
      { lastChapterPublishedAt: null },
      { lastChapterPublishedAt: '2026-11-20T08:00:00Z' },
    ];
    expect(storiesUpdatedThisWeek(stories, now)).toBe(2);
  });
});
