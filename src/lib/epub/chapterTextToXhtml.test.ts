/**
 * A chapter's footnotes in the EPUB (BOOKS-D05b): raised numbers linked to endnotes that link
 * back, in well-formed XHTML.
 */
import { describe, expect, it } from 'vitest';

import { chapterTextToXhtml } from './chapterTextToXhtml';

/** The conversion's other inputs: no pictures, no cards. */
const conversion = {
  pictureFiles: new Map<string, string>(),
  embeds: new Map(),
  words: {
    pictureMissing: (altText: string) => `Picture: ${altText}`,
    embedLine: (title: string) => `Music or video: ${title}`,
    embedMissing: 'Missing',
  },
};

describe('chapterTextToXhtml footnotes', () => {
  it('draws each footnote as a numbered note reference with an endnote that links back', () => {
    const xhtml = chapterTextToXhtml(
      'Liftul[Se vopsește <primăvara> & vara.](footnote:) și scara[A doua.](footnote:).',
      conversion,
    );
    expect(xhtml).toContain(
      '<sup><a id="note-ref-1" href="#note-1" epub:type="noteref" role="doc-noteref">1</a></sup>',
    );
    expect(xhtml).toContain('id="note-2"');
    expect(xhtml).toContain('<a href="#note-ref-1" role="doc-backlink">1.</a>');
    expect(xhtml).toContain('Se vopsește &lt;primăvara&gt; &amp; vara.');
    // The note's words are only in the endnotes, never in the sentence.
    expect(xhtml.indexOf('Se vopsește')).toBeGreaterThan(xhtml.indexOf('role="doc-endnotes"'));
    const page = `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body>${xhtml}</body></html>`;
    const parsed = new DOMParser().parseFromString(page, 'application/xhtml+xml');
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('adds no notes section to a chapter without footnotes', () => {
    expect(chapterTextToXhtml('Doar text.', conversion)).not.toContain('doc-endnotes');
  });
});
