/**
 * Tests for shared landing pages' link previews (story S1-E11-14 criterion 13; bundle
 * CONTESTS-13a2c).
 */
import { describe, expect, it } from 'vitest';

import {
  handleLandingLink,
  landingPreviewFrom,
  parseLandingAddress,
  type LandingLinkHost,
  type LandingPreview,
} from './landing-preview';

/** A small index.html like the one the build makes, with the product name as its title. */
const indexHtml =
  '<!doctype html><html lang="ro"><head><title>Brand</title></head><body><div id="root"></div></body></html>';

/** A host that serves indexHtml and answers with the given preview (or throws). */
function fakeHost(preview: LandingPreview | null | Error): LandingLinkHost {
  return {
    fetchIndexHtml: async () => new Response(indexHtml, { headers: { ETag: '"abc"' } }),
    findPreview: async () => {
      if (preview instanceof Error) throw preview;
      return preview;
    },
  };
}

describe('parseLandingAddress', () => {
  it('reads the name of a page at /c/<name>, with or without a final slash', () => {
    expect(parseLandingAddress('/c/concursul-de-toamna')).toBe('concursul-de-toamna');
    expect(parseLandingAddress('/c/concursul-de-toamna/')).toBe('concursul-de-toamna');
  });

  it('refuses other addresses and names that aren’t page names', () => {
    expect(parseLandingAddress('/s/statia-meteo')).toBeNull();
    expect(parseLandingAddress('/c/')).toBeNull();
    expect(parseLandingAddress('/c/Big<Name>')).toBeNull();
    expect(parseLandingAddress('/c/one/two')).toBeNull();
  });
});

describe('landingPreviewFrom', () => {
  it('takes the hero’s Romanian title and introduction and the theme’s colour', () => {
    const preview = landingPreviewFrom({
      content: {
        theme: 'sage',
        blocks: [{ kind: 'hero', ro: { title: 'Săptămâna poeziei', intro: 'Un poem pe zi.' } }],
      },
    });
    expect(preview).toEqual({
      title: 'Săptămâna poeziei',
      description: 'Un poem pe zi.',
      colour: 'sage',
    });
  });

  it('shortens a long introduction at a word', () => {
    const preview = landingPreviewFrom({
      content: {
        theme: 'plum',
        blocks: [{ kind: 'hero', ro: { title: 'T', intro: 'cuvânt '.repeat(60) } }],
      },
    });
    expect(preview?.description.length).toBeLessThanOrEqual(201);
    expect(preview?.description.endsWith('…')).toBe(true);
  });

  it('a page without a hero title has no preview', () => {
    expect(landingPreviewFrom({ content: { theme: 'plum', blocks: [] } })).toBeNull();
  });
});

describe('handleLandingLink', () => {
  it('a live page gets its title, the Open Graph tags and the theme’s picture, all escaped', async () => {
    const response = await handleLandingLink(
      new Request('https://example.test/c/poezie?utm=x'),
      fakeHost({ title: 'Poezie <script>', description: 'Scrie "azi".', colour: 'gold' }),
    );
    const html = await response.text();
    expect(html).toContain('<title>Poezie &lt;script&gt;</title>');
    expect(html).toContain('<meta property="og:url" content="https://example.test/c/poezie">');
    expect(html).toContain('/link-previews/gold.png');
    expect(html).toContain('content="Scrie &quot;azi&quot;."');
    expect(html).toContain('<meta property="og:site_name" content="Brand">');
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
    expect(response.headers.get('ETag')).toBeNull();
  });

  it('an unknown or archived page is noindex', async () => {
    const response = await handleLandingLink(
      new Request('https://example.test/c/nimic'),
      fakeHost(null),
    );
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(await response.text()).toContain('<meta name="robots" content="noindex">');
  });

  it('when the database can’t be reached, the page still loads without tags', async () => {
    const response = await handleLandingLink(
      new Request('https://example.test/c/poezie'),
      fakeHost(new Error('down')),
    );
    expect(await response.text()).toBe(indexHtml);
  });
});
