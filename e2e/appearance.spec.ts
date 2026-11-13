/**
 * End-to-end tests for Settings › Appearance and the looks (bundle G2 THEMES; handoff doc
 * "Design tokens and themes", "Themes: members choose their look"; Settings board, Appearance).
 *
 * What it proves:
 * - a member picks a theme in Settings and the page, its main button colour and the logo take it
 *   at once; signing in on another device shows the same theme (saved on the account);
 * - a member who never chose keeps each device's own night or light choice at sign-in;
 * - the look a device remembers is drawn before the app's code loads (public/theme-init.js), so
 *   there is no flash of Lilac mist;
 * - with Seasonal themes on, the summer look shows in summer;
 * - "Less motion" (bundle MOTION-1) stops transitions the moment it is switched on, follows the
 *   member to another device, is marked on the page before the app's code loads, and shows as on
 *   and fixed on a device that already asks for reduced motion;
 * - the page passes axe at 390, 768 and 1440 px, in both themes and languages.
 * Uses the seed persona adult_writer and puts their profile back afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** What src/lib/looks.ts and src/lib/theme.ts keep on the device. */
const SHOWN_LOOK_KEY = 'theme-shown-look';
const LOOK_CHOICE_KEY = 'theme-look-choice';
/** What src/lib/motion.ts keeps on the device. */
const LESS_MOTION_KEY = 'less-motion';

/** Puts adult_writer's appearance back to "never chosen". */
function resetAppearance() {
  runSql(`
    update public.profiles
      set look = 'lilac', colour_mode = 'device', seasonal_looks = false, less_motion = false,
          appearance_saved_at = null,
          locale = 'en'
      where handle = 'adult_writer';
  `);
}

/** Opens an address in English, signed in as adult_writer, in a fresh browser. */
async function openAsWriter(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext({ colorScheme: 'light' });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Settings › Appearance (G2 THEMES)', () => {
  test.beforeEach(resetAppearance);
  test.afterAll(resetAppearance);

  test('a picked theme shows at once and follows the member to another device', async ({
    browser,
  }) => {
    // Step 1: the member opens Appearance and sees Lilac mist picked.
    const page = await openAsWriter(browser, '/settings#appearance');
    await expect(page.getByRole('heading', { name: 'Theme' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Lilac mist' })).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-look', 'lilac');

    // Step 2: picking Sea glass changes the page, and the logo takes its teal accent.
    await page.getByText('Sea glass', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-look', 'seaglass');
    await expect(
      page.locator('#appearance').getByText('Saved. Every device you sign in on shows it.'),
    ).toBeVisible();
    const logoColour = await page
      .getByRole('banner')
      .locator('[data-brand-emblem]')
      .evaluate((emblem) => getComputedStyle(emblem).backgroundColor);
    expect(logoColour).toBe('rgb(15, 118, 110)');
    expect(
      runSql(
        `select look || ' ' || (appearance_saved_at is not null) from public.profiles where handle = 'adult_writer'`,
      ),
    ).toBe('seaglass true');
    await page.context().close();

    // Step 3: another device (a fresh browser) shows Sea glass after sign-in.
    const otherDevice = await openAsWriter(browser, '/discover');
    await expect(otherDevice.locator('html')).toHaveAttribute('data-look', 'seaglass');
    await otherDevice.context().close();
  });

  test('a member who never chose keeps this device’s night mode at sign-in', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'light' });
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    await context.addInitScript(() => localStorage.setItem('theme-preference', 'night'));
    const page = await context.newPage();
    await page.goto('/discover');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    // Give the account read time to arrive: it must not switch the page back to light.
    await page.waitForTimeout(1500);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    await context.close();
  });

  test('the remembered look is drawn before the app’s code loads', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'candy'), SHOWN_LOOK_KEY);
    // Block the app's bundle: only public/theme-init.js runs, as in the moment before first paint.
    await page.route('**/assets/**', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-look', 'candy');
  });

  test('with Seasonal themes on, summer shows the summer look', async ({ page }) => {
    await page.clock.install({ time: new Date(2027, 6, 1, 12, 0, 0) });
    await page.addInitScript(
      (key) => localStorage.setItem(key, JSON.stringify({ look: 'sorbet', isSeasonalOn: true })),
      LOOK_CHOICE_KEY,
    );
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-look', 'summer');
  });

  test('Less motion stops transitions at once and follows the member to another device', async ({
    browser,
  }) => {
    // Step 1: the switch starts off, and the switch's own knob still slides.
    const page = await openAsWriter(browser, '/settings#appearance');
    const lessMotion = page.getByRole('switch', { name: 'Less motion' });
    await expect(lessMotion).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('html')).not.toHaveAttribute('data-motion');
    const knob = lessMotion.locator('span span');
    expect(await knob.evaluate((el) => getComputedStyle(el).transitionDuration)).not.toBe('0s');

    // Step 2: switched on, the page is marked and nothing has a transition any more.
    await lessMotion.click();
    await expect(lessMotion).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'less');
    expect(await knob.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none');
    await expect(
      page.locator('#appearance').getByText('Saved. Every device you sign in on shows it.'),
    ).toBeVisible();
    expect(
      runSql(`select less_motion::text from public.profiles where handle = 'adult_writer'`),
    ).toBe('true');
    await page.context().close();

    // Step 3: another device (a fresh browser) stays still after sign-in.
    const otherDevice = await openAsWriter(browser, '/discover');
    await expect(otherDevice.locator('html')).toHaveAttribute('data-motion', 'less');
    await otherDevice.context().close();
  });

  test('Less motion is marked on the page before the app’s code loads', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'on'), LESS_MOTION_KEY);
    // Block the app's bundle: only public/theme-init.js runs, as in the moment before first paint.
    await page.route('**/assets/**', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'less');
  });

  test('on a device that asks for reduced motion, Less motion shows as on and says why', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/settings#appearance');
    const lessMotion = page.getByRole('switch', { name: 'Less motion' });
    await expect(lessMotion).toHaveAttribute('aria-checked', 'true');
    await expect(lessMotion).toBeDisabled();
    await expect(page.getByText('This device already asks for less motion')).toBeVisible();
    await context.close();
  });

  for (const view of everyView(['/settings#appearance'])) {
    test(`axe: Appearance at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view, async (opened) => {
        await expect(opened.locator('#appearance')).toBeVisible();
      });
    });
  }
});
