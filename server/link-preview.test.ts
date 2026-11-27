/** Tests for shared links' previews and search engine tags (story S1-E4-04; Q36, Q13 option B). */
import { describe, expect, it } from 'vitest';

import {
  escapeHtml,
  handleSharedLink,
  parseSharedAddress,
  previewColour,
  previewText,
  type LinkPreview,
  type SharedLinkHost,
} from './link-preview';

/** A small index.html like the one the build makes, with the product name as its title. */
const indexHtml =
  '<!doctype html><html lang="ro"><head><title>Brand</title></head><body><div id="root"></div></body></html>';

/** An All ages story's preview, on a chapter address. */
const chapterPreview: LinkPreview = {
  slug: 'statia-meteo',
  title: 'Stația meteo',
  rating: 'all_ages',
  languageCode: 'ro',
  hidesText: false,
  isListed: true,
  blurb: 'Bunica notează vremea.',
  writerName: 'Lia Scrie',
  cover: { kind: 'drawn', background: 'sky' },
  chapterTitle: 'Caietele bunicii',
  categorySlug: null,
  tags: [],
  isAppOnly: false,
  isHiddenSomewhere: false,
  genre: null,
  writerHandle: 'adult_writer',
  firstPublishedAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-20T10:00:00Z',
  editions: [],
  isChapter: true,
  passage: null,
  picture: null,
};

/** The same story's own page: public, Fiction, with the genre "Mister" and two tags (CALM-9s). */
const storyPage: LinkPreview = {
  ...chapterPreview,
  chapterTitle: null,
  isChapter: false,
  categorySlug: 'fiction',
  genre: 'Mister',
  tags: ['familie', 'vreme'],
};

/** A host that serves indexHtml and answers with the given preview (or throws). */
function fakeHost(preview: LinkPreview | null | Error): SharedLinkHost {
  return {
    fetchIndexHtml: async () => new Response(indexHtml, { headers: { ETag: '"abc"' } }),
    findPreview: async () => {
      if (preview instanceof Error) throw preview;
      return preview;
    },
  };
}

/** Opens an address through the handler and returns the response and its HTML. */
async function open(path: string, preview: LinkPreview | null | Error) {
  const response = await handleSharedLink(
    new Request(`https://example.com${path}`),
    fakeHost(preview),
  );
  return { response, html: await response.text() };
}

describe('shared addresses', () => {
  it('reads a story page and a chapter, and nothing else', () => {
    expect(parseSharedAddress('/s/statia-meteo')).toEqual({
      storySlug: 'statia-meteo',
      chapterCode: null,
      spot: null,
    });
    expect(parseSharedAddress('/s/statia-meteo/ab12cd34/')).toEqual({
      storySlug: 'statia-meteo',
      chapterCode: 'ab12cd34',
      spot: null,
    });
    expect(parseSharedAddress('/s/')).toBeNull();
    expect(parseSharedAddress('/s/Statia')).toBeNull();
    expect(parseSharedAddress('/s/statia-meteo/short')).toBeNull();
    expect(parseSharedAddress('/s/a/ab12cd34/more')).toBeNull();
    expect(parseSharedAddress('/write/s/statia-meteo')).toBeNull();
  });

  it('reads a spot after a chapter: one block or up to five (S1-E4-11)', () => {
    expect(parseSharedAddress('/s/statia-meteo/ab12cd34/p3-5')?.spot).toEqual({
      first: 3,
      last: 5,
    });
    expect(parseSharedAddress('/s/statia-meteo/ab12cd34/p2')?.spot).toEqual({ first: 2, last: 2 });
    expect(parseSharedAddress('/s/statia-meteo/ab12cd34/p1-9')).toBeNull();
    expect(parseSharedAddress('/s/statia-meteo/ab12cd34/p2/more')).toBeNull();
  });
});

