/**
 * Tests for reading a research list of classics (story S1-E11-16, part 16b).
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseClassicsCsv, splitCsv } from './parseClassicsCsv';

describe('splitCsv', () => {
  it('keeps commas and doubled quotes inside quoted values', () => {
    expect(splitCsv('a,"b, c","say ""hi"""\r\n')).toEqual([['a', 'b, c', 'say "hi"']]);
  });

  it('keeps a line break inside quotes and drops blank lines', () => {
    expect(splitCsv('a,"two\nlines"\n\nb,c\n')).toEqual([
      ['a', 'two\nlines'],
      ['b', 'c'],
    ]);
  });
});

describe('parseClassicsCsv', () => {
  it('reads the columns the import needs and ignores the others', () => {
    const parsed = parseClassicsCsv(
      'title,author,author_died,type,language,pd_romania_2026,source_url,notes\n' +
        '"Peter Pan, or The Boy",J. M. Barrie,1937,play,en,yes,https://www.gutenberg.org/ebooks/1,"x"\n',
    );
    expect(parsed).toEqual({
      isValid: true,
      rows: [
        {
          title: 'Peter Pan, or The Boy',
          author: 'J. M. Barrie',
          author_died: '1937',
          type: 'play',
          language: 'en',
          source_url: 'https://www.gutenberg.org/ebooks/1',
        },
      ],
    });
  });

  it('names the columns a file lacks', () => {
    expect(parseClassicsCsv('title,author\nX,Y\n')).toEqual({
      isValid: false,
      missingColumns: ['author_died', 'type', 'language', 'source_url'],
    });
  });

  it('reads both research lists in content/classics, every row with a title and a link', () => {
    for (const file of ['G5_romanian-classics.csv', 'G5_english-classics.csv']) {
      const parsed = parseClassicsCsv(readFileSync(`content/classics/${file}`, 'utf8'));
      if (!parsed.isValid) throw new Error(`${file} lacks ${parsed.missingColumns.join(', ')}`);
      expect(parsed.rows.length).toBeGreaterThan(100);
      expect(
        parsed.rows.every((row) => row.title !== '' && row.source_url.startsWith('https://')),
      ).toBe(true);
    }
  });
});
