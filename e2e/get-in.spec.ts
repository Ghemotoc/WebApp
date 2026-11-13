/**
 * The header has one way in for a visitor: "Get in" (bundle GETIN-1; Robert, 13 Nov 2026).
 *
 * What it proves, at 390, 768 and 1440 px, in English and Romanian:
 * - the header shows one "Get in" ("Intră") button and no separate "Log in" or "Join for free";
 * - the button sits on one row with the logo and nothing scrolls sideways (CLAUDE.md rule 21);
 * - it opens the log-in page, where "Join for free" under the form leads to sign-up.
 * Test data: the home page as a visitor; nothing is changed.
 */
import { expect, test } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';

/** The button's name in each interface language. */
const getInName = { en: 'Get in', ro: 'Intră' } as const;

for (const width of screenWidths) {
  for (const language of ['en', 'ro'] as const) {
    test(`at ${String(width)} px in ${language} the header has one "${getInName[language]}" button`, async ({
      page,
    }) => {
      // Step 1: open the home page as a visitor, at this width and in this language.
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
        LANGUAGE_STORAGE_KEY,
        language,
      ] as const);
      await page.goto('/');
      const header = page.getByRole('banner');
      const getIn = header.getByRole('link', { name: getInName[language], exact: true });
      await expect(getIn).toBeVisible();

      // Step 2: it is the header's only way in, and the old pair is gone.
      await expect(header.locator('a[href="/sign-in"]')).toHaveCount(1);
      await expect(header.locator('a[href="/sign-up"]')).toHaveCount(0);

      // Step 3: it shares a row with the logo, and the page doesn't scroll sideways.
      const logo = await header.getByRole('link').first().boundingBox();
      const button = await getIn.boundingBox();
      expect(
        Math.abs(
          (logo?.y ?? 0) + (logo?.height ?? 0) / 2 - ((button?.y ?? 0) + (button?.height ?? 0) / 2),
        ),
      ).toBeLessThan(8);
      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(sideways).toBeLessThanOrEqual(0);
    });
  }
}

test('"Get in" opens log-in, and sign-up is one line under the form', async ({ page }) => {
  // Step 1: a visitor on a phone presses "Get in".
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Get in', exact: true }).click();

  // Step 2: log-in comes first.
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();

  // Step 3: a person without an account finds sign-up under the form.
  await expect(page.getByRole('main').getByRole('link', { name: 'Join for free' })).toHaveAttribute(
    'href',
    '/sign-up',
  );
});
