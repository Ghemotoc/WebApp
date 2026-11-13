/**
 * End-to-end tests for the "High contrast" switch in Settings › Appearance (bundle CONTRAST-1;
 * Robert, 13 Nov 2026: "people should still be able to use the themes they like, but at high
 * contrast", and his choice the same day: "Build, plain white pages").
 *
 * What it proves:
 * - switched on, the page turns plain white at once, with no colour blobs and no see-through
 *   glass, and the choice follows the member to another device (saved on the account);
 * - the picked theme stays, as its deep accent on buttons, links and the logo;
 * - at night the page is plain black with white text;
 * - the choice a device remembers is drawn before the app's code loads (public/theme-init.js);
 * - on a device that asks for more contrast, the page is in high contrast without the switch,
 *   which shows as on and fixed and says why;
 * - text reaches WCAG 2.2's enhanced contrast (1.4.6, 7:1) on the home page, Discover and
 *   Settings, by day and at night, on a phone and a desktop (axe's color-contrast-enhanced rule).
 * Uses the seed persona adult_writer and puts their profile back afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** What src/lib/highContrast.ts, src/lib/looks.ts and src/lib/theme.ts keep on the device. */
const HIGH_CONTRAST_KEY = 'high-contrast';
const SHOWN_LOOK_KEY = 'theme-shown-look';
const LOOK_CHOICE_KEY = 'theme-look-choice';
const THEME_KEY = 'theme-preference';

/** Puts adult_writer's appearance back to "never chosen". */
function resetAppearance() {
  runSql(`
    update public.profiles
      set look = 'lilac', colour_mode = 'device', seasonal_looks = false, less_motion = false,
          high_contrast = false, appearance_saved_at = null, locale = 'en'
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

/**
 * Reads one colour token as the page draws it, for example "--paper", as "rgb(r, g, b)". (The
 * built stylesheet shortens colours, so the written value can't be compared as text.)
 */
async function rootToken(page: Page, name: string): Promise<string> {
  return page.evaluate((tokenName) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${tokenName})`;
    document.documentElement.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, name);
}

