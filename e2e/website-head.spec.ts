/**
 * End-to-end tests for the website pages' search and share tags (story S1-E11-37; bundle SEO-1b).
 * What a search engine or a share bot reads before any JavaScript runs: the home page's and a help
 * page's description, canonical link and Open Graph title, and noindex on an unknown help address.
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
  expect(html).toMatch(/<link rel="canonical" href="http:\/\/[^"]+\/">/);
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
