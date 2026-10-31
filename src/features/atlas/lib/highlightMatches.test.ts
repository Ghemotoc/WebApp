/**
 * Tests for lib/highlightMatches.ts: the matches in a search snippet, ignoring capitals and
 * accents (story S1-E17-30).
 */
import { describe, expect, it } from 'vitest';

import { highlightMatches } from './highlightMatches';

describe('highlightMatches', () => {
  it('marks every match, keeping the snippet’s own letters', () => {
    expect(highlightMatches('Farul și farul', 'FAR')).toEqual([
      { text: 'Far', isMatch: true },
      { text: 'ul și ', isMatch: false },
      { text: 'far', isMatch: true },
      { text: 'ul', isMatch: false },
    ]);
  });

  it('ignores accents, so "stefan" marks "Ștefan"', () => {
    expect(highlightMatches('…pe Ștefan.', 'stefan')).toEqual([
      { text: '…pe ', isMatch: false },
      { text: 'Ștefan', isMatch: true },
      { text: '.', isMatch: false },
    ]);
  });

  it('leaves the snippet whole when nothing matches or the query is empty', () => {
    expect(highlightMatches('Valuri.', 'vânt')).toEqual([{ text: 'Valuri.', isMatch: false }]);
    expect(highlightMatches('Valuri.', '  ')).toEqual([{ text: 'Valuri.', isMatch: false }]);
  });
});