test.describe('Settings › Appearance: High contrast (CONTRAST-1)', () => {
  test.beforeEach(resetAppearance);
  test.afterAll(resetAppearance);

  test('High contrast turns the page plain white at once and follows the member to another device', async ({
    browser,
  }) => {
    // Step 1: the switch starts off and the page is the pastel glass.
    const page = await openAsWriter(browser, '/settings#appearance');
    const highContrast = page.getByRole('switch', { name: 'High contrast' });
    await expect(highContrast).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('html')).not.toHaveAttribute('data-contrast');
    expect(await rootToken(page, '--paper')).toBe('rgb(243, 238, 251)');

    // Step 2: switched on, the page is white, the blobs are gone and the card is solid.
    await highContrast.click();
    await expect(highContrast).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
    const drawn = await page.evaluate(() => {
      const card = document.querySelector('#appearance');
      if (card === null) throw new Error('The Appearance card is missing.');
      const cardStyle = getComputedStyle(card);
      return {
        page: getComputedStyle(document.documentElement).backgroundColor,
        blobs: getComputedStyle(document.body, '::before').backgroundImage,
        card: cardStyle.backgroundImage,
        cardBlur: cardStyle.backdropFilter,
        text: getComputedStyle(document.body).color,
      };
    });
    expect(drawn.page).toBe('rgb(255, 255, 255)');
    expect(drawn.blobs).toBe('none');
    expect(drawn.card).toBe('linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255))');
    expect(drawn.cardBlur).toBe('none');
    expect(drawn.text).toBe('rgb(0, 0, 0)');

    // Step 3: it is saved on the account.
    await expect(
      page.locator('#appearance').getByText('Saved. Every device you sign in on shows it.'),
    ).toBeVisible();
    expect(
      runSql(`select high_contrast::text from public.profiles where handle = 'adult_writer'`),
    ).toBe('true');
    await page.context().close();

    // Step 4: another device (a fresh browser) is in high contrast after sign-in.
    const otherDevice = await openAsWriter(browser, '/discover');
    await expect(otherDevice.locator('html')).toHaveAttribute('data-contrast', 'more');
    await otherDevice.context().close();
  });

  test('the picked theme stays in high contrast, as its deep accent', async ({ browser }) => {
    const page = await openAsWriter(browser, '/settings#appearance');
    await page.getByRole('switch', { name: 'High contrast' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');

    // Lilac mist: the deep plum.
    expect(await rootToken(page, '--primary')).toBe('rgb(42, 14, 51)');

    // Peach sorbet: its deep coral, on a white page (not the peach one).
    await page.getByText('Peach sorbet', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-look', 'sorbet');
    await expect(page.getByRole('radio', { name: 'Peach sorbet' })).toBeChecked();
    expect(await rootToken(page, '--paper')).toBe('rgb(255, 255, 255)');
    expect(await rootToken(page, '--primary')).toBe('rgb(107, 29, 18)');
    expect(await rootToken(page, '--link')).toBe('rgb(107, 29, 18)');
    const logoColour = await page
      .getByRole('banner')
      .locator('[data-brand-emblem]')
      .evaluate((emblem) => getComputedStyle(emblem).backgroundColor);
    expect(logoColour).toBe('rgb(107, 29, 18)');

    // Switched off again, the peach page is back.
    await page.getByRole('switch', { name: 'High contrast' }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-contrast');
    expect(await rootToken(page, '--paper')).toBe('rgb(255, 241, 234)');
    await page.context().close();
  });

  test('at night high contrast is plain black with white text', async ({ page }) => {
    await page.addInitScript(
      ([contrastKey, themeKey]) => {
        localStorage.setItem(contrastKey, 'on');
        localStorage.setItem(themeKey, 'night');
      },
      [HIGH_CONTRAST_KEY, THEME_KEY] as const,
    );
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
    const drawn = await page.evaluate(() => ({
      page: getComputedStyle(document.documentElement).backgroundColor,
      sky: getComputedStyle(document.body, '::before').backgroundImage,
      text: getComputedStyle(document.body).color,
    }));
    expect(drawn).toEqual({ page: 'rgb(0, 0, 0)', sky: 'none', text: 'rgb(255, 255, 255)' });
  });

  test('High contrast is marked on the page before the app’s code loads', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'on'), HIGH_CONTRAST_KEY);
    // Block the app's bundle: only public/theme-init.js runs, as in the moment before first paint.
    await page.route('**/assets/**', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
  });

  test('on a device that asks for more contrast, the page is in high contrast and the switch says why', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'light', contrast: 'more' });
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/settings#appearance');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
    const highContrast = page.getByRole('switch', { name: 'High contrast' });
    await expect(highContrast).toHaveAttribute('aria-checked', 'true');
    await expect(highContrast).toBeDisabled();
    await expect(page.getByText('This device already asks for more contrast')).toBeVisible();
    // The member's own choice is untouched: nothing was saved for them.
    expect(
      runSql(`select high_contrast::text from public.profiles where handle = 'adult_writer'`),
    ).toBe('false');

    // The device stops asking: the page goes back to the theme and the switch is free again.
    await page.emulateMedia({ contrast: 'no-preference' });
    await expect(page.locator('html')).not.toHaveAttribute('data-contrast');
    await expect(highContrast).toBeEnabled();
    await expect(highContrast).toHaveAttribute('aria-checked', 'false');
    await context.close();
  });

  for (const address of ['/', '/discover', '/settings#appearance']) {
    for (const theme of ['light', 'night'] as const) {
      for (const width of [390, 1440]) {
        test(`text reaches 7:1 in high contrast: ${address} at ${width} px, ${theme}`, async ({
          page,
        }) => {
          // Step 1: a returning member's browser: high contrast on, Peach sorbet, English.
          await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
          await page.addInitScript(
            ([contrastKey, themeKey, themeValue, lookKey, choiceKey, languageKey]) => {
              localStorage.setItem(contrastKey, 'on');
              localStorage.setItem(themeKey, themeValue);
              localStorage.setItem(lookKey, 'sorbet');
              localStorage.setItem(
                choiceKey,
                JSON.stringify({ look: 'sorbet', isSeasonalOn: false }),
              );
              localStorage.setItem(languageKey, 'en');
            },
            [
              HIGH_CONTRAST_KEY,
              THEME_KEY,
              theme,
              SHOWN_LOOK_KEY,
              LOOK_CHOICE_KEY,
              LANGUAGE_STORAGE_KEY,
            ] as const,
          );
          // Still pages, so axe measures the colours the page settles on (as checkScreen does).
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.setViewportSize({ width, height: 900 });
          await page.goto(address);
          await expect(page.locator('html')).toHaveAttribute('data-contrast', 'more');
          await page.waitForTimeout(600);

          // Step 2: WCAG 2.2 AA as everywhere, plus enhanced contrast (1.4.6).
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            // The enhanced rule is off in axe by default (it is AAA); this turns it on beside the tags.
            .options({ rules: { 'color-contrast-enhanced': { enabled: true } } })
            .analyze();
          const issues = results.violations.filter(
            (violation) =>
              violation.id === 'color-contrast-enhanced' ||
              violation.impact === 'serious' ||
              violation.impact === 'critical',
          );
          expect(issues).toEqual([]);

          // Step 3: nothing scrolls sideways (CLAUDE.md rule 21).
          const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          expect(pageWidth).toBeLessThanOrEqual(width);
        });
      }
    }
  }
});
