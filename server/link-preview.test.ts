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
  blurb: 'Bunica notează vremea.',
  writerName: 'Lia Scrie',
  cover: { kind: 'drawn', background: 'sky' },
  chapterTitle: 'Caietele bunicii',
  isChapter: true,
  passage: null,
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

  it('shows only the title and the rating for a 16+ or 18+ story (Q6)', () => {
    const hidden: LinkPreview = {
      ...chapterPreview,
      rating: '18_plus',
      hidesText: true,
      blurb: null,
      writerName: null,
      cover: null,
      chapterTitle: null,
    };
    expect(previewText(hidden)).toEqual({
      title: 'Stația meteo',
      description: 'Clasificată 18+. Conectează-te ca să vezi dacă o poți citi.',
    });
    expect(previewColour(hidden)).toBe('plum');
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
  it('puts the Open Graph tags into a chapter page, with noindex in the page and the header', async () => {
    const { response, html } = await open('/s/statia-meteo/ab12cd34?utm_source=x', chapterPreview);
    expect(html).toContain('<title>Stația meteo · Caietele bunicii</title>');
    expect(html).toContain('<meta property="og:title" content="Stația meteo · Caietele bunicii">');
    expect(html).toContain('<meta property="og:site_name" content="Brand">');
    expect(html).toContain(
      '<meta property="og:url" content="https://example.com/s/statia-meteo/ab12cd34">',
    );
    expect(html).toContain('content="https://example.com/link-previews/sky.png"');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('application/ld+json');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('ETag')).toBeNull();
  });

  it('describes a story page for search engines with its title, blurb and pen name only', async () => {
    const { response, html } = await open('/s/statia-meteo', {
      ...chapterPreview,
      chapterTitle: null,
      isChapter: false,
    });
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
    expect(html).not.toContain('noindex');
    const json = /<script type="application\/ld\+json">(.*)<\/script>/.exec(html)?.[1] ?? '{}';
    expect(JSON.parse(json)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: 'Stația meteo',
      description: 'Bunica notează vremea.',
      author: { '@type': 'Person', name: 'Lia Scrie' },
      inLanguage: 'ro',
      url: 'https://example.com/s/statia-meteo',
    });
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
