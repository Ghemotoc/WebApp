/**
 * The Metrics page's live numbers and the compliance log in a real browser (story S1-E11-04;
 * board AdminMetrics, screen 8.7).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - the admin sees sign-ups by age group, age checks and reports by tier, and nothing on the page
 *   names a person or shows a year of birth (criterion 1);
 * - the admin logs a legal request with its authority, date and content, records the action
 *   taken, and downloads the DSA log as CSV (criterion 2);
 * - the ANCOM launch task gives the due date 45 days after the launch date (Law 50/2024);
 * - the page passes axe and doesn't scroll sideways at 390 px (in Romanian), 768 and 1440 px, with
 *   an open entry and the log form open.
 * The axe loop over every view, theme and language is in staff-metrics.spec.ts (the owner).
 * Test data: the admin persona in English; the spec's entries (authority starting "E2E") and the
 * launch date are removed afterwards. Audit log rows stay: nobody can delete them.
 */
import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Removes the spec's entries and puts the launch date back to "not set". */
function cleanUp() {
  runSql(`delete from public.compliance_log_entries where authority like 'E2E%';
    update public.settings set value = '""'::jsonb where key = 'launch_date';`);
}

/** Opens the Metrics page as the admin, at a width, in a language (English unless told). */
async function openMetrics(browser: Browser, width = 1440, language = 'en'): Promise<Page> {
  runSql(`update public.profiles set locale = '${language}' where handle = 'admin';`);
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona('admin')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto('/staff/metrics');
  await expect(page.locator('#metrics-compliance')).toBeVisible();
  return page;
}

/** Checks axe and the page width. */
async function expectAccessibleAndFitting(page: Page, width: number) {
  // The page rises in; axe would read the colours half-way through.
  await waitForAnimationsToFinish(page);
  // Reduce motion ends every animation at once, so axe measures the colours the screen
  // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(width);
}

test.describe('metrics and the compliance log (S1-E11-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('the admin sees sign-ups by age group, age checks and reports by tier', async ({
    browser,
  }) => {
    const page = await openMetrics(browser);
    const signUps = page.getByRole('region', { name: 'Sign-ups by age group' });
    await expect(signUps.getByText('16 to 17')).toBeVisible();
    await expect(
      signUps.getByText('We show the age group only, never the year of birth.'),
    ).toBeVisible();
    const ageChecks = page.getByRole('region', { name: 'Age checks' });
    await expect(ageChecks.getByText('Passed')).toBeVisible();
    // Manual age checks count as appealed since S1-E2-08b, so the tile shows a number.
    await expect(ageChecks.getByText('Appealed', { exact: true })).toBeVisible();
    await expect(ageChecks.getByText(/requests for a manual age check/)).toBeVisible();
    const tiers = page.getByRole('region', { name: 'Reports by tier' });
    await expect(
      tiers.getByRole('cell', { name: 'Removal order from an authority' }),
    ).toBeVisible();
    await expect(tiers.getByRole('cell', { name: '7 days' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Cookieless analytics' })).toContainText(
      'Off for now',
    );
    // Totals only: no user ID anywhere on the page (architecture 1.6).
    await expect(page.locator('body')).not.toContainText('00000000-0000-4000-8000');
    await page.context().close();
  });

  test('the admin logs a request, records the action and exports the log', async ({ browser }) => {
    const page = await openMetrics(browser);
    const log = page.getByRole('region', { name: 'Authority orders and legal requests' });
    await log.getByRole('button', { name: 'Log a request' }).click();
    const form = page.getByRole('form', { name: 'Log a request' });
    await form.getByLabel('Authority').fill('E2E Police, Prahova county');
    await form.getByLabel('What they asked for').fill('Asked for sign-up data of one account');
    await form.getByRole('button', { name: 'Save to the log' }).click();
    await expect(log.getByText(/^Saved as LR-\d{3,}\.$/)).toBeVisible();
    const row = log.getByRole('row', { name: /E2E Police, Prahova county/ });
    await expect(row).toContainText('Asked for sign-up data of one account');

    // Recording the action closes the entry; it can't be changed afterwards.
    await row.getByRole('button', { name: /^Record the action for LR-/ }).click();
    await page
      .getByRole('textbox', { name: /^What was done about LR-/ })
      .fill('Checked with our lawyer, then answered');
    await page.getByRole('button', { name: 'Save as done' }).click();
    await expect(row).toContainText('Checked with our lawyer, then answered');
    await expect(row.getByRole('button')).toHaveCount(0);

    // The export downloads every row as CSV.
    const downloadStarted = page.waitForEvent('download');
    await log.getByRole('button', { name: 'Export DSA log (CSV)' }).click();
    const download = await downloadStarted;
    expect(download.suggestedFilename()).toMatch(/^dsa-log-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await readFile(await download.path(), 'utf8');
    expect(csv).toContain('"E2E Police, Prahova county"');
    expect(csv).toContain('Checked with our lawyer, then answered');
    await page.context().close();
  });

  test('the launch task shows the ANCOM due date from the launch date', async ({ browser }) => {
    const page = await openMetrics(browser);
    const launch = page.getByRole('region', { name: 'Notify ANCOM within 45 days of launch' });
    await expect(launch).toContainText('Set the launch date to see when it is due.');
    await launch.getByLabel('Launch date').fill('2027-03-01');
    await launch.getByRole('button', { name: 'Save the date' }).click();
    await expect(launch).toContainText(/Due .*15 April 2027/);
    await page.context().close();
  });

  // Romanian at 390 px: its longer words (the open entry's "Record the action" button) must still
  // wrap inside the screen.
  for (const [width, language] of [
    [390, 'ro'],
    [768, 'en'],
    [1440, 'en'],
  ] as const) {
    test(`the page with an open entry and the form open passes axe and fits at ${width} px`, async ({
      browser,
    }) => {
      runSql(`insert into public.compliance_log_entries (user_id, entry_kind, authority, received_at, content)
        values ('00000000-0000-4000-8000-000000000009', 'legal_request', 'E2E ANCOM', now(),
          'Asked for our DSA contact point details');`);
      const page = await openMetrics(browser, width, language);
      await page.getByRole('button', { name: /LR-\d+/ }).click();
      await expect(page.getByRole('form')).toHaveCount(1);
      await expectAccessibleAndFitting(page, width);
      await page.context().close();
      cleanUp();
    });
  }
});
