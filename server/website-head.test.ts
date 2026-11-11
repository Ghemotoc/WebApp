/**
 * Tests for the website pages' search and share tags (story S1-E11-37; bundle SEO-1b), at the
 * addresses with a country and language and at the older ones (bundle LOCALISE-1).
 */
import { describe, expect, it } from 'vitest';

import {
  documentTitleOf,
  handleWebsitePage,
  homeExtraTags,
  parseWebsiteAddress,
  plainWordsOf,
  websiteHeadFrom,
  type WebsiteAddress,
  type WebsiteHead,
  type WebsiteHeadHost,
} from './website-head';
import type { WebsiteMarket, WebsitePlace } from '../src/lib/websitePlace';

/** A small index.html like the one the build makes, with the product name as its title. */
const indexHtml =
  '<!doctype html><html lang="ro"><head><title>Brand</title></head><body><div id="root"></div></body></html>';

/** What the fake host was asked, so a test can check the place it passed on. */
interface Asked {
  address: WebsiteAddress | null;
  place: WebsitePlace | null;
}

/** Two markets: Romania is open, Sweden isn't yet. */
const markets: WebsiteMarket[] = [
  { countryCode: 'RO', languages: ['ro', 'en'], isOpen: true },
  { countryCode: 'SE', languages: ['sv', 'en'], isOpen: false },
];

/** A host that serves indexHtml and answers with the given head (or throws). */
function fakeHost(head: WebsiteHead | null | Error, asked?: Asked): WebsiteHeadHost {
  return {
    fetchIndexHtml: async () => new Response(indexHtml, { headers: { ETag: '"abc"' } }),
    findHead: async (address, place) => {
      if (asked !== undefined) {
        asked.address = address;
        asked.place = place;
      }
      if (head instanceof Error) throw head;
      return head;
    },
    findMarkets: async () => markets,
    cloudflareCountry: 'se',
  };
}

/** A head as staff would leave it: a title, a description, Romanian, listed. */
const romanianHome: WebsiteHead = {
  title: 'Scrie aici, capitol cu capitol',
  tabTitle: 'Scrie aici, capitol cu capitol',
  description: 'Publică povești și poezii.',
  language: 'ro',
  isHidden: false,
  homeExtras: { googleCode: '', bingCode: '' },
};

describe('parseWebsiteAddress', () => {
  it('reads the home page and a help page, with or without a final slash', () => {
    expect(parseWebsiteAddress('/')).toEqual({ kind: 'home_page', place: null });
    expect(parseWebsiteAddress('/help/raportare')).toEqual({
      kind: 'help_page',
      entryKey: 'raportare',
      place: null,
    });
    expect(parseWebsiteAddress('/help/raportare/')).toEqual({
      kind: 'help_page',
      entryKey: 'raportare',
      place: null,
    });
  });

  it('reads the country and language an address starts with', () => {
    const place = { country: 'se', language: 'sv' };
    expect(parseWebsiteAddress('/se/sv')).toEqual({ kind: 'home_page', place });
    expect(parseWebsiteAddress('/se/sv/')).toEqual({ kind: 'home_page', place });
    expect(parseWebsiteAddress('/se/sv/help/rapportera')).toEqual({
      kind: 'help_page',
      entryKey: 'rapportera',
      place,
    });
    expect(parseWebsiteAddress('/se/sv/help')).toBeNull();
    expect(parseWebsiteAddress('/se/sv/discover')).toBeNull();
  });

  it('leaves the help centre, other pages and odd addresses alone', () => {
    expect(parseWebsiteAddress('/help')).toBeNull();
    expect(parseWebsiteAddress('/discover')).toBeNull();
    expect(parseWebsiteAddress('/help/Big<Name>')).toBeNull();
    expect(parseWebsiteAddress('/help/one/two')).toBeNull();
  });
});

