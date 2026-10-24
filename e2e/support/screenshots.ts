/**
 * Screenshots of a screen at 390, 768 and 1440 px, for the pull request's quality check (story
 * S1-E3-01; every story's prompt asks for them next to the board render).
 *
 * Who runs it: `npx playwright test e2e/screenshots.spec.ts` with SCREENSHOT_ADDRESSES set to the
 * addresses to capture, comma-separated, and SCREENSHOT_PERSONA to the persona to sign in as.
 * Pictures land in test-results/screenshots/<address>-<width>.png. Never part of CI.
 */
import type { Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY, screenWidths } from './accessibility';

/**
 * Captures one address at the three widths, in English.
 *
 * @param page - a page already signed in as needed
 * @param address - the address to open
 */
export async function captureAtEveryWidth(page: Page, address: string): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  for (const width of screenWidths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(address);
    await page.waitForTimeout(700);
    const fileName = `${address.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-${width}.png`;
    await page.screenshot({ path: `test-results/screenshots/${fileName}`, fullPage: true });
  }
}
