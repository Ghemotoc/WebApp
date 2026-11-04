/**
 * Staff › Sponsors in a real browser: a sponsor, a campaign, the review with its minors check and
 * what we never advertise (story S1-E12-02 criteria 1 and 2; bundle SPONSORS-b2).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an admin adds a sponsor, sets up a "Sponsored by" campaign on the Poetry category with its
 *   dates and sends it for review (criterion 1);
 * - approving is refused until every check is ticked, the minors check included, and then the
 *   campaign shows as Live (criterion 2);
 * - the fixed categories we never advertise carry "Fixed" and no Remove button;
 * - the page and the campaign form pass axe and never scroll sideways at 390, 768 and 1440 px.
 * Test data: the sponsor "E2E Bookshop" and its campaigns, made through the screens and deleted
 * afterwards (the audit log keeps its rows).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The test sponsor's name. */
const sponsorName = 'E2E Bookshop';

/** Removes the test sponsor and its campaigns. */
const cleanUpSql = `
  delete from public.sponsor_campaigns where sponsor_id in (select id from public.sponsors where name = '${sponsorName}');
  delete from public.sponsors where name = '${sponsorName}';`;

/** Today and a later day as YYYY-MM-DD, for the date fields. */
function dayFromToday(days: number): string {
  const day = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return day.toISOString().slice(0, 10);
}

/**
 * Opens an address in English as the admin persona.
 *
 * @param browser - Playwright's browser
 * @param address - where to go
 * @returns the page
 */
async function openAsAdmin(browser: Browser, address: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = 'admin';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('admin')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Staff › Sponsors (S1-E12-02)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => runSql(cleanUpSql));
  test.afterAll(() => {
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle = 'admin';`);
  });

  test('an admin sets up a sponsored category, and it goes live only after every check', async ({
    browser,
  }) => {
    const page = await openAsAdmin(browser, '/staff/sponsors');
    // Step 1: the sponsor.
    await page.getByLabel('Sponsor’s name').fill(sponsorName);
    await page.getByRole('button', { name: 'Add sponsor' }).click();
    await expect(page.getByText('Sponsor added.')).toBeVisible();

    // Step 2: the campaign, saved as a draft, then sent for review.
    await page.getByRole('link', { name: 'New campaign' }).click();
    await page.getByLabel('Sponsor', { exact: true }).selectOption({ label: sponsorName });
    await page.getByLabel('Campaign name').fill('Poetry, sponsored');
    await page.getByLabel('Placement').selectOption({ label: 'Sponsored by: a category' });
    await page.getByLabel('Category it sponsors').selectOption({ label: 'Poetry' });
    await page.getByLabel('Starts').fill(dayFromToday(-1));
    await page.getByLabel('Ends').fill(dayFromToday(30));
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page).toHaveURL(/\/staff\/sponsors\/campaigns\/[0-9a-f-]{36}$/);
    await page.getByRole('button', { name: 'Send for review' }).click();
    await expect(page.getByText('Sent for review.')).toBeVisible();

    // Step 3: approving without the checks is refused; with them, it is live.
    await page.getByRole('link', { name: 'Back to Sponsors' }).click();
    const card = page.getByRole('listitem').filter({ hasText: 'Poetry, sponsored' });
    await card.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Tick every check before you approve.')).toBeVisible();
    for (const check of await card.getByRole('checkbox').all()) await check.check();
    await card.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText(/^Approved\. It goes live on its start date/)).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: 'Poetry, sponsored' });
    await expect(row.getByText('Live')).toBeVisible();
    await page.context().close();
  });

  test('the fixed categories we never advertise can’t be removed', async ({ browser }) => {
    const page = await openAsAdmin(browser, '/staff/sponsors');
    const list = page.getByRole('region', { name: 'Never advertised' });
    const alcohol = list.getByRole('listitem').filter({ hasText: 'Alcohol' });
    await expect(alcohol.getByText('Fixed')).toBeVisible();
    await expect(alcohol.getByRole('button')).toHaveCount(0);
    await expect(list.getByRole('button', { name: 'Remove “Weight loss”' })).toBeVisible();
    await page.context().close();
  });

  for (const width of [390, 768, 1440]) {
    for (const address of ['/staff/sponsors', '/staff/sponsors/campaigns/new']) {
      test(`${address} passes axe at ${width} px and never scrolls sideways`, async ({
        browser,
      }) => {
        const page = await openAsAdmin(browser, address);
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
          .analyze();
        const serious = results.violations.filter((violation) =>
          ['serious', 'critical'].includes(violation.impact ?? ''),
        );
        expect(serious).toEqual([]);
        const isWider = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        expect(isWider).toBe(false);
        await page.context().close();
      });
    }
  }
});
