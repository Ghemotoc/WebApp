/**
 * Tests for chosen words in the chapter text (READER-SELECT, boards B12 to B14): from a selection
 * to a quote, the line picker's lines, and back to the words on the page.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { chosenWordsOf, linesOf, rangeOfSpan, spanHolds, wordsInRange } from './textParts';

/** A small poem as the reader draws it: a title, two stanzas of lines, and the end bar. */
function drawPoem(): HTMLElement {
  document.body.innerHTML = `
    <h1 id="title">The kitchen at six</h1>
    <div class="tmc-chapter-text tmc-poem">
      <p data-block="1"><span class="tmc-poem-line">My grandmother wakes</span><span class="tmc-poem-line">before the kettle does</span></p>
      <p data-block="2"><span class="tmc-poem-line">She cuts the bread,</span><span class="tmc-poem-line">the knife coming</span><span class="tmc-poem-line">and nobody bleeds.</span></p>
    </div>
    <footer id="end">The end</footer>`;
  return document.querySelector<HTMLElement>('.tmc-chapter-text') as HTMLElement;
}

/** Selects from one text node and offset to another. */
function select(start: Node, startOffset: number, end: Node, endOffset: number): Selection {
  const selection = window.getSelection() as Selection;
  selection.removeAllRanges();
  const range = document.createRange();
  range.setStart(start, startOffset);
  range.setEnd(end, endOffset);
  selection.addRange(range);
  return selection;
}

/** The text node of a stanza's line. */
function line(block: number, index: number): Node {
  const lines = document.querySelectorAll(`p[data-block="${block}"] .tmc-poem-line`);
  return lines[index]?.firstChild as Node;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('chosenWordsOf', () => {
  it('turns two lines of a stanza into a quote with a new line between them', () => {
    const root = drawPoem();
    const chosen = chosenWordsOf(select(line(2, 1), 0, line(2, 2), 18), root);
    expect(chosen?.quote).toEqual({
      text: 'the knife coming\nand nobody bleeds.',
      startBlock: 2,
      startOffset: 19,
      endBlock: 2,
      endOffset: 53,
    });
    expect(chosen?.length).toBe(35);
  });

  it('cuts a selection that takes in the title and the end bar to the chapter text', () => {
    const root = drawPoem();
    const title = document.getElementById('title')?.firstChild as Node;
    const end = document.getElementById('end')?.firstChild as Node;
    const chosen = chosenWordsOf(select(title, 0, end, 3), root);
    expect(chosen?.quote.startBlock).toBe(1);
    expect(chosen?.quote.startOffset).toBe(0);
    expect(chosen?.quote.endBlock).toBe(2);
    expect(chosen?.quote.text.split('\n')).toHaveLength(5);
  });

  it('gives nothing for an empty selection or one outside the text', () => {
    const root = drawPoem();
    expect(chosenWordsOf(window.getSelection(), root)).toBeNull();
    const title = document.getElementById('title')?.firstChild as Node;
    expect(chosenWordsOf(select(title, 0, title, 5), root)).toBeNull();
  });

  it('reads words inside one piece of prose text, counting ș and ț once each', () => {
    document.body.innerHTML = '<div class="tmc-chapter-text"><p data-block="1">Și țara</p></div>';
    const root = document.querySelector('.tmc-chapter-text') as HTMLElement;
    const text = root.querySelector('p')?.firstChild as Node;
    expect(chosenWordsOf(select(text, 0, text, 7), root)?.length).toBe(7);
  });
});

describe('wordsInRange and rangeOfSpan', () => {
  it('finds the same words again from the offsets', () => {
    const root = drawPoem();
    const range = rangeOfSpan(root, { block: 2, endBlock: 2, startOffset: 19, endOffset: 53 });
    expect(range === null ? '' : wordsInRange(range)).toBe('the knife coming\nand nobody bleeds.');
  });

  it('gives nothing when the stanza is not on the page', () => {
    const root = drawPoem();
    expect(rangeOfSpan(root, { block: 9, endBlock: 9, startOffset: 0, endOffset: 3 })).toBeNull();
  });
});

describe('spanHolds', () => {
  const span = { block: 2, endBlock: 3, startOffset: 10, endOffset: 4 };

  it('holds a point between the start and the end, across stanzas', () => {
    expect(spanHolds(span, 2, 10)).toBe(true);
    expect(spanHolds(span, 3, 3)).toBe(true);
  });

  it('does not hold a point before the start or at the end', () => {
    expect(spanHolds(span, 2, 9)).toBe(false);
    expect(spanHolds(span, 3, 4)).toBe(false);
  });
});

describe('linesOf', () => {
  it('lists a stanza’s lines with their offsets', () => {
    drawPoem();
    const stanza = document.querySelector<HTMLElement>('p[data-block="2"]') as HTMLElement;
    expect(linesOf(stanza, true, 'en')).toEqual([
      { text: 'She cuts the bread,', startOffset: 0, endOffset: 19 },
      { text: 'the knife coming', startOffset: 19, endOffset: 35 },
      { text: 'and nobody bleeds.', startOffset: 35, endOffset: 53 },
    ]);
  });

  it('lists a paragraph’s sentences, leaving out the spaces between them', () => {
    document.body.innerHTML = '<p data-block="1">She cuts the bread. Nobody bleeds.</p>';
    const paragraph = document.querySelector<HTMLElement>('p') as HTMLElement;
    expect(linesOf(paragraph, false, 'en')).toEqual([
      { text: 'She cuts the bread.', startOffset: 0, endOffset: 19 },
      { text: 'Nobody bleeds.', startOffset: 20, endOffset: 34 },
    ]);
  });
});