describe('the preview card', () => {
  it('shows a shared passage instead of the blurb (S1-E4-11)', () => {
    expect(previewText({ ...chapterPreview, passage: 'Ploua peste oraș.' }).description).toBe(
      'de Lia Scrie · „Ploua peste oraș.”',
    );
    expect(
      previewText({ ...chapterPreview, languageCode: 'en', passage: 'It rained.' }).description,
    ).toBe('by Lia Scrie · “It rained.”');
  });

  it('shows the story and chapter title, the pen name and the blurb', () => {
    expect(previewText(chapterPreview)).toEqual({
      title: 'Stația meteo · Caietele bunicii',
      description: 'de Lia Scrie · Bunica notează vremea.',
    });
  });

  it('uses the story’s language for the few words of its own', () => {
    expect(previewText({ ...chapterPreview, languageCode: 'en' }).description).toBe(
      'by Lia Scrie · Bunica notează vremea.',
    );
  });

  it('adds the category, and keeps the blurb for every rating, never naming the rating (S1-E11-36)', () => {
    const withCategory: LinkPreview = { ...chapterPreview, categorySlug: 'poetry' };
    expect(previewText(withCategory).description).toBe(
      'de Lia Scrie · Poezie · Bunica notează vremea.',
    );
    const sixteen: LinkPreview = { ...withCategory, rating: '16_plus', hidesText: true };
    expect(previewText(sixteen).description).toBe('de Lia Scrie · Poezie · Bunica notează vremea.');
    expect(previewColour(sixteen)).toBe('sky');
  });

  it('says "For mature readers" on an 18+ story only', () => {
    const eighteen: LinkPreview = {
      ...chapterPreview,
      languageCode: 'en',
      rating: '18_plus',
      hidesText: true,
      categorySlug: 'fiction',
    };
    expect(previewText(eighteen).description).toBe(
      'by Lia Scrie · For mature readers · Fiction · Bunica notează vremea.',
    );
    expect(previewText(eighteen).description).not.toContain('18');
  });

  it('takes the drawn cover’s colour, and plum for an automatic cover', () => {
    expect(previewColour(chapterPreview)).toBe('sky');
    expect(
      previewColour({ ...chapterPreview, cover: { kind: 'automatic', background: null } }),
    ).toBe('plum');
  });

  it('escapes everything that goes into the HTML', () => {
    expect(escapeHtml(`<script>"a" & 'b'</script>`)).toBe(
      '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;',
    );
  });
});

