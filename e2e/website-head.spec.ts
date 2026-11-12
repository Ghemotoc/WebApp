/**
 * End-to-end tests for the website pages' search and share tags (story S1-E11-37; bundle SEO-1b).
 * What a search engine or a share bot reads before any JavaScript runs: the home page's and a help
 * page's description, canonical link and Open Graph title, noindex on an unknown help address, and
 * the sitemap and robots file (S1-E11-38).
 * The local server answers from the seeded CMS content with Romania as the country, as
 * server/pages-functions-plugin.ts sets it.
 */
import { expect, test } from '@playwright/test';

test('the home page carries its description, canonical link and share tags for search engines', async ({
  request,
}) => {
  const html = await (await request.get('/')).text();
  // No search fields in the seed: the introduction stands in for the description.
  expect(html).toMatch(
    /<meta name="description" content="Publică povești, poezii și eseuri[^"]*">/,
  );
  // LOCALISE-1: the address without a place is read at the visitor's place, and the canonical link
  // names that place, with one alternate per open language of each open market.
  expect(html).toMatch(/<link rel="canonical" href="http:\/\/[^"]+\/ro\/ro">/);
  expect(html).toMatch(/<link rel="alternate" hreflang="en-RO" href="http:\/\/[^"]+\/ro\/en">/);
  expect(html).toContain('<meta property="og:title" content="Scrie povești. Fii citit.">');
  expect(html).toContain('<title data-page-head');
});

test('a help page carries its own title and first lines, and an unknown one is noindex', async ({
  request,
}) => {
  const helpPage = await request.get('/help/getting-started');
  expect(await helpPage.text()).toContain('<meta property="og:title" content="Primii pași">');
  expect(helpPage.headers()['x-robots-tag']).toBeUndefined();
  const unknown = await request.get('/help/no-such-page');
  expect(unknown.headers()['x-robots-tag']).toBe('noindex');
});

test('the sitemap lists public pages on the site’s own address, and the robots file points to it', async ({
  request,
}) => {
  // S1-E11-38: built from the database on request.
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.headers()['content-type']).toContain('application/xml');
  const xml = await sitemap.text();
  expect(xml).toMatch(/<loc>http:\/\/[^<]+\/help\/getting-started<\/loc>/);
  expect(xml).not.toContain('/staff');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /staff');
  expect(robots).toMatch(/Sitemap: http:\/\/[^\n]+\/sitemap\.xml/);
});
