/**
 * End-to-end tests for the error, offline and maintenance states (story S1-E1-05), against the
 * real local Supabase.
 *
 * Acceptance criteria covered:
 * - "Given the network drops, when the user is in the app, then an offline banner appears" (the
 *   unsaved editor text part comes with the editor, S1-E3-02).
 * - "Given maintenance mode switched on in admin, when a user opens the app, then they see a
 *   maintenance page while staff can still sign in." Until the settings screen (S1-E11-03) the
 *   flag is switched in SQL, as an admin does in the SQL editor.
 * - "Given an unexpected error, when it is reported to error tracking, then no email, IP address
 *   or user content is included."
 * The 404 page is S1-E2-QA's and stays as it is (its search link waits for S1-E5-04).
 * Every new screen is checked with axe at 390, 768 and 1440 px, light and night, ro and en.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Switches maintenance mode, as an admin does in the SQL editor until S1-E11-03. */
function setMaintenanceMode(isOn: boolean) {
  runSql(`update public.feature_flags set is_enabled = ${isOn} where key = 'maintenance_mode';`);
}

/** Opens the app in English, as a browser that chose English before would. */
async function useEnglish(page: Page) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
}

test.describe('maintenance mode (S1-E1-05)', () => {
  test.beforeAll(() => setMaintenanceMode(true));
  test.afterAll(() => setMaintenanceMode(false));
  test.beforeEach(async ({ page }) => useEnglish(page));

  test('a visitor sees the maintenance page, and the log-in page stays open', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /updating/i })).toBeVisible();

    await page.getByRole('link', { name: 'Staff sign-in' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole('heading', { level: 1, name: /updating/i })).toHaveCount(0);
  });

  test('a signed-in member still sees the maintenance page', async ({ page }) => {
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    await page.goto('/settings');
    // The member's account language (Romanian) wins over the browser's, so either wording counts.
    await expect(
      page.getByRole('heading', { level: 1, name: /updating|Actualizăm/i }),
    ).toBeVisible();
  });

  test('staff can still use the app', async ({ page }) => {
    await useSessionInBrowser(page.context(), (await signInPersona('admin')).session);
    await page.goto('/staff/roles');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /updating|Actualizăm/i })).toHaveCount(
      0,
    );
  });

  test('"Check again" opens the app once maintenance is over', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /updating/i })).toBeVisible();
    setMaintenanceMode(false);
    await page.getByRole('button', { name: 'Check again' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /updating/i })).toHaveCount(0);
    setMaintenanceMode(true);
  });

  for (const view of everyView(['/'])) {
    test(`axe: the maintenance page at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});

test.describe('offline banner (S1-E1-05)', () => {
  test('appears when the network drops and says when it is back', async ({ page, context }) => {
    await page.goto('/legal/terms');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByRole('status').filter({ hasText: /Nu ești conectat/ })).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByRole('status').filter({ hasText: /Ești din nou online/ })).toBeVisible();
  });

  for (const width of [390, 768, 1440]) {
    test(`axe: the offline banner at ${width} px`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/legal/terms');
      await context.setOffline(true);
      await expect(page.getByRole('status').filter({ hasText: /Nu ești conectat/ })).toBeVisible();
      // The page is already loaded, so axe can check it with the banner showing. First let every
      // entrance animation finish: axe measures colours as they are, and a fading line reads paler.
      await page.waitForFunction(() =>
        document.getAnimations().every((animation) => animation.playState !== 'running'),
      );
      // Reduce motion ends every animation at once, so axe measures the colours the screen
      // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.filter(
          (issue) => issue.impact === 'serious' || issue.impact === 'critical',
        ),
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await context.setOffline(false);
    });
  }
});

test.describe('error log (S1-E1-05)', () => {
  test.afterEach(() =>
    runSql(`delete from public.client_errors where error_message like '%e2e-marker%';`),
  );

  test('an uncaught error is logged without the email, the code in the address or the quoted text', async ({
    page,
  }) => {
    await page.goto('/join/SECRETINVITECODE');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // An error nothing catches, carrying personal data the log must never keep.
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('e2e-marker for ana.pop@example.com typed "my secret poem"');
      });
    });

    await expect
      .poll(() =>
        runSql(
          `select count(*) from public.client_errors where error_message like '%e2e-marker%';`,
        ),
      )
      .toBe('1');
    const storedRow = runSql(
      `select error_name || '|' || error_message || '|' || route_path || '|' || app_version from public.client_errors where error_message like '%e2e-marker%';`,
    );
    expect(storedRow).toBe('Error|e2e-marker for [email] typed [text]|/join/:code|local');
    expect(storedRow).not.toContain('SECRETINVITECODE');
  });
});
