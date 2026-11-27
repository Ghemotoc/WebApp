/**
 * Tests for a space's search rule (GROWTH-4; Robert, 26 Nov 2026, 19:48 UTC: "Private spaces and
 * classes are not indexable and uncrawlable. But fully public spaces can be crawlable and
 * indexable").
 */
import { describe, expect, it } from 'vitest';

import { handleSpacePage, parseSpaceAddress, type SpaceHeadHost } from './space-head';

/** A small index.html like the one the build makes. */
const indexHtml =
  '<!doctype html><html lang="ro"><head><title>Brand</title></head><body><div id="root"></div></body></html>';

/** A host that serves indexHtml and answers whether the space is public (or throws). */
function fakeHost(answer: boolean | Error, asked: string[] = []): SpaceHeadHost {
  return {
    fetchIndexHtml: async () => new Response(indexHtml, { headers: { ETag: '"abc"' } }),
    isSearchable: async (spaceSlug) => {
      asked.push(spaceSlug);
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

/** Asks the handler for one address and reads the page and its robots header. */
async function open(path: string, answer: boolean | Error, asked: string[] = []) {
  const response = await handleSpacePage(
    new Request(`https://example.test${path}`),
    fakeHost(answer, asked),
  );
  return { html: await response.text(), robots: response.headers.get('X-Robots-Tag') };
}

describe('parseSpaceAddress', () => {
  it('finds the space of its page, its tools and its threads', () => {
    expect(parseSpaceAddress('/spaces/cercul-fanteziei')).toBe('cercul-fanteziei');
    expect(parseSpaceAddress('/spaces/cercul-fanteziei/settings')).toBe('cercul-fanteziei');
    expect(parseSpaceAddress('/forums/space-cercul-fanteziei/12')).toBe('cercul-fanteziei');
  });

  it('leaves out the staff forums, the spaces list and "Start a space"', () => {
    expect(parseSpaceAddress('/forums/first-chapters/12')).toBeNull();
    expect(parseSpaceAddress('/forums')).toBeNull();
    expect(parseSpaceAddress('/spaces')).toBeNull();
    expect(parseSpaceAddress('/spaces/new')).toBeNull();
    expect(parseSpaceAddress('/spaces/<script>')).toBeNull();
  });
});

describe('handleSpacePage', () => {
  it('lets search engines list a fully public space and its threads', async () => {
    const asked: string[] = [];
    const page = await open('/forums/space-cercul/3', true, asked);
    expect(asked).toEqual(['cercul']);
    expect(page.html).not.toContain('noindex');
    expect(page.robots).toBeNull();
  });

  it('keeps a class, a private space or one for under-16s out of search engines', async () => {
    const page = await open('/spaces/clasa-a-noua', false);
    expect(page.html).toContain('<meta name="robots" content="noindex">');
    expect(page.robots).toBe('noindex');
  });

  it('keeps the space out when the database can’t be reached, as the safe side', async () => {
    const page = await open('/spaces/cercul', new Error('offline'));
    expect(page.html).toContain('<meta name="robots" content="noindex">');
    expect(page.robots).toBe('noindex');
  });

  it('sends a staff forum’s thread unchanged, without asking the database', async () => {
    const asked: string[] = [];
    const page = await open('/forums/first-chapters/12', false, asked);
    expect(asked).toEqual([]);
    expect(page.html).toBe(indexHtml);
    expect(page.robots).toBeNull();
  });
});
