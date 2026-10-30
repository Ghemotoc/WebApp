/**
 * Tests for sortEntryVersions and romaniaDateOf (story S1-E11-06).
 */
import { describe, expect, it } from 'vitest';

import type { ContentVersion } from '../api/websiteContentStore';

import { romaniaDateOf, sortEntryVersions } from './versionState';

/** A version with only the fields the sorting reads. */
function version(
  id: string,
  status: 'draft' | 'published',
  showFrom: string | null,
  isRemoval = false,
): ContentVersion {
  return {
    id,
    kind: 'question',
    entryKey: 'who-can-join',
    marketCode: 'RO',
    languageCode: 'en',
    content: {},
    status,
    isRemoval,
    showFrom,
    showUntil: null,
    publishedAt: showFrom === null ? null : `${showFrom}T08:00:00Z`,
    updatedAt: '2026-11-01T08:00:00Z',
  };
}

describe('sortEntryVersions', () => {
  it('a version dated today is live and the one before it is earlier', () => {
    const sorted = sortEntryVersions(
      [version('a', 'published', '2026-10-16'), version('b', 'published', '2026-11-02')],
      '2026-11-02',
    );
    expect(sorted.live?.id).toBe('b');
    expect(sorted.earlier.map((item) => item.id)).toEqual(['a']);
  });

  it('a version dated tomorrow is scheduled and the current one stays live', () => {
    const sorted = sortEntryVersions(
      [
        version('a', 'published', '2026-10-16'),
        version('b', 'published', '2026-11-03'),
        version('c', 'draft', null),
      ],
      '2026-11-02',
    );
    expect(sorted.live?.id).toBe('a');
    expect(sorted.scheduled?.id).toBe('b');
    expect(sorted.draft?.id).toBe('c');
  });

  it('a removal leaves nothing live', () => {
    const sorted = sortEntryVersions(
      [version('a', 'published', '2026-10-16'), version('r', 'published', '2026-11-01', true)],
      '2026-11-02',
    );
    expect(sorted.live).toBeNull();
    expect(sorted.earlier.map((item) => item.id)).toEqual(['a']);
  });
});

describe('romaniaDateOf', () => {
  it('counts the day in Romanian time, two hours ahead of UTC in winter', () => {
    expect(romaniaDateOf(new Date('2026-11-01T22:30:00Z'))).toBe('2026-11-02');
  });
});
