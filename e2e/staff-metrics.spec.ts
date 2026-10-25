/**
 * The staff Metrics page in a real browser (story S1-E15-02; board AdminMetrics, screen 8.7).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - the owner sees the three March numbers with their targets and progress bars, the return rate
 *   labelled an approximation, writers by market and reads per day (criteria 1 and 2);
 * - a moderator is told the numbers are for the owner and admins and pointed to the queue, and a
 *   member is refused (architecture 1.8.3); the database refuses both (pgTAP 156);
 * - the page passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas; the nightly count is run once by hand first.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('staff metrics (S1-E15-02)', () => {
  test.describe.configure({ mode: 'serial' });
  // The nightly job, run now so yesterday's numbers exist (the seed loads after the migration's
  // own 30-day count).
  test.beforeAll(() => {
    runSql('select public.run_daily_metrics();');
  });
  test.afterAll(() => {
    runSql(`update public.profiles set locale = 'ro'
      where handle in ('owner', 'moderator', 'adult_writer');`);
  });

  test('the owner sees the March numbers against their targets', async ({ browser }) => {
    const page = await openAs(browser, 'owner', '/staff/metrics');
    await expect(page.getByRole('heading', { name: 'The March test numbers' })).toBeVisible();
    await expect(page.getByText(/^Counted on /)).toBeVisible();
    const targets = page.getByRole('region', { name: 'The March targets' });
    await expect(targets.getByText('Writers who published')).toBeVisible();
    await expect(targets.getByText('Signed-up readers')).toBeVisible();
    await expect(targets.getByText('Return rate')).toBeVisible();
    await expect(targets.getByText('Approximation')).toBeVisible();
    await expect(targets.getByRole('progressbar')).toHaveCount(3);
    await expect(targets.getByText(/^Target 20 · \d+% of the way$/)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Writers who published, by country' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chapter reads per day' })).toBeVisible();
    // Totals only: no user ID anywhere on the page (architecture 1.6).
    await expect(page.locator('body')).not.toContainText('00000000-0000-4000-8000');
  });

  test('a moderator is pointed to the queue and a member is refused', async ({ browser }) => {
    const moderatorPage = await openAs(browser, 'moderator', '/staff/metrics');
    await expect(
      moderatorPage.getByText('The March numbers are for the owner and admins.', { exact: false }),
    ).toBeVisible();
    await expect(
      moderatorPage.getByRole('link', { name: 'Open the moderation queue' }),
    ).toHaveAttribute('href', '/staff/moderation');
    await expect(moderatorPage.getByRole('progressbar')).toHaveCount(0);

    const memberPage = await openAs(browser, 'adult_writer', '/staff/metrics');
    await expect(memberPage.getByRole('heading', { name: 'This part is for staff' })).toBeVisible();
    await expect(memberPage.getByRole('progressbar')).toHaveCount(0);
  });

  for (const view of everyView(['/staff/metrics'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
