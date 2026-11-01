/**
 * Tests for the chapter share link (story S1-E4-05, second criterion and the no-tracking rule)
 * and the whole story's link (IDEAS-1c).
 */
import { describe, expect, it } from 'vitest';

import { chapterShareLink, passageShareLink, printedLink, storyShareLink } from './shareLink';

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

describe('passageShareLink (S1-E4-11)', () => {
  it('adds only the spot: which blocks, nothing about who shared', () => {
    const address = { storySlug: 'ploaia', chapterCode: 'abcd1234' };
    expect(passageShareLink(address, { first: 3, last: 5 }, 'https://example.org')).toBe(
      'https://example.org/s/ploaia/abcd1234/p3-5',
    );
    const link = new URL(passageShareLink(address, { first: 2, last: 2 }));
    expect(link.search).toBe('');
    expect(link.pathname.endsWith('/abcd1234/p2')).toBe(true);
  });
});

describe('storyShareLink', () => {
  it("is the story page's public address and nothing else", () => {
    expect(storyShareLink('ploaia', 'https://example.org/')).toBe('https://example.org/s/ploaia');
  });

  it('carries no query string, so no sharer ID and no tracking parameter', () => {
    const link = new URL(storyShareLink('ploaia'));
    expect(link.search).toBe('');
    expect(link.hash).toBe('');
  });
});
