/**
 * The formatting buttons above a forum reply (bundle GAPS-16, part b; S1-E8-02; board 5.2):
 * each one changes the Markdown the way a writer expects, and pressing it again undoes it.
 */
import { describe, expect, it } from 'vitest';

import { applyPostFormat, type TextSelection } from './postFormatting';

/** The text with the selection drawn as [ and ], for readable expectations. */
function shown(selection: TextSelection): string {
  const { text, start, end } = selection;
  return `${text.slice(0, start)}[${text.slice(start, end)}]${text.slice(end)}`;
}

describe('applyPostFormat', () => {
  it('bold wraps the selected words and keeps them selected', () => {
    const after = applyPostFormat({ text: 'a big idea', start: 2, end: 5 }, 'bold', 'link text');
    expect(shown(after)).toBe('a **[big]** idea');
  });

  it('bold pressed again takes the marks off', () => {
    const bold = applyPostFormat({ text: 'a big idea', start: 2, end: 5 }, 'bold', 'link text');
    expect(shown(applyPostFormat(bold, 'bold', 'link text'))).toBe('a [big] idea');
  });

  it('with nothing selected, the cursor lands between the marks', () => {
    const after = applyPostFormat({ text: 'Hi ', start: 3, end: 3 }, 'italic', 'link text');
    expect(shown(after)).toBe('Hi *[]*');
  });

  it('italic on a bold word adds italic instead of breaking the bold', () => {
    const after = applyPostFormat({ text: '**big**', start: 2, end: 5 }, 'italic', 'link text');
    expect(after.text).toBe('***big***');
  });

  it('a link uses the selected words and selects the address to type', () => {
    const after = applyPostFormat({ text: 'see here', start: 4, end: 8 }, 'link', 'link text');
    expect(after.text).toBe('see [here](https://)');
    expect(after.text.slice(after.start, after.end)).toBe('https://');
  });

  it('a link with nothing selected gets the words it is given', () => {
    const after = applyPostFormat({ text: '', start: 0, end: 0 }, 'link', 'text linkului');
    expect(after.text).toBe('[text linkului](https://)');
  });

  it('quote marks every selected line', () => {
    const text = 'one\ntwo\nthree';
    const after = applyPostFormat({ text, start: 1, end: 6 }, 'quote', 'link text');
    expect(after.text).toBe('> one\n> two\nthree');
  });

  it('list pressed on a list takes the marks off', () => {
    const text = '- one\n- two';
    const after = applyPostFormat({ text, start: 0, end: text.length }, 'list', 'link text');
    expect(after.text).toBe('one\ntwo');
  });

  it('list with only the cursor marks its own line and keeps the cursor on the words', () => {
    const after = applyPostFormat({ text: 'first\nsecond', start: 8, end: 8 }, 'list', 'link text');
    expect(shown(after)).toBe('first\n- se[]cond');
  });
});
