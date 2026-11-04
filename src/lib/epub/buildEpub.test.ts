/**
 * Tests for the EPUB builder (story S1-E13-05, PRIVACY part f): the file follows the EPUB 3
 * rules readers check first, and every page is well-formed XHTML.
 */
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { buildEpub } from './buildEpub';
import type { EpubBook } from './epubTypes';

/** A tiny picture: the bytes don't matter to the builder. */
const picture = { data: new Uint8Array([1, 2, 3]), type: 'png' as const, width: 10, height: 16 };

/** A book with a cover, two chapters, one picture, one music card and one missing picture. */
function book(): EpubBook {
  return {
    title: 'Ploaia & vântul',
    author: 'Lia <Popescu>',
    languageCode: 'ro',
    identifier: '00000000-0000-4000-9000-000000000002',
    madeAt: '2026-11-01T08:15:30.123Z',
    cover: { ...picture, type: 'jpg' },
    chapters: [
      {
        heading: 'Capitolul 1: Începutul',
        markdown:
          'Ș și ț, **tare** și _ușor_.\n\n![Un gard](picture:3f2a0000-0000-4000-8000-000000000001)\n\n![Lipsă](picture:3f2a0000-0000-4000-8000-000000000009)',
      },
      {
        heading: 'Capitolul 2',
        markdown:
          '## Mai târziu\n\n> Un citat\n\n- unu\n- doi\n\n***\n\n![Cântec](embed:3f2a0000-0000-4000-8000-0000000000e1)\n\n[link](javascript:alert(1)) <b>x</b>',
      },
    ],
    pictures: new Map([['3f2a0000-0000-4000-8000-000000000001', picture]]),
    embeds: new Map([
      [
        '3f2a0000-0000-4000-8000-0000000000e1',
        { title: 'Cântec', url: 'https://example.com/a?b=1&c=2' },
      ],
    ]),
    words: {
      contents: 'Cuprins',
      copyrightHeading: 'Drepturi de autor',
      copyrightLines: [
        '© 2026 Lia <Popescu>. Toate drepturile rezervate.',
        'Pregătită prin produs.',
      ],
      byLine: 'de Lia <Popescu>',
      coverAlt: 'Coperta',
      pictureMissing: (alt) => `Imagine: ${alt}`,
      embedLine: (title) => `Muzică sau video: ${title}`,
      embedMissing: 'Indisponibil',
    },
    sample: null,
    aboutWriter: null,
  };
}

/** The finished book, opened again as a ZIP. */
async function openedBook(): Promise<JSZip> {
  return JSZip.loadAsync(await buildEpub(book()));
}

/** Parses a file as XML and answers whether it is well-formed. */
function isWellFormed(text: string): boolean {
  const parsed = new DOMParser().parseFromString(text, 'application/xhtml+xml');
  return parsed.getElementsByTagName('parsererror').length === 0;
}

