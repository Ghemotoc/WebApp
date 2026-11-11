/** Tests for the words search engines and share cards get, and the checks on them (S1-E11-39). */
import { describe, expect, it } from 'vitest';

import {
  landingPageWords,
  plainWordsOf,
  searchWarnings,
  shortenedAtWord,
  websitePageWords,
  type PageSearchWords,
} from './searchWords';

/** Words of a good length: a 40-character title and a 100-character description. */
const goodWords: PageSearchWords = {
  title: 'a'.repeat(40),
  description: 'b'.repeat(100),
  isHidden: false,
};

describe('the words a page gets', () => {
  it('uses staff’s search title and description first, and the page’s own words when empty', () => {
    const content = {
      headlineFirst: 'Scrie.',
      headlineSecond: 'Citește.',
      lede: 'O platformă pentru scriitori.',
      search: { title: '', description: 'Descrierea pentru căutare.' },
    };
    expect(websitePageWords('home_page', content)).toEqual({
      title: 'Scrie. Citește.',
      description: 'Descrierea pentru căutare.',
      isHidden: false,
    });
  });

  it('writes a help page’s description from its body as plain words, cut at a word', () => {
    const body = `## Report\n\n[Report a story](/help/x) ${'word '.repeat(60)}`;
    const words = websitePageWords('help_page', { title: 'Reporting', body });
    expect(words.title).toBe('Reporting');
    expect(words.description.startsWith('Report Report a story word')).toBe(true);
    expect(words.description.length).toBeLessThanOrEqual(161);
    expect(words.description.endsWith('…')).toBe(true);
  });

  it('reads a landing page’s Romanian hero and its Romanian search fields', () => {
    const blocks = [
      { kind: 'hero', ro: { title: 'Concursul de toamnă', intro: 'Scrie o poveste.' } },
    ];
    expect(landingPageWords({ blocks }).title).toBe('Concursul de toamnă');
    const searched = landingPageWords({
      blocks,
      search: { hidden: true, ro: { title: 'Concurs de povești', description: '' } },
    });
    expect(searched).toEqual({
      title: 'Concurs de povești',
      description: 'Scrie o poveste.',
      isHidden: true,
    });
  });

  it('shortens only what is too long, and keeps links’ text in plain words', () => {
    expect(shortenedAtWord('short', 10)).toBe('short');
    expect(shortenedAtWord('one two three', 8)).toBe('one two…');
    expect(plainWordsOf('**bold** and [a link](/x)')).toBe('bold and a link');
  });
});

describe('what is missing', () => {
  it('says nothing for a page with good words, a picture with alt text and one heading', () => {
    expect(
      searchWarnings({
        words: goodWords,
        hasSharePicture: true,
        picturesWithoutAlt: 0,
        mainHeadings: 1,
      }),
    ).toEqual([]);
  });

  it('flags a title outside 30 to 60 characters and a description outside 70 to 160', () => {
    const shortWords = { ...goodWords, title: 'Short', description: 'Too short.' };
    const longWords = { ...goodWords, title: 'x'.repeat(61), description: 'y'.repeat(161) };
    const base = { hasSharePicture: true, picturesWithoutAlt: 0, mainHeadings: 1 };
    expect(searchWarnings({ ...base, words: shortWords })).toEqual([
      'title_short',
      'description_short',
    ]);
    expect(searchWarnings({ ...base, words: longWords })).toEqual([
      'title_long',
      'description_long',
    ]);
  });

  it('flags a missing description once, a missing picture, a picture without alt text and the wrong number of main headings', () => {
    expect(
      searchWarnings({
        words: { ...goodWords, description: '' },
        hasSharePicture: false,
        picturesWithoutAlt: 2,
        mainHeadings: 0,
      }),
    ).toEqual(['no_description', 'no_share_picture', 'picture_without_alt', 'main_heading_count']);
  });
});
