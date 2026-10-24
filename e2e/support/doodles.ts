/**
 * The doodle overlap check: no decorative doodle may sit over or touch text, buttons, links,
 * form fields or navigation, at any screen width (story S1-E3-01; DoD design rules, doodles;
 * Robert, canvas comment, 17 Oct 2026: "an automated check renders each screen and fails the
 * build if a doodle's box overlaps a control or a line of text").
 *
 * Who calls it: e2e/*.spec.ts files, after opening a screen at 390, 768 and 1440 px (usually
 * from checkScreen in e2e/support/accessibility.ts). Other lanes reuse it for their screens.
 * How: in the page, it takes every visible [data-doodle] element's box and every visible element
 * that is a control or carries its own text, and reports each pair whose boxes meet.
 */
import { expect, type Page } from '@playwright/test';

/** One doodle that meets something it shouldn't. */
export interface DoodleOverlap {
  doodle: string;
  element: string;
}

/**
 * Lists the doodles on the page that overlap a control or a line of text.
 *
 * @param page - an open Playwright page
 * @returns the overlapping pairs, empty when the page is clean
 */
export async function findDoodleOverlaps(page: Page): Promise<DoodleOverlap[]> {
  return page.evaluate(() => {
    /** True when the element takes space on screen. */
    function isVisible(element: Element): boolean {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    }

    /** True when the element has text of its own (not only through its children). */
    function hasOwnText(element: Element): boolean {
      return Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
      );
    }

    /** The controls and text lines a doodle must keep away from. */
    const controlSelector = 'a, button, input, select, textarea, label, summary, [role="button"]';
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(
      (element) =>
        !element.closest('[data-doodle]') &&
        isVisible(element) &&
        (element.matches(controlSelector) || hasOwnText(element)),
    );

    /** True when two boxes share any area. */
    function boxesMeet(first: DOMRect, second: DOMRect): boolean {
      return (
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top
      );
    }

    /** A short name for an element in the report. */
    function describe(element: HTMLElement): string {
      return `${element.tagName.toLowerCase()}: ${(element.textContent ?? '').trim().slice(0, 40)}`;
    }

    const doodles = Array.from(document.querySelectorAll<HTMLElement>('[data-doodle]')).filter(
      isVisible,
    );
    return doodles.flatMap((doodle) => {
      const doodleBox = doodle.getBoundingClientRect();
      return candidates
        .filter((element) => boxesMeet(element.getBoundingClientRect(), doodleBox))
        .map((element) => ({
          doodle: `${doodle.getAttribute('src') ?? ''} (${doodle.dataset.doodle ?? ''})`,
          element: describe(element),
        }));
    });
  });
}

/**
 * Fails the test when any doodle on the page meets a control or a line of text.
 *
 * @param page - an open Playwright page, already at the width under test
 */
export async function expectNoDoodleOverlap(page: Page): Promise<void> {
  expect(await findDoodleOverlaps(page)).toEqual([]);
}
