/**
 * Seasonal doodles in a real browser (stories S1-E11-11 and S1-E5-07).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a visitor sees today's seasonal doodle beside the Discover heading, decorative and hidden from
 *   screen readers (S1-E5-07 criteria 1 and 4);
 * - an admin adds a one-day occasion for today; being shorter than anything else it wins, and a
 *   visitor sees its doodle with no release; removing it brings the earlier doodle back (S1-E11-11
 *   criteria 1, 3 and 5; S1-E5-07 criterion 3);
 * - a last day before the first is refused with the field named;
 * - the year view shows the seeded seasons with no gaps (S1-E11-11 criterion 4);
 * - a moderator is told the page isn't theirs (admin-only, decided 17 Oct 2026, 19:19);
 * - the tab passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: seed personas and the seeded schedule; the occasion this spec adds is removed by the
 * spec itself, and deleted afterwards if a step failed.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The test occasion's English name, unique to this run. */
const occasionName = `Bee day ${String(Date.now())}`;

/** Opens an address in English, as a persona or as a visitor. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The doodle Discover's heading shows. */
function discoverDoodle(page: Page) {
  return page.locator('img[data-doodle-on="discover-heading"]');
}

/** The doodle the database gives Discover today, with dashes as in the file names. */
function todaysDoodleFile(): string {
  return runSql(
    "select doodle from public.current_seasonal_doodle(current_date, 'discover');",
  ).replaceAll('_', '-');
}

test.describe('Seasonal doodles (S1-E11-11, S1-E5-07)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.seasonal_occasions where name_en like 'Bee day %';
      update public.profiles set locale = 'ro' where handle in ('admin', 'owner', 'moderator');`);
  });

  test('a visitor sees today’s doodle beside the Discover heading, decorative', async ({
    browser,
  }) => {
    const page = await openAs(browser, null, '/discover');
    const doodle = discoverDoodle(page);
    await expect(doodle).toHaveAttribute('src', new RegExp(todaysDoodleFile()));
    await expect(doodle).toHaveAttribute('aria-hidden', 'true');
    await expect(doodle).toHaveAttribute('alt', '');
  });

  test('an admin adds an occasion for today, a visitor sees it, and removing it undoes it', async ({
    browser,
  }) => {
    const before = todaysDoodleFile();
    const page = await openAs(browser, 'admin', '/staff/website/seasonal');
    // Step 1: a last day before the first is refused, named under its field.
    await page.getByRole('button', { name: 'Add an occasion' }).click();
    const form = page.getByRole('form', { name: 'Occasion' });
    await form.getByLabel('Name in Romanian').fill('Ziua albinelor');
    await form.getByLabel('Name in English').fill(occasionName);
    await form.getByLabel('Every year').uncheck();
    await form.getByLabel('Last day').fill('2020-01-01');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form.getByText('Pick a last day on or after the first day.')).toBeVisible();
    // Step 2: one day, today, with the bee: shorter than anything else, so it wins.
    const today = runSql('select current_date;');
    await form.getByLabel('Last day').fill(today);
    await form.getByRole('radio', { name: 'Bee' }).check();
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved. Readers see the change within a minute.')).toBeVisible();

    const visitor = await openAs(browser, null, '/discover');
    await expect(discoverDoodle(visitor)).toHaveAttribute('src', /bee/);

    // Step 3: removing it brings the earlier doodle back.
    await page.getByRole('button', { name: `Remove ${occasionName}` }).click();
    await expect(page.getByText('Removed from the schedule.', { exact: false })).toBeVisible();
    const later = await openAs(browser, null, '/discover');
    await expect(discoverDoodle(later)).toHaveAttribute('src', new RegExp(before));
  });

  test('the year view shows the seasons and no day without a doodle', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/website/seasonal');
    const year = page.getByRole('region', { name: /The year/ });
    await expect(year.getByText(/^Halloween \(days 25 to 31\)/)).toBeVisible();
    await expect(year.getByText(/with no doodle/)).toHaveCount(0);
  });

  test('a moderator is told the page is not theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/website/seasonal');
    await expect(page.getByText('Only the owner and admins can edit the website.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add an occasion' })).toHaveCount(0);
  });

  for (const view of everyView(['/staff/website/seasonal'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
