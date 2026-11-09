/**
 * The no-doodles guard: a screen draws no doodle at all (bundle NO-DOODLES; Robert, 9 Nov 2026:
 * no doodles anywhere in the app). It replaces the old doodle overlap check, which kept doodles
 * off text and controls while the app still drew them.
 *
 * Who calls it: e2e/*.spec.ts files, after opening a screen at 390, 768 and 1440 px. The unit
 * test src/test/noDoodles.test.ts guards the source files the same way; this guard looks at what
 * the browser actually drew, so a doodle coming in through CMS text or a stored picture is caught
 * too.
 * What it looks for: the old markers of a decorative doodle (`data-doodle`, the `tmc-dd-*`
 * breakpoint classes) and any picture or background whose address names a doodle.
 */
import { expect, type Page } from '@playwright/test';

/**
 * Lists what on the page looks like a doodle.
 *
 * @param page - an open Playwright page
 * @returns a short description of each doodle found, empty when the page is clean
 */
export async function findDoodles(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    // Step 1: the markers every decorative doodle used to carry.
    for (const element of Array.from(
      document.querySelectorAll('[data-doodle], [class*="tmc-dd"]'),
    )) {
      found.push(`marker on <${element.tagName.toLowerCase()}>`);
    }
    // Step 2: pictures whose address names a doodle (the old files lived in assets/doodles).
    for (const picture of Array.from(document.querySelectorAll<HTMLImageElement>('img'))) {
      if (/doodle/i.test(picture.currentSrc || picture.src)) found.push(`picture ${picture.src}`);
    }
    // Step 3: background pictures whose address names a doodle.
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const background = window.getComputedStyle(element).backgroundImage;
      if (/doodle/i.test(background))
        found.push(`background on <${element.tagName.toLowerCase()}>`);
    }
    return found;
  });
}

/**
 * Fails the test when the page draws anything that looks like a doodle.
 *
 * @param page - an open Playwright page, already at the width under test
 */
export async function expectNoDoodles(page: Page): Promise<void> {
  expect(await findDoodles(page)).toEqual([]);
}
