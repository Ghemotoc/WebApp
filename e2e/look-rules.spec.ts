/**
 * The design books' look rules on the main member pages (user stories, Section 1, story 0.1:
 * "one look everywhere"; Robert, 23 Nov 2026).
 *
 * What it proves:
 * - on each main member page, at 1440 px by day and at night, every text size, weight, corner,
 *   gap, padding and margin is one of the values the rules allow (e2e/support/lookCheck.ts);
 * - at 390 and 768 px the same pages never scroll sideways.
 * Each bundle's own spec adds its pages through expectLookRules() as it is built.
 * Persona: teacher (an adult member with no staff role), in English for the run.
 */
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { THEME_STORAGE_KEY } from '../src/lib/theme';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectLookRules } from './support/lookCheck';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The teacher persona's ID (supabase/seed.sql). */
const teacherId = '00000000-0000-4000-8000-000000000007';

/** The main member pages every bundle starts from. */
const memberPages = [
  '/',
  '/discover',
  '/s/statia-meteo-seed01',
  '/library',
  '/write',
  '/write/new',
  '/together',
  '/notifications',
  '/messages',
  '/settings',
];

/**
 * Opens a signed-in page in English, in the theme asked for.
 *
 * @param browser - the test's browser
 * @param width - the window width in pixels
 * @param theme - 'day' or 'night'
 * @returns the page, not yet on any address
 */
async function openAsTeacher(
  browser: Browser,
  width: number,
  theme: 'day' | 'night',
): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await useSessionInBrowser(context, (await signInPersona('teacher')).session);
  await context.addInitScript(
    ([languageKey, themeKey, chosenTheme]) => {
      localStorage.setItem(languageKey, 'en');
      localStorage.setItem(themeKey, chosenTheme);
    },
    [LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY, theme] as const,
  );
  return context.newPage();
}

/**
 * Goes to an address and waits until the page has drawn its content.
 *
 * @param page - the page
 * @param address - the address to open
 */
async function openSettled(page: Page, address: string): Promise<void> {
  await page.goto(address);
  await expect(page.locator('main')).toBeVisible();
  // Let the data arrive and the loading shapes give way to the page.
  await page.waitForLoadState('networkidle');
}

test.describe('the design books look rules (Section 1)', () => {
  test.describe.configure({ mode: 'serial' });
  // The account's own language wins on every device (S1-E1-04), so it is English for the run.
  test.beforeAll(() =>
    runSql(`update public.profiles set locale = 'en' where id = '${teacherId}';`),
  );
  test.afterAll(() =>
    runSql(`update public.profiles set locale = 'ro' where id = '${teacherId}';`),
  );

  for (const theme of ['day', 'night'] as const) {
    test(`every main member page keeps to the look rules at 1440 px, ${theme}`, async ({
      browser,
    }) => {
      test.setTimeout(180_000);
      const page = await openAsTeacher(browser, 1440, theme);
      for (const address of memberPages) {
        await openSettled(page, address);
        await test.step(address, () => expectLookRules(page));
      }
      await page.context().close();
    });
  }

  for (const width of [390, 768]) {
    test(`no main member page scrolls sideways at ${width} px`, async ({ browser }) => {
      test.setTimeout(180_000);
      const page = await openAsTeacher(browser, width, 'day');
      for (const address of memberPages) {
        await openSettled(page, address);
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(pageWidth, `${address} is wider than the screen`).toBeLessThanOrEqual(width);
      }
      await page.context().close();
    });
  }
});
