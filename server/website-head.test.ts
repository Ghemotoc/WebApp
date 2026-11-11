/**
 * Tests for the website pages' search and share tags (story S1-E11-37; bundle SEO-1b).
 */
import { describe, expect, it } from 'vitest';

import {
  documentTitleOf,
  handleWebsitePage,
  parseWebsiteAddress,
  plainWordsOf,
  websiteHeadFrom,
  type WebsiteAddress,
  type WebsiteHead,
  type WebsiteHeadHost,
} from './website-head';

/** A small index.html like the one the build makes, with the product name as its title. */
const indexHtml =
  '<!doctype html><html lang="ro"><head><title>Brand</title></head><body><div id="root"></div></body></html>';

/** What the fake host was asked, so a test can check the country it passed on. */
interface Asked {
  address: WebsiteAddress | null;
  country: string | null;
}

/** A host that serves indexHtml and answers with the given head (or throws). */
function fakeHost(head: WebsiteHead | null | Error, asked?: Asked): WebsiteHeadHost {
  return {
    fetchIndexHtml: async () => new Response(indexHtml, { headers: { ETag: '"abc"' } }),
    findHead: async (address, country) => {
      if (asked !== undefined) {
        asked.address = address;
        asked.country = country;
      }
      if (head instanceof Error) throw head;
      return head;
    },
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
};

describe('parseWebsiteAddress', () => {
  it('reads the home page and a help page, with or without a final slash', () => {
    expect(parseWebsiteAddress('/')).toEqual({ kind: 'home_page' });
    expect(parseWebsiteAddress('/help/raportare')).toEqual({
      kind: 'help_page',
      entryKey: 'raportare',
    });
    expect(parseWebsiteAddress('/help/raportare/')).toEqual({
      kind: 'help_page',
      entryKey: 'raportare',
    });
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
      { kind: 'home_page' },
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
    });
  });

  it('falls back to the home page’s headline and introduction when the fields are empty', () => {
    const head = websiteHeadFrom(
      { kind: 'home_page' },
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
      { kind: 'help_page', entryKey: 'raportare' },
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

describe('handleWebsitePage', () => {
  it('writes the title, description, canonical link, share tags and language into the home page', async () => {
    const asked: Asked = { address: null, country: null };
    const response = await handleWebsitePage(
      new Request('https://example.test/?utm_source=x'),
      fakeHost({ ...romanianHome, language: 'en' }, asked),
    );
    const html = await response.text();
    // The country from Cloudflare goes to the database, in capitals.
    expect(asked).toEqual({ address: { kind: 'home_page' }, country: 'SE' });
    // The title is marked, so the app puts the site's name back on the next screen.
    expect(html).toContain(
      '<title data-page-head data-site-name="Brand">Scrie aici, capitol cu capitol · Brand</title>',
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta name="description" content="Publică povești și poezii.">');
    // The canonical address carries no query, so tracking codes never spread (S1-E4-05).
    expect(html).toContain('<link rel="canonical" href="https://example.test/">');
    expect(html).toContain('<meta property="og:site_name" content="Brand">');
    expect(html).toContain('og:image" content="https://example.test/link-previews/plum.png"');
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
    expect(html).toContain('<link rel="canonical" href="https://example.test/help/ajutor">');
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