describe('the page a shared link serves', () => {
  it("puts the Open Graph tags into a chapter page and keeps a writer's chapter out of search engines (GROWTH-4)", async () => {
    const { response, html } = await open('/s/statia-meteo/ab12cd34?utm_source=x', chapterPreview);
    expect(html).toContain('<title>Stația meteo · Caietele bunicii</title>');
    expect(html).toContain('<meta property="og:title" content="Stația meteo · Caietele bunicii">');
    expect(html).toContain('<meta property="og:site_name" content="Brand">');
    expect(html).toContain(
      '<meta property="og:url" content="https://example.com/s/statia-meteo/ab12cd34">',
    );
    expect(html).toContain('content="https://example.com/link-previews/sky.png"');
    // A writer's chapter stays out of search engines; only the story's page is listed (Robert,
    // 26 Nov 2026, 19:45 UTC). The structured data describes the story, so the chapter has none.
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('application/ld+json');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('ETag')).toBeNull();
  });

  it("lets search engines list a classic's chapter, which visitors read whole (GROWTH-2 and 4)", async () => {
    const classic = { ...chapterPreview, writerHandle: null };
    const { response, html } = await open('/s/statia-meteo/ab12cd34', classic);
    expect(html).not.toContain('noindex');
    expect(html).not.toContain('application/ld+json');
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('keeps a 16+ or 18+ chapter out of search engines, as visitors get no text from it', async () => {
    const hidden = { ...chapterPreview, rating: '16_plus' as const, hidesText: true };
    const { response, html } = await open('/s/statia-meteo/ab12cd34', hidden);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('describes a story page for search engines with the story statement, writer, dates and trail (CALM-9s)', async () => {
    const { response, html } = await open('/s/statia-meteo', storyPage);
    expect(html).toContain('<meta name="keywords" content="Ficțiune, familie, vreme">');
    expect(html).toContain('<link rel="canonical" href="https://example.com/s/statia-meteo">');
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
    expect(html).not.toContain('noindex');
    const statement =
      'Stația meteo este o poveste din genul mister, publicată pe Brand de Lia Scrie. Bunica notează vremea.';
    expect(html).toContain(`<meta name="description" content="${statement}">`);
    expect(html).toContain(`<meta property="og:description" content="${statement}">`);
    expect(html).toContain('<title>Stația meteo de Lia Scrie, Mister, Brand</title>');
    const [work, trail] = [
      ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
    ].map((match) => JSON.parse(match[1] ?? '') as Record<string, unknown>);
    expect(work).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: 'Stația meteo',
      description: statement,
      author: { '@type': 'Person', name: 'Lia Scrie', url: 'https://example.com/u/adult_writer' },
      genre: 'Mister',
      keywords: 'familie, vreme',
      inLanguage: 'ro',
      url: 'https://example.com/s/statia-meteo',
      datePublished: '2026-11-01T10:00:00Z',
      dateModified: '2026-11-20T10:00:00Z',
      isAccessibleForFree: true,
      publisher: { '@type': 'Organization', name: 'Brand', url: 'https://example.com' },
    });
    expect(trail).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Citește', item: 'https://example.com/discover' },
        { position: 2, name: 'Ficțiune', item: 'https://example.com/discover/c/fiction' },
        { position: 3, name: 'Stația meteo', item: 'https://example.com/s/statia-meteo' },
      ],
    });
  });

  it('shows the statement as real text before the app starts, never hidden (CALM-9s)', async () => {
    const { html } = await open('/s/statia-meteo', storyPage);
    expect(html).toContain(
      '<div id="root"><footer lang="ro"><p><cite>Stația meteo</cite> este o poveste din genul mister, publicată pe Brand de <a href="/u/adult_writer">Lia Scrie</a>.</p><p>Bunica notează vremea.</p><p>Brand este un site gratuit pentru a scrie și a citi povești, poezii, piese de teatru și non-ficțiune.</p></footer></div>',
    );
  });

  it('calls a poem a poem, an essay an essay, and adds only "For mature readers" for 18+', async () => {
    const poem = await open('/s/statia-meteo', {
      ...storyPage,
      languageCode: 'en',
      categorySlug: 'nonfiction_essays',
      genre: null,
      rating: '18_plus',
    });
    expect(poem.html).toContain(
      '<meta name="description" content="Stația meteo is an essay published on Brand by Lia Scrie. For mature readers. Bunica notează vremea.">',
    );
    expect(poem.html).not.toContain('18');
    const json =
      /<script type="application\/ld\+json">(.*?)<\/script>/.exec(poem.html)?.[1] ?? '{}';
    expect(JSON.parse(json)).toMatchObject({ '@type': 'CreativeWork' });
  });

  it('links every language edition with hreflang (CALM-9s)', async () => {
    const { html } = await open('/s/statia-meteo', {
      ...storyPage,
      editions: [
        { slug: 'statia-meteo', languageCode: 'ro' },
        { slug: 'the-weather-station', languageCode: 'en' },
      ],
    });
    expect(html).toContain(
      '<link rel="alternate" hreflang="en" href="https://example.com/s/the-weather-station">',
    );
    expect(html).toContain(
      '<link rel="alternate" hreflang="x-default" href="https://example.com/s/statia-meteo">',
    );
  });

  it('keeps an app-only or country-hidden story out of search engines, with the site footer (CALM-9s)', async () => {
    for (const hidden of [{ isAppOnly: true }, { isHiddenSomewhere: true }]) {
      const { response, html } = await open('/s/statia-meteo', { ...storyPage, ...hidden });
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).not.toContain('application/ld+json');
      expect(html).toContain('<div id="root"></div>');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    }
  });

  it('previews an unlisted story from its link but keeps it out of search engines', async () => {
    const { response, html } = await open('/s/statia-meteo', {
      ...chapterPreview,
      chapterTitle: null,
      isChapter: false,
      isListed: false,
    });
    expect(html).toContain('<meta property="og:title" content="Stația meteo">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('application/ld+json');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('keeps a title with HTML in it as text, in the tags and in the structured data', async () => {
    const sneaky = {
      ...chapterPreview,
      title: '"><script>alert(1)</script>',
      isChapter: false,
      chapterTitle: null,
    };
    const { html } = await open('/s/statia-meteo', sneaky);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('\\u003cscript>alert(1)\\u003c/script>');
  });

  it('shows a shared picture itself in the preview, through our own address (IDEAS-2f)', async () => {
    const withPicture: LinkPreview = {
      ...chapterPreview,
      picture: {
        address: { storySlug: 'statia-meteo', chapterCode: 'ab12cd34', blockNumber: 3 },
        alt: 'Un far "în" ceață',
      },
    };
    const { html } = await open('/s/statia-meteo/ab12cd34/p3', withPicture);
    expect(html).toContain(
      '<meta property="og:image" content="https://example.com/api/picture-preview/statia-meteo/ab12cd34/3">',
    );
    expect(html).toContain('<meta property="og:image:alt" content="Un far &quot;în&quot; ceață">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).not.toContain('link-previews/sky.png');
  });

  it('marks an unknown or hidden address noindex and adds no preview', async () => {
    const { response, html } = await open('/s/nu-exista', null);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('og:title');
  });

  it('still serves the page, unchanged, when the database can’t be reached', async () => {
    const { response, html } = await open('/s/statia-meteo', new Error('offline'));
    expect(response.status).toBe(200);
    expect(html).toBe(indexHtml);
  });
});
