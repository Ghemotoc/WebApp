/** Tests for classicCredit (bundle CLASSIC-CREDIT): the licence from a source link. */
import { describe, expect, it } from 'vitest';

import { classicSourceLicence } from './classicCredit';

describe('classicSourceLicence', () => {
  it('a Wikisource text, in any language, is CC BY-SA 4.0', () => {
    expect(classicSourceLicence('https://ro.wikisource.org/wiki/Moara_cu_noroc')).toEqual({
      kind: 'cc-by-sa-4',
      url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    });
  });

  it('a Standard Ebooks text is CC0', () => {
    expect(classicSourceLicence('https://standardebooks.org/ebooks/plato/the-republic')?.kind).toBe(
      'cc0',
    );
  });

  it('a Project Gutenberg Australia text is a public-domain transcription with no link', () => {
    expect(classicSourceLicence('http://gutenberg.net.au/ebooks01/0100021h.html')).toEqual({
      kind: 'public-domain-transcription',
      url: null,
    });
  });

  it('a source not on the list, a broken link or no link gives no licence', () => {
    expect(classicSourceLicence('https://example.org/book')).toBeNull();
    expect(classicSourceLicence('https://notwikisource.org/book')).toBeNull();
    expect(classicSourceLicence('not a link')).toBeNull();
    expect(classicSourceLicence(null)).toBeNull();
  });
});
