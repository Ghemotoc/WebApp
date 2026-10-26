/** Tests for splitting a classic's text into chapters (story S1-E11-16). */
import { describe, expect, it } from 'vitest';

import { splitClassicText } from './splitClassicText';

describe('splitClassicText', () => {
  it('starts a chapter at every heading and keeps its text', () => {
    expect(splitClassicText('# I\nStau câteodată.\n\n## II\r\nNică.')).toEqual([
      { title: 'I', body: 'Stau câteodată.' },
      { title: 'II', body: 'Nică.' },
    ]);
  });

  it('keeps text before the first heading as a chapter with no title, so nothing is lost', () => {
    expect(splitClassicText('Ediția 1892\n# I\nText')).toEqual([
      { title: '', body: 'Ediția 1892' },
      { title: 'I', body: 'Text' },
    ]);
  });

  it('makes a text with no headings one chapter, and a blank text none', () => {
    expect(splitClassicText('Un singur poem.')).toEqual([{ title: '', body: 'Un singur poem.' }]);
    expect(splitClassicText('  \n ')).toEqual([]);
  });

  it('doesn’t take a hashtag inside a line or four # for a heading', () => {
    expect(splitClassicText('Text #1\n#### small')).toEqual([
      { title: '', body: 'Text #1\n#### small' },
    ]);
  });
});
