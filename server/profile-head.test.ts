/**
 * Tests for a profile's search and share tags (GROWTH-3; Robert, 26 Nov 2026, 15:13 UTC:
 * "Profile for adults").
 */
import { describe, expect, it } from 'vitest';

import {
  handleProfilePage,
  parseProfileAddress,
  profileHeadTags,
  type ProfileHead,
  type ProfileHeadHost,
} from './profile-head';

/** A small index.html like the one the build makes, with the product name as its title. */
const indexHtml =
  '<!doctype html><html lang="ro"><head><title>Brand</title></head><body><div id="root"></div></body></html>';

/** An adult writer who shows their profile to everyone. */
const adultHead: ProfileHead = {
  displayName: 'Lia Scrie',
  bio: 'Scriu povești cu "vreme" & ploi.',
  indexable: true,
};

/** A host that serves indexHtml and answers with the given head (or throws). */
function fakeHost(head: ProfileHead | null | Error): ProfileHeadHost {
  return {
    fetchIndexHtml: async () => new Response(indexHtml, { headers: { ETag: '"abc"' } }),
    findHead: async () => {
      if (head instanceof Error) throw head;
      return head;
    },
  };
}

/** Asks the handler for one address and reads the page and its robots header. */
async function open(path: string, head: ProfileHead | null | Error) {
  const response = await handleProfilePage(
    new Request(`https://example.test${path}?utm_source=x`),
    fakeHost(head),
  );
  return { html: await response.text(), robots: response.headers.get('X-Robots-Tag'), response };
}

describe('parseProfileAddress', () => {
  it('reads the username of a profile and of its stories and bookshelves pages', () => {
    expect(parseProfileAddress('/u/lia')).toEqual({ handle: 'lia', subPage: null });
    expect(parseProfileAddress('/u/lia/')).toEqual({ handle: 'lia', subPage: null });
    expect(parseProfileAddress('/u/%40lia')).toEqual({ handle: 'lia', subPage: null });
    expect(parseProfileAddress('/u/lia/stories')).toEqual({ handle: 'lia', subPage: 'stories' });
    expect(parseProfileAddress('/u/lia/bookshelves')).toEqual({
      handle: 'lia',
      subPage: 'bookshelves',
    });
  });

  it('leaves the library, other pages and names that can’t be usernames alone', () => {
    expect(parseProfileAddress('/u/lia/library')).toBeNull();
    expect(parseProfileAddress('/u/')).toBeNull();
    expect(parseProfileAddress('/u/a<b>')).toBeNull();
    expect(parseProfileAddress('/u/%E0%A4%A')).toBeNull();
    expect(parseProfileAddress('/s/statia-meteo')).toBeNull();
  });
});

describe('profileHeadTags', () => {
  it('a profile without an open bio has no description', () => {
    const tags = profileHeadTags(
      { ...adultHead, bio: '' },
      { url: 'https://example.test/u/lia', siteName: 'Brand' },
    );
    expect(tags).not.toContain('name="description"');
    expect(tags).toContain('<meta property="og:title" content="Lia Scrie · Brand">');
  });
});

describe('handleProfilePage', () => {
  it('an adult’s open profile gets its name, bio, canonical link and visible words, all escaped', async () => {
    const { html, robots, response } = await open('/u/lia', adultHead);
    expect(html).toContain('<title>Lia Scrie · Brand</title>');
    expect(html).toContain('<link rel="canonical" href="https://example.test/u/lia">');
    expect(html).toContain(
      '<meta name="description" content="Scriu povești cu &quot;vreme&quot; &amp; ploi.">',
    );
    expect(html).toContain(
      '<div id="root"><main><h1>Lia Scrie</h1><p>Scriu povești cu &quot;vreme&quot; &amp; ploi.</p></main></div>',
    );
    expect(html).not.toContain('noindex');
    expect(robots).toBeNull();
    expect(response.headers.get('ETag')).toBeNull();
  });

  it('a sub-page names its own address as canonical', async () => {
    const { html } = await open('/u/lia/stories', adultHead);
    expect(html).toContain('<link rel="canonical" href="https://example.test/u/lia/stories">');
  });

  it('an under-18’s or closed profile is noindex and adds no visible words', async () => {
    const { html, robots } = await open('/u/teen', {
      displayName: 'Teen',
      bio: '',
      indexable: false,
    });
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(robots).toBe('noindex');
    expect(html).toContain('<div id="root"></div>');
  });

  it('an unknown username is noindex', async () => {
    const { html, robots } = await open('/u/nobody', null);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(robots).toBe('noindex');
    expect(html).toContain('<title>Brand</title>');
  });

  it('the library page goes out unchanged', async () => {
    const { html } = await open('/u/lia/library', adultHead);
    expect(html).toBe(indexHtml);
  });

  it('when the database can’t be reached, the page still loads without tags', async () => {
    const { html, robots } = await open('/u/lia', new Error('down'));
    expect(html).toBe(indexHtml);
    expect(robots).toBeNull();
  });
});
