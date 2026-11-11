/**
 * Staff › Website › Seasonal looks in a real browser (bundle G12a; the canvas's
 * StaffWebsiteSeasonal board).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an admin sees the four seasonal looks with their days, moves the first day of winter to
 *   1 December, and the public setting holds it;
 * - a change that would put one day in two looks is refused on the page, and nothing is saved;
 * - a moderator is told the page isn't theirs;
 * - axe finds nothing serious at 390, 768 and 1440 px, light and night, Romanian and English.
 * Test data: the seasonal_look_dates setting, put back to the decided days afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Puts the decided days back (the G2 migration's value). */
const resetSql = `update public.settings set value = '[{"look": "winter", "from": "01-08", "to": "02-29"}, {"look": "spring", "from": "03-01", "to": "05-31"}, {"look": "summer", "from": "06-01", "to": "08-31"}, {"look": "autumn", "from": "09-01", "to": "11-30"}]'::jsonb where key = 'seasonal_look_dates';`;

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Staff › Website › Seasonal looks (G12a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => runSql(resetSql));
  test.afterAll(() => {
    runSql(`${resetSql}
      update public.profiles set locale = 'ro' where handle in ('admin', 'moderator', 'owner');`);
  });

  test('an admin moves the start of winter, and an overlap is refused', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/website/seasonal');
    const list = page.getByRole('region', { name: 'The year' });
    await expect(list.getByRole('listitem')).toHaveCount(4);
    await expect(list.getByText('8 Jan to 29 Feb · every year')).toBeVisible();

    // Step 1: winter starting on 15 November would share days with autumn: refused here.
    await list.getByRole('button', { name: 'Change Winter' }).click();
    const form = page.getByRole('region', { name: 'Change Winter' });
    await form.getByLabel('Day').first().selectOption('15');
    await form.getByLabel('Month').first().selectOption({ label: 'November' });
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByText("Two looks can't share a day. Move one of them first."),
    ).toBeVisible();
    expect(
      runSql(`select value -> 0 ->> 'from' from public.settings where key = 'seasonal_look_dates'`),
    ).toBe('01-08');

    // Step 2: 1 December fits, and the public setting holds it.
    await form.getByLabel('Day').first().selectOption('1');
    await form.getByLabel('Month').first().selectOption({ label: 'December' });
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByText('Saved. Members with Seasonal themes on see the new days.'),
    ).toBeVisible();
    await expect(list.getByText('1 Dec to 29 Feb · every year')).toBeVisible();
    expect(
      runSql(`select value -> 0 ->> 'from' from public.settings where key = 'seasonal_look_dates'`),
    ).toBe('12-01');
    await page.context().close();
  });

  test('a moderator is told the page is not theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/website/seasonal');
    await expect(page.getByText('Only the owner and admins can edit the website.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'The year' })).toHaveCount(0);
    await page.context().close();
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