describe('websiteHeadFrom', () => {
  it('uses the search fields staff filled in', () => {
    const head = websiteHeadFrom(
      { kind: 'home_page', place: null },
      {
        entry_key: 'home',
        language_code: 'en',
        content: {
          headlineFirst: 'Write here',
          lede: 'The lede.',
          search: { title: 'Stories, poems and essays', description: 'Share your writing.' },
        },
      },
    );
    expect(head).toEqual({
      title: 'Stories, poems and essays',
      tabTitle: 'Stories, poems and essays',
      description: 'Share your writing.',
      language: 'en',
      isHidden: false,
      homeExtras: { googleCode: '', bingCode: '' },
    });
  });

  it('falls back to the home page’s headline and introduction when the fields are empty', () => {
    const head = websiteHeadFrom(
      { kind: 'home_page', place: null },
      {
        entry_key: 'home',
        language_code: 'ro',
        content: {
          headlineFirst: 'Scrie aici,',
          headlineSecond: 'capitol cu capitol',
          lede: 'Publică povești.',
          search: { title: ' ', description: '', hidden: true },
        },
      },
    );
    expect(head.title).toBe('Scrie aici, capitol cu capitol');
    // With no search title, the tab keeps the site's name alone, as the app's home screen does.
    expect(head.tabTitle).toBe('');
    expect(head.description).toBe('Publică povești.');
    expect(head.isHidden).toBe(true);
  });

  it('falls back to a help page’s title and the plain words of its body, cut at a word', () => {
    const body = `## Cum raportezi\n\nApasă **Raportează** sau [scrie-ne](/contact). ${'cuvânt '.repeat(40)}`;
    const head = websiteHeadFrom(
      { kind: 'help_page', entryKey: 'raportare', place: null },
      { entry_key: 'raportare', language_code: 'ro', content: { title: 'Raportare', body } },
    );
    expect(head.title).toBe('Raportare');
    expect(head.tabTitle).toBe('Raportare');
    expect(head.description.startsWith('Cum raportezi Apasă Raportează sau scrie-ne.')).toBe(true);
    expect(head.description.length).toBeLessThanOrEqual(161);
    expect(head.description.endsWith('…')).toBe(true);
  });
});

describe('plainWordsOf', () => {
  it('drops Markdown marks and keeps link text', () => {
    expect(plainWordsOf('# Title\n\n- one *two*\n> quote [link](/x) `code`')).toBe(
      'Title one two quote link code',
    );
  });
});

describe('documentTitleOf', () => {
  it('puts the site’s name after the page’s title, or uses it alone', () => {
    expect(documentTitleOf(romanianHome, 'Brand')).toBe('Scrie aici, capitol cu capitol · Brand');
    expect(documentTitleOf({ ...romanianHome, tabTitle: '' }, 'Brand')).toBe('Brand');
  });
});

describe('homeExtraTags', () => {
  const page = { siteName: 'Brand', origin: 'https://example.test' };

  it('adds the verification codes staff entered as meta tags', () => {
    const tags = homeExtraTags({ googleCode: 'abc_DEF-123', bingCode: '0A1B2C' }, page);
    expect(tags).toContain('<meta name="google-site-verification" content="abc_DEF-123">');
    expect(tags).toContain('<meta name="msvalidate.01" content="0A1B2C">');
  });

  it('leaves out an empty code and anything that isn’t a code, so a pasted tag can’t break the page', () => {
    const tags = homeExtraTags(
      { googleCode: '"><script>alert(1)</script>', bingCode: '' },
      page,
    ).join('');
    expect(tags).not.toContain('google-site-verification');
    expect(tags).not.toContain('msvalidate');
    expect(tags).not.toContain('<script>alert');
  });

  it('keeps a site name with HTML in it inside the data block', () => {
    const tags = homeExtraTags(
      { googleCode: '', bingCode: '' },
      { ...page, siteName: '</script><b>' },
    );
    expect(tags.join('')).not.toContain('</script><b>');
  });
});