describe('buildEpub', () => {
  it('puts "mimetype" first and stores it uncompressed, as EPUB readers require', async () => {
    const bytes = await buildEpub(book());
    // The first local file header names the file at byte 30 and gives the method at byte 8.
    const name = new TextDecoder().decode(bytes.slice(30, 38));
    expect(name).toBe('mimetype');
    expect(bytes[8]).toBe(0);
    const zip = await JSZip.loadAsync(bytes);
    expect(await zip.file('mimetype')?.async('string')).toBe('application/epub+zip');
  });

  it('lists every page and picture in the package, in reading order', async () => {
    const zip = await openedBook();
    const opf = (await zip.file('OEBPS/content.opf')?.async('string')) ?? '';
    const spine = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((match) => match[1]);
    expect(spine).toEqual(['cover', 'title', 'copyright', 'nav', 'chapter-1', 'chapter-2']);
    expect(opf).toContain('properties="cover-image"');
    expect(opf).toContain('href="images/picture-1.png"');
    expect(opf).toContain('<dc:language>ro</dc:language>');
    expect(opf).toContain('<dc:creator>Lia &lt;Popescu&gt;</dc:creator>');
    expect(opf).toContain('<meta property="dcterms:modified">2026-11-01T08:15:30Z</meta>');
  });

  it('lists the title, copyright and chapter pages in the table of contents, in order', async () => {
    const zip = await openedBook();
    const nav = (await zip.file('OEBPS/nav.xhtml')?.async('string')) ?? '';
    const headings = [...nav.matchAll(/<li><a href="[^"]+">([^<]+)<\/a><\/li>/g)].map(
      (match) => match[1],
    );
    expect(headings).toEqual([
      'Ploaia &amp; vântul',
      'Drepturi de autor',
      'Capitolul 1: Începutul',
      'Capitolul 2',
    ]);
    expect(await zip.file('OEBPS/toc.ncx')?.async('string')).toContain('playOrder="4"');
  });

  it('prints the copyright lines and the name, escaped', async () => {
    const zip = await openedBook();
    const copyright = (await zip.file('OEBPS/copyright.xhtml')?.async('string')) ?? '';
    expect(copyright).toContain('© 2026 Lia &lt;Popescu&gt;. Toate drepturile rezervate.');
    expect(copyright).toContain('epub:type="copyright-page"');
  });

  it('writes every page as well-formed XHTML in the story’s language', async () => {
    const zip = await openedBook();
    const pages = Object.keys(zip.files).filter((name) => name.endsWith('.xhtml'));
    expect(pages).toHaveLength(6);
    for (const page of pages) {
      const text = (await zip.file(page)?.async('string')) ?? '';
      expect(isWellFormed(text), page).toBe(true);
      expect(text).toContain('xml:lang="ro"');
    }
  });

  it('keeps the meaning of the text and drops anything that could run as code', async () => {
    const zip = await openedBook();
    const first = (await zip.file('OEBPS/chapter-1.xhtml')?.async('string')) ?? '';
    expect(first).toContain('<strong>tare</strong>');
    expect(first).toContain('<img src="images/picture-1.png" alt="Un gard"/>');
    expect(first).toContain('Imagine: Lipsă');
    const second = (await zip.file('OEBPS/chapter-2.xhtml')?.async('string')) ?? '';
    expect(second).toContain('<h2>Mai târziu</h2>');
    expect(second).toContain('<blockquote>');
    expect(second).toContain('<hr/>');
    expect(second).toContain('href="https://example.com/a?b=1&amp;c=2"');
    expect(second).not.toContain('javascript:');
    expect(second).not.toContain('<b>');
  });

  it('says "Sample" on the title and copyright pages of a sample, with its chapters (IDEAS-2b)', async () => {
    const sample = { label: 'Fragment', holdsLine: 'Fragmentul cuprinde:' };
    const zip = await JSZip.loadAsync(await buildEpub({ ...book(), sample }));
    for (const page of ['OEBPS/title.xhtml', 'OEBPS/copyright.xhtml']) {
      const text = (await zip.file(page)?.async('string')) ?? '';
      expect(isWellFormed(text)).toBe(true);
      expect(text).toContain('<p class="sample">Fragment</p>');
      expect(text).toContain('<li>Capitolul 1: Începutul</li>');
      expect(text).toContain('<li>Capitolul 2</li>');
    }
  });

  it('prints nothing about a sample in the whole book', async () => {
    const title = (await (await openedBook()).file('OEBPS/title.xhtml')?.async('string')) ?? '';
    expect(title).not.toContain('class="sample"');
  });

  it('ends with About the writer, its bio and a profile link, only when asked (IDEAS-2b)', async () => {
    const aboutWriter = {
      heading: 'Despre autor',
      bio: 'Scriu <povești> scurte.',
      linkLine: 'Mai multe de la Lia:',
      profileUrl: 'https://example.com/u/lia',
    };
    const zip = await JSZip.loadAsync(await buildEpub({ ...book(), aboutWriter }));
    const about = (await zip.file('OEBPS/about.xhtml')?.async('string')) ?? '';
    expect(isWellFormed(about)).toBe(true);
    expect(about).toContain('Scriu &lt;povești&gt; scurte.');
    expect(about).toContain('<a href="https://example.com/u/lia">https://example.com/u/lia</a>');
    const opf = (await zip.file('OEBPS/content.opf')?.async('string')) ?? '';
    expect(opf.indexOf('idref="about"')).toBeGreaterThan(opf.indexOf('idref="chapter-2"'));
    expect((await openedBook()).file('OEBPS/about.xhtml')).toBeNull();
  });

  it('leaves the cover out when there is none', async () => {
    const zip = await JSZip.loadAsync(await buildEpub({ ...book(), cover: null }));
    expect(zip.file('OEBPS/cover.xhtml')).toBeNull();
    const opf = (await zip.file('OEBPS/content.opf')?.async('string')) ?? '';
    expect(opf).not.toContain('cover-image');
  });
});
