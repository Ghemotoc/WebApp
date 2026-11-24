/**
 * Tests for languageSwitchPlace (BOOKS B07, user story 2.7): which paragraph travels with a
 * change of language, and where the new page lands.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { blockAtOrBefore, firstBlockInView, languageSwitchFrom } from './languageSwitchPlace';

/** Draws a chapter of paragraphs whose bottoms sit at the given heights on screen. */
function drawParagraphs(bottoms: number[]) {
  const text = document.createElement('div');
  text.className = 'tmc-chapter-text';
  bottoms.forEach((bottom, index) => {
    const paragraph = document.createElement('p');
    paragraph.setAttribute('data-block', String(index + 1));
    paragraph.getBoundingClientRect = () => ({ bottom }) as DOMRect;
    text.append(paragraph);
  });
  document.body.append(text);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the paragraph a change of language keeps', () => {
  it('is the first paragraph still below the bars', () => {
    drawParagraphs([-300, 40, 260, 600]);
    expect(firstBlockInView()).toBe(3);
  });

  it('is none at the start of the chapter', () => {
    drawParagraphs([300, 600]);
    expect(firstBlockInView()).toBeNull();
  });

  it('lands on the same paragraph, or the last one before it in a shorter translation', () => {
    drawParagraphs([100, 200, 300]);
    expect(blockAtOrBefore(2)?.getAttribute('data-block')).toBe('2');
    expect(blockAtOrBefore(9)?.getAttribute('data-block')).toBe('3');
  });
});

describe('reading the change back', () => {
  it('finds the paragraph in the navigation state', () => {
    expect(languageSwitchFrom({ languageSwitch: { block: 4 } })).toEqual({ block: 4 });
    expect(languageSwitchFrom({ languageSwitch: { block: null } })).toEqual({ block: null });
  });

  it('ignores any other state, and a paragraph that is not a whole number from 1', () => {
    expect(languageSwitchFrom(null)).toBeNull();
    expect(languageSwitchFrom({ from: 'library' })).toBeNull();
    expect(languageSwitchFrom({ languageSwitch: { block: -2 } })).toEqual({ block: null });
  });
});
