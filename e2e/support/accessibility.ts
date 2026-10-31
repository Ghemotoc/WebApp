/**
 * Shared end-to-end checks for one screen: axe and "nothing scrolls sideways" (story S1-E14-01,
 * reused by every story of epic S1-E2).
 *
 * Who calls it: e2e/*.spec.ts files that check their screens at 390, 768 and 1440 px (CLAUDE.md
 * rule 21) in light and night mode and in Romanian and English.
 * What it does: sets the theme and language the way a returning visitor's browser keeps them,
 * opens the address, waits for the entrance animation, runs axe against WCAG 2.2 A and AA, and
 * measures the page width.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

import { THEME_STORAGE_KEY } from '../../src/lib/theme';

/**
 * The language key in localStorage: the same value as LANGUAGE_STORAGE_KEY in
 * src/lib/language-preference.ts, written out because that file imports Vite-only paths.
 */
export const LANGUAGE_STORAGE_KEY = 'interface-language';

/** One way of looking at a screen. */
export interface ScreenView {
  address: string;
  width: number;
  theme: 'light' | 'night';
  language: 'ro' | 'en';
}

/** The three widths every screen is checked at (CLAUDE.md rule 21). */
export const screenWidths = [390, 768, 1440] as const;

/**
 * Lists every view of some addresses: three widths, light and night, Romanian and English.
 *
 * @param addresses - the screens to check
 * @returns twelve views per address
 */
export function everyView(addresses: string[]): ScreenView[] {
  const views: ScreenView[] = [];
  for (const address of addresses) {
    for (const width of screenWidths) {
      for (const theme of ['light', 'night'] as const) {
        views.push(
          { address, width, theme, language: 'ro' },
          { address, width, theme, language: 'en' },
        );
      }
    }
  }
  return views;
}

/**
 * Opens a screen in one view and checks it.
 *
 * @param page - a Playwright page (signed in or not, as the test set it up)
 * @param view - the address, width, theme and language
 * @param reachScreen - optional clicks that reach the screen after the address opens
 * Errors: fails the test when axe finds a serious or critical issue, or the page scrolls sideways.
 */
export async function checkScreen(
  page: Page,
  view: ScreenView,
  reachScreen?: (page: Page) => Promise<void>,
): Promise<void> {
  // Step 1: the theme and language a returning visitor's browser would have.
  await page.addInitScript(
    ([themeKey, themeValue, languageKey, languageValue]) => {
      localStorage.setItem(themeKey, themeValue);
      localStorage.setItem(languageKey, languageValue);
    },
    [THEME_STORAGE_KEY, view.theme, LANGUAGE_STORAGE_KEY, view.language] as const,
  );
  // Reduce motion turns off every animation and transition (src/styles/index.css, S1-E1-03), so
  // axe measures the colours the page settles on. Without it, a page whose data arrived late was
  // still fading in (tmc-rise) when axe ran, and its eyebrow read as low contrast (story-settings,
  // TOOL-2). Only the motion changes; the colours, theme and layout checked are the same.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: view.width, height: 900 });
  await page.goto(view.address);
  await expect(page.locator('html')).toHaveAttribute('lang', view.language);
  // A screen that is a step inside a page (onboarding step 3, S1-E2-11) is reached by clicks.
  if (reachScreen !== undefined) await reachScreen(page);
  // Step 2: give the page's data a moment to arrive, so axe checks the loaded screen.
  await page.waitForTimeout(600);
  // Step 3: axe against WCAG 2.0, 2.1 and 2.2, levels A and AA.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const seriousIssues = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousIssues).toEqual([]);
  // Step 4: nothing may scroll sideways at any width (CLAUDE.md rule 21).
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(view.width);
}
