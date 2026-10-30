/**
 * Tests for the chapter share link (story S1-E4-05, second criterion and the no-tracking rule).
 */
import { describe, expect, it } from 'vitest';

import { chapterShareLink, printedLink } from './shareLink';

describe('chapterShareLink', () => {
  it("is the chapter's public address and nothing else", () => {
    const link = chapterShareLink(
      { storySlug: 'ploaia', chapterCode: 'abcd1234' },
      'https://example.org/',
    );
    expect(link).toBe('https://example.org/s/ploaia/abcd1234');
  });

  it('carries no query string, so no sharer ID and no tracking parameter', () => {
    const link = new URL(chapterShareLink({ storySlug: 'ploaia', chapterCode: 'abcd1234' }));
    expect(link.search).toBe('');
    expect(link.hash).toBe('');
  });

  it('escapes anything odd in the address', () => {
    expect(chapterShareLink({ storySlug: 'a b', chapterCode: 'c?d' }, 'https://example.org')).toBe(
      'https://example.org/s/a%20b/c%3Fd',
    );
  });

  it('prints without the scheme on the card', () => {
    expect(printedLink('https://example.org/s/a/b')).toBe('example.org/s/a/b');
  });
});
