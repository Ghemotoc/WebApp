/**
 * The `test` every end-to-end spec imports: Playwright's own, plus one automatic step that closes
 * every browser context a test opened and left open (QA, 26 Nov 2026).
 *
 * Why: many specs open their own "devices" with `browser.newContext()` and never close them. All
 * the specs of a CI shard share one browser, so by the end of a shard dozens of signed-in pages
 * were still refreshing their sessions in the background, and late tests stalled until they ran
 * out of time (sign-in on shard 3, forum search on shard 2).
 * Who uses it: every file in e2e/ that has tests (`import { expect, test } from './support/test'`);
 * scripts/e2e-imports.test.ts fails the build if a spec imports `test` from Playwright directly.
 * What it calls: Playwright's `test.extend()`. Contexts made in `beforeAll` exist before the test
 * starts, so serial specs that share one keep it.
 */
import { test as playwrightTest } from '@playwright/test';

export { expect } from '@playwright/test';

/** Playwright's test, with leftover contexts closed after each test. */
export const test = playwrightTest.extend<{ closeLeftoverContexts: undefined }>({
  closeLeftoverContexts: [
    async ({ browser }, use) => {
      // Step 1: remember the contexts that were open before the test (beforeAll's included).
      const openBefore = new Set(browser.contexts());
      await use(undefined);
      // Step 2: close the ones the test opened. Playwright's own page fixture closes its context
      // too, so a context that is already closing is fine to skip.
      const leftOver = browser.contexts().filter((context) => !openBefore.has(context));
      await Promise.all(leftOver.map((context) => context.close().catch(() => undefined)));
    },
    { auto: true },
  ],
});
