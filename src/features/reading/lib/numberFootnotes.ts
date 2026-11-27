/**
 * numberFootnotes: a rehype step that gives each footnote in a drawn chapter its number
 * (BOOKS-D05b; board B15-ReaderFootnotes).
 *
 * A footnote is stored as a link to "footnote:" (src/lib/chapter-footnotes.ts). The numbers are
 * never stored: they are the notes' order in the text, so this step counts the footnote links from
 * the top and writes the count on each as data-footnote. ChapterText's link drawer reads it and
 * draws the raised number (FootnoteMarker) instead of a link. The list of notes under the text
 * (ChapterFootnoteList) counts the same way, so number 2 in the text is number 2 in the list.
 * Who uses it: ChapterText, as a rehype plugin.
 */
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

import { isFootnoteAddress } from '@/lib/chapter-footnotes';

/**
 * The id of a footnote's number in the text, which the list's Back link points to.
 *
 * @param idPrefix - the text's id start
 * @param number - the note's number
 * @returns the element id
 */
export function footnoteReferenceId(idPrefix: string, number: number): string {
  return `${idPrefix}-footnote-ref-${number}`;
}

/**
 * Whether a drawn element is a footnote's link.
 *
 * @param element - an element of the drawn chapter
 * @returns true for an <a> whose address is "footnote:"
 */
function isFootnoteLink(element: Element): boolean {
  return element.tagName === 'a' && isFootnoteAddress(String(element.properties.href ?? ''));
}

/**
 * Builds the step.
 *
 * @returns the transformer react-markdown runs on the drawn tree
 */
export function numberFootnotes() {
  return (tree: Root) => {
    let count = 0;
    visit(tree, 'element', (element) => {
      // Each footnote link, top to bottom, takes the next number.
      if (!isFootnoteLink(element)) return;
      count += 1;
      element.properties.dataFootnote = count;
    });
  };
}
