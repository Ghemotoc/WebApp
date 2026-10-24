/**
 * Waits for the page's animations and transitions to finish, so the next step acts on a screen
 * that has stopped moving (TOOL-1: reliable e2e tests, 24 Oct 2026).
 *
 * Who calls it: e2e/*.spec.ts files, between steps that start an animation and steps that
 * depend on where things ended up. First user: the keyboard drag test in
 * e2e/manage-chapters.spec.ts, where dnd-kit slides the rows for about 250 ms after each arrow
 * key; pressing the next key mid-slide made the drop land in the wrong place now and then.
 * How: in the page, it asks the browser for every running animation and CSS transition
 * (document.getAnimations()) and waits until none with a finite length is still running.
 * Endless ones (a loading spinner) are ignored, because they never finish.
 */
import { expect, type Page } from '@playwright/test';

/**
 * Resolves once no finite animation or transition is running on the page.
 *
 * @param page - an open Playwright page
 * @returns nothing; fails the test if something is still moving after 5 seconds
 */
export async function waitForAnimationsToFinish(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          // Count the animations that are still playing and will end on their own.
          const stillMoving = document.getAnimations().filter((animation) => {
            const timing = animation.effect?.getComputedTiming();
            const endsOnItsOwn = timing !== undefined && timing.iterations !== Infinity;
            return animation.playState === 'running' && endsOnItsOwn;
          });
          return stillMoving.length;
        }),
      { message: 'animations still running on the page', timeout: 5_000 },
    )
    .toBe(0);
}
