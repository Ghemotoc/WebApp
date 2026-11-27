/**
 * How a footnote is written in a chapter's text (BOOKS-D05b): the reader's quick note scanner and
 * the export builders' footnote step read the same notes in the same order.
 */
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Paragraph } from 'mdast';
import { describe, expect, it } from 'vitest';

import { footnotesIn, isFootnoteAddress, oneLineNote, takeFootnotes } from './chapter-footnotes';

const chapter = [
  'Liftul e vopsit[Se vopsește în fiecare primăvară.](footnote:) din nou.',
  '',
  'Vezi [harta](https://example.org/h) și nota[Un \\[colț\\] și un \\* stea.](footnote:).',
].join('\n');

describe('footnotesIn', () => {
  it('finds every note in the text, in order, without the backslash escapes', () => {
    expect(footnotesIn(chapter)).toEqual([
      'Se vopsește în fiecare primăvară.',
      'Un [colț] și un * stea.',
    ]);
  });

  it('finds nothing in a text without notes, and never takes an ordinary link for one', () => {
    expect(footnotesIn('Vezi [harta](https://example.org/h).')).toEqual([]);
    expect(footnotesIn('Un \\[x](footnote:) scris de mână.')).toEqual([]);
  });
});

describe('takeFootnotes', () => {
  it('turns each note into a numbered reference and gives the notes back, as footnotesIn does', () => {
    const tree = fromMarkdown(chapter);
    const notes = takeFootnotes(tree);
    expect(notes).toEqual(footnotesIn(chapter));
    const first = tree.children[0] as Paragraph;
    expect(first.children.map((node) => node.type)).toEqual(['text', 'footnoteReference', 'text']);
    // The ordinary link in the second paragraph stays a link.
    const second = tree.children[1] as Paragraph;
    expect(second.children.some((node) => node.type === 'link')).toBe(true);
  });

  it('numbers the references with the builder’s own count when it gives one', () => {
    const tree = fromMarkdown(chapter);
    takeFootnotes(tree, (_note, order) => order + 10);
    const first = tree.children[0] as Paragraph;
    expect(first.children[1]).toMatchObject({ type: 'footnoteReference', identifier: '11' });
  });
});

describe('isFootnoteAddress and oneLineNote', () => {
  it('knows only the exact address, and keeps a note on one trimmed line', () => {
    expect(isFootnoteAddress('footnote:')).toBe(true);
    expect(isFootnoteAddress('footnote:2')).toBe(false);
    expect(oneLineNote('  două\nrânduri   aici ')).toBe('două rânduri aici');
  });
});