describe('handleWebsitePage', () => {
  it('writes the title, description, canonical link, share tags and language into the home page', async () => {
    const asked: Asked = { address: null, place: null };
    const response = await handleWebsitePage(
      new Request('https://example.test/?utm_source=x'),
      fakeHost({ ...romanianHome, language: 'en' }, asked),
    );
    const html = await response.text();
    // An older address is read at the visitor's place: the country from Cloudflare, in that
    // market's first language.
    expect(asked).toEqual({
      address: { kind: 'home_page', place: null },
      place: { country: 'se', language: 'sv' },
    });
    // The title is marked, so the app puts the site's name back on the next screen.
    expect(html).toContain(
      '<title data-page-head data-site-name="Brand">Scrie aici, capitol cu capitol · Brand</title>',
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta name="description" content="Publică povești și poezii.">');
    // The canonical address is the one with the place, so search engines list one address per
    // page; it carries no query, so tracking codes never spread (S1-E4-05).
    expect(html).toContain('<link rel="canonical" href="https://example.test/se/sv">');
    // The page's other places: each language of each open market (Sweden isn't open yet).
    expect(html).toContain(
      '<link rel="alternate" hreflang="ro-RO" href="https://example.test/ro/ro">',
    );
    expect(html).toContain(
      '<link rel="alternate" hreflang="en-RO" href="https://example.test/ro/en">',
    );
    expect(html).not.toContain('hreflang="sv-SE"');
    expect(html).toContain('<meta property="og:site_name" content="Brand">');
    // The large share picture, shown large on every card (S1-E11-38).
    expect(html).toContain('og:image" content="https://example.test/link-previews/share.png"');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    // The organisation and website data, named from index.html (S1-E11-38).
    const json = /<script type="application\/ld\+json">(.*)<\/script>/.exec(html)?.[1] ?? '{}';
    expect(JSON.parse(json)).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'Brand',
          url: 'https://example.test/',
          logo: 'https://example.test/brand/apple-touch-icon.png',
        },
        { '@type': 'WebSite', name: 'Brand', url: 'https://example.test/' },
      ],
    });
    expect(html).not.toContain('noindex');
    expect(response.headers.get('ETag')).toBeNull();
  });

  it('escapes what staff wrote, so a title like <script> stays text', async () => {
    const response = await handleWebsitePage(
      new Request('https://example.test/help/ajutor'),
      fakeHost({
        ...romanianHome,
        title: '<script>alert(1)</script>',
        tabTitle: '<script>alert(1)</script>',
      }),
    );
    const html = await response.text();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('asks search engines not to list a page staff hid', async () => {
    const response = await handleWebsitePage(
      new Request('https://example.test/help/ajutor/'),
      fakeHost({ ...romanianHome, isHidden: true }),
    );
    const html = await response.text();
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<link rel="canonical" href="https://example.test/se/sv/help/ajutor">');
  });

  it('reads a page at the country and language in its address', async () => {
    const asked: Asked = { address: null, place: null };
    const response = await handleWebsitePage(
      new Request('https://example.test/ro/en/help/reporting?utm_source=x'),
      fakeHost({ ...romanianHome, language: 'en', homeExtras: null }, asked),
    );
    const html = await response.text();
    expect(asked.place).toEqual({ country: 'ro', language: 'en' });
    expect(html).toContain(
      '<link rel="canonical" href="https://example.test/ro/en/help/reporting">',
    );
    expect(html).toContain(
      '<link rel="alternate" hreflang="ro-RO" href="https://example.test/ro/ro/help/reporting">',
    );
    expect(html).toContain('<html lang="en">');
  });

  it('marks an address whose place isn’t a market noindex, without reading the page', async () => {
    const asked: Asked = { address: null, place: null };
    for (const address of ['/fr/en', '/se/ro/help/ajutor']) {
      const response = await handleWebsitePage(
        new Request(`https://example.test${address}`),
        fakeHost(romanianHome, asked),
      );
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
      expect(await response.text()).not.toContain('og:title');
    }
    expect(asked.address).toBeNull();
  });

  it('marks an unknown help page noindex and writes no tags', async () => {
    const response = await handleWebsitePage(
      new Request('https://example.test/help/nu-exista'),
      fakeHost(null),
    );
    const html = await response.text();
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(html).toContain('<title>Brand</title>');
    expect(html).not.toContain('og:title');
  });

  it('sends the home page as it is when there is no live home page yet', async () => {
    const response = await handleWebsitePage(new Request('https://example.test/'), fakeHost(null));
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
    expect(await response.text()).toBe(indexHtml);
  });

  it('still sends the page, unchanged, when the database can’t be reached', async () => {
    const response = await handleWebsitePage(
      new Request('https://example.test/'),
      fakeHost(new Error('offline')),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(indexHtml);
  });

  it('leaves every other address alone', async () => {
    const response = await handleWebsitePage(
      new Request('https://example.test/discover'),
      fakeHost(romanianHome),
    );
    expect(await response.text()).toBe(indexHtml);
    expect(response.headers.get('ETag')).toBe('"abc"');
  });
});
