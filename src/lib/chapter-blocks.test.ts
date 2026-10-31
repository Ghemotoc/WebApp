/**
 * Tests for src/lib/chapter-blocks.ts (story S1-E4-11): the blocks must match the database's
 * chapter_blocks() (supabase/tests/database/188-share-passages-and-pictures.test.sql uses the
 * same examples), and spots must be read and written the same way.
 */
import { describe, expect, it } from 'vitest';

import { blockNumberAt, chapterBlocks, parseSpot, spotFor } from './chapter-blocks';

describe('chapterBlocks', () => {
  it('cuts the text at blank lines, counting a line of spaces as blank', () => {
    const blocks = chapterBlocks('Unu\n\nDoi  \n \t\nTrei\n\n\nPatru\n\n');
    expect(blocks.map((block) => block.text)).toEqual(['Unu', 'Doi  ', 'Trei', 'Patru']);
    expect(blocks.map((block) => block.number)).toEqual([1, 2, 3, 4]);
  });

  it('keeps single line breaks inside a block', () => {
    expect(chapterBlocks('Un vers\nși încă unul')).toHaveLength(1);
  });

  it('leaves out empty runs at the start', () => {
    expect(chapterBlocks('\n\nUnu\n\n\nDoi\n')[1]).toMatchObject({ number: 2, text: 'Doi' });
  });

  it('knows where each block starts, after any line breaks', () => {
    const markdown = 'Unu\n\n\nDoi';
    const second = chapterBlocks(markdown)[1];
    expect(second?.start).toBe(markdown.indexOf('Doi'));
  });

  it('has no blocks for an empty chapter', () => {
    expect(chapterBlocks('  \n\n ')).toEqual([]);
  });
});

describe('blockNumberAt', () => {
  const markdown = 'Unu\n\nDoi\n\nTrei';
  const blocks = chapterBlocks(markdown);

  it('finds the block a place in the text belongs to', () => {
    expect(blockNumberAt(blocks, markdown.indexOf('Doi'))).toBe(2);
    expect(blockNumberAt(blocks, markdown.indexOf('rei'))).toBe(3);
  });

  it('gives block 1 before the first block', () => {
    expect(blockNumberAt(blocks, 0)).toBe(1);
  });
});

describe('spots', () => {
  it('reads one block and a range of blocks', () => {
    expect(parseSpot('p3')).toEqual({ first: 3, last: 3 });
    expect(parseSpot('p3-7')).toEqual({ first: 3, last: 7 });
  });

  it('refuses more than five blocks, a backwards range and anything that is not a spot', () => {
    expect(parseSpot('p3-8')).toBeNull();
    expect(parseSpot('p5-4')).toBeNull();
    expect(parseSpot('p0')).toBeNull();
    expect(parseSpot('chapter')).toBeNull();
    expect(parseSpot(undefined)).toBeNull();
  });

  it('writes a spot the reader can read back', () => {
    expect(spotFor({ first: 2, last: 2 })).toBe('p2');
    expect(spotFor({ first: 2, last: 4 })).toBe('p2-4');
    expect(parseSpot(spotFor({ first: 2, last: 4 }))).toEqual({ first: 2, last: 4 });
  });
});
