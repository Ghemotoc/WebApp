/**
 * Tests for reading the passage selected in the chapter text (story S1-E4-07, first criterion).
 */
import { afterEach, describe, expect, it } from 'vitest';

import { readQuoteSelection, tidyPassage } from './quoteSelection';

/** Puts a chapter text and a title on the page and selects part of one of them. */
function selectIn(where: 'text' | 'title', text: string) {
  document.body.innerHTML = `<h1 id="title">${text}</h1><div data-protected-text><p id="text">${text}</p></div>`;
  const node = document.getElementById(where)?.firstChild ?? null;
  const range = document.createRange();
  if (node !== null) range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return selection;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('readQuoteSelection', () => {
  it('reads a passage selected in the chapter text', () => {
    expect(readQuoteSelection(selectIn('text', 'Nu era niciun Ilie.'))).toEqual({
      passage: 'Nu era niciun Ilie.',
      length: 19,
      fits: true,
      blocks: null,
    });
  });

  it('ignores a selection outside the chapter text', () => {
    expect(readQuoteSelection(selectIn('title', 'Registrul'))).toBeNull();
  });

  it('says when a passage is longer than 280 characters', () => {
    expect(readQuoteSelection(selectIn('text', 'ș'.repeat(281)))?.fits).toBe(false);
    expect(readQuoteSelection(selectIn('text', 'ș'.repeat(280)))?.fits).toBe(true);
  });

  it('reads nothing when nothing is selected', () => {
    window.getSelection()?.removeAllRanges();
    expect(readQuoteSelection(window.getSelection())).toBeNull();
  });
});

describe('the blocks a selection covers (S1-E4-11)', () => {
  it('runs from the block it starts in to the block it ends in', () => {
    document.body.innerHTML =
      '<div data-protected-text><p data-block="2" id="a">Unu</p><p data-block="4" data-block-end="5" id="b">Doi</p></div>';
    const range = document.createRange();
    range.setStart(document.getElementById('a')?.firstChild ?? document.body, 1);
    range.setEnd(document.getElementById('b')?.firstChild ?? document.body, 2);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    expect(readQuoteSelection(selection)?.blocks).toEqual({ first: 2, last: 4 });
  });
});

describe('tidyPassage', () => {
  it('makes line breaks and runs of spaces single spaces', () => {
    expect(tidyPassage('  Unu\n\n doi   trei ')).toBe('Unu doi trei');
  });
});
