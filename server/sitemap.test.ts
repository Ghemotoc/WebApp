/**
 * Tests for the sitemap and the robots file (story S1-E11-38; bundle SEO-1c).
 */
import { describe, expect, it } from 'vitest';

import {
  handleSitemapFiles,
  isPreviewHost,
  robotsTxt,
  sitemapXml,
  type SitemapEntry,
} from './sitemap';

/** A few addresses as sitemap_entries() answers them. */
const entries: SitemapEntry[] = [
  { path: '/', changed_on: '2026-11-11' },
  { path: '/help', changed_on: null },
  { path: '/s/statia-meteo', changed_on: '2026-11-02' },
];

describe('sitemapXml', () => {
  it('lists every address on the request’s own origin, with the day it changed when known', () => {
    const xml = sitemapXml(entries, 'https://example.test');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(
      '<url><loc>https://example.test/</loc><lastmod>2026-11-11</lastmod></url>',
    );
    expect(xml).toContain('<url><loc>https://example.test/help</loc></url>');
    expect(xml).toContain('<loc>https://example.test/s/statia-meteo</loc>');
  });

  it('escapes what XML can’t hold as it is', () => {
    expect(sitemapXml([{ path: '/c/a&b', changed_on: null }], 'https://example.test')).toContain(
      '<loc>https://example.test/c/a&amp;b</loc>',
    );
  });
});

/** The lines of one group: from the line naming the crawler to the next blank line. */
function groupFor(text: string, crawler: string): string[] {
  const groups = text.split('\n\n').map((group) => group.split('\n'));
  return groups.find((lines) => lines.includes(`User-agent: ${crawler}`)) ?? [];
}

describe('robotsTxt', () => {
  it('keeps crawlers out of private screens and points to the sitemap', () => {
    const text = robotsTxt('https://example.test', 'example.test');
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Disallow: /staff');
    expect(text).toContain('Disallow: /write');
    expect(text).toContain('Disallow: /settings');
    expect(text).toContain('Sitemap: https://example.test/sitemap.xml');
  });

  it('lets search engines read stories, chapters and a public reading list (GROWTH-3 and 4)', () => {
    const general = groupFor(robotsTxt('https://example.test', 'example.test'), '*');
    expect(general).not.toContain('Disallow: /s/');
    expect(general).not.toContain('Disallow: /s/*/');
    expect(general).toContain('Allow: /library/lists/');
    expect(general).toContain('Disallow: /library');
    expect(general).toContain('Disallow: /spaces/*/settings');
    expect(general).not.toContain('Disallow: /forums');
  });

  it('lets AI crawlers read story pages, Discover and the forums, and nothing else (GROWTH-4)', () => {
    const text = robotsTxt('https://example.test', 'example.test');
    for (const crawler of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot']) {
      const group = groupFor(text, crawler);
      expect(group).toContain('Allow: /s/');
      expect(group).toContain('Disallow: /s/*/');
      expect(group).toContain('Allow: /discover');
      expect(group).toContain('Allow: /forums');
      expect(group).toContain('Allow: /spaces/');
      expect(group).toContain('Disallow: /staff');
      expect(group).toContain('Disallow: /spaces/new');
      expect(group.at(-1)).toBe('Disallow: /');
    }
  });

  it('keeps every crawler out of a pull request’s preview copy', () => {
    expect(isPreviewHost('abc123.project.pages.dev')).toBe(true);
    expect(isPreviewHost('project.pages.dev')).toBe(false);
    expect(robotsTxt('https://abc123.project.pages.dev', 'abc123.project.pages.dev')).toBe(
      'User-agent: *\nDisallow: /\n',
    );
  });
});

describe('handleSitemapFiles', () => {
  it('answers /sitemap.xml as XML from the database', async () => {
    const response = await handleSitemapFiles(new Request('https://example.test/sitemap.xml'), {
      findEntries: async () => entries,
    });
    expect(response?.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(await response?.text()).toContain('<loc>https://example.test/s/statia-meteo</loc>');
  });

  it('asks crawlers to come back later when the database can’t be reached', async () => {
    const response = await handleSitemapFiles(new Request('https://example.test/sitemap.xml'), {
      findEntries: async () => {
        throw new Error('offline');
      },
    });
    expect(response?.status).toBe(503);
    expect(response?.headers.get('Retry-After')).toBe('3600');
  });

  it("opens each classic's chapters to AI crawlers, found from the sitemap (GROWTH-4)", async () => {
    const response = await handleSitemapFiles(new Request('https://example.test/robots.txt'), {
      findEntries: async () => [
        { path: '/s/amintiri-din-copilarie', changed_on: null },
        { path: '/s/amintiri-din-copilarie/ab12cd34', changed_on: null },
        { path: '/s/amintiri-din-copilarie/ef56gh78', changed_on: null },
        { path: '/s/statia-meteo', changed_on: null },
      ],
    });
    const group = groupFor((await response?.text()) ?? '', 'GPTBot');
    expect(group.filter((line) => line === 'Allow: /s/amintiri-din-copilarie/')).toHaveLength(1);
    expect(group).not.toContain('Allow: /s/statia-meteo/');
  });

  it("still answers /robots.txt when the database can't be reached", async () => {
    const response = await handleSitemapFiles(new Request('https://example.test/robots.txt'), {
      findEntries: async () => {
        throw new Error('not needed');
      },
    });
    expect(response?.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(await response?.text()).toContain('Sitemap: https://example.test/sitemap.xml');
  });

  it('lists nothing on a preview copy and leaves other addresses alone', async () => {
    const preview = await handleSitemapFiles(
      new Request('https://abc.project.pages.dev/sitemap.xml'),
      { findEntries: async () => entries },
    );
    expect(await preview?.text()).not.toContain('<url>');
    const other = await handleSitemapFiles(new Request('https://example.test/discover'), {
      findEntries: async () => entries,
    });
    expect(other).toBeNull();
  });
});
