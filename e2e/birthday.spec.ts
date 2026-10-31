/**
 * The optional birthday and the Discover greeting in a real browser (stories S1-E2-12 and
 * S1-E2-13; Robert, 25 Oct 2026, 07:07 to 07:11).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a signed-in person saves today's day and month (Romanian date) in Settings › Birthday, and
 *   Discover says "Happy birthday" to them by name;
 * - with only this month saved, Discover says "Happy birthday month";
 * - with no birthday, in the month they joined (from the first anniversary on), Discover says
 *   "Happy … anniversary"; on any other day it says good morning, afternoon or evening;
 * - a moderator corrects the birthday from the account page, with a reason, and it lands in the
 *   audit log;
 * - Settings with the Birthday panel passes axe and doesn't scroll sideways at 390, 768 and
 *   1440 px.
 * Test data: the seed persona adult_writer (pen name "Lia Scrie"); its birthday, joining date and
 * language are put back afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const stamp = `e2e birthday ${Date.now()}`;

/** Today's month and day on the Romanian calendar, as the database counts them. */
function romanianToday(): { month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  const valueOf = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  // Some ICU versions pad the day ("01"); the selects' values are plain numbers ("1").
  return { month: String(Number(valueOf('month'))), day: String(Number(valueOf('day'))) };
}

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The greeting line on Discover: the only line that ends with the persona's name. */
function greeting(page: Page) {
  return page.getByText(/, Lia Scrie[.!]$/);
}

// The joining date before this spec moves it, so it can be put back.
let joinedAt = '';

test.describe('birthday and anniversary greetings (S1-E2-12, S1-E2-13)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    joinedAt = runSql(`select created_at from public.profiles where id = '${adultWriterId}';`);
  });

  test.afterAll(() => {
    runSql(`update public.profiles set birthday_month = null, birthday_day = null,
        created_at = '${joinedAt}'
      where id = '${adultWriterId}';
      update public.profiles set locale = 'ro' where handle in ('adult_writer', 'moderator');`);
  });

  test('a birthday saved for today gets "Happy birthday" on Discover', async ({ browser }) => {
    const today = romanianToday();
    const page = await openAs(browser, 'adult_writer', '/settings');
    const panel = page.getByRole('region', { name: 'Birthday' });
    await panel.getByLabel('Month').selectOption(today.month);
    await panel.getByLabel('Day (optional)').selectOption(today.day);
    await panel.getByRole('button', { name: 'Save birthday' }).click();
    await expect(panel.getByText('Saved.')).toBeVisible();
    await page.goto('/discover');
    await expect(greeting(page)).toHaveText('Happy birthday, Lia Scrie!');
  });

  test('only the month gets "Happy birthday month"', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/settings');
    const panel = page.getByRole('region', { name: 'Birthday' });
    await panel.getByLabel('Day (optional)').selectOption('');
    await panel.getByRole('button', { name: 'Save birthday' }).click();
    await expect(panel.getByText('Saved.')).toBeVisible();
    await page.goto('/discover');
    await expect(greeting(page)).toHaveText('Happy birthday month, Lia Scrie!');
  });

  test('the joining month gets the anniversary, other days a plain greeting', async ({
    browser,
  }) => {
    // No birthday, and an account that joined two years ago this month.
    runSql(`update public.profiles set birthday_month = null, birthday_day = null,
      created_at = now() - interval '2 years' where id = '${adultWriterId}';`);
    const page = await openAs(browser, 'adult_writer', '/discover');
    await expect(greeting(page)).toContainText('anniversary, Lia Scrie!');
    // Joined five months ago: an ordinary day.
    runSql(`update public.profiles set created_at = now() - interval '5 months'
      where id = '${adultWriterId}';`);
    await page.reload();
    await expect(greeting(page)).toHaveText(/^Good (morning|afternoon|evening), Lia Scrie\.$/);
  });

  test('a moderator corrects the birthday with a reason, logged', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', `/staff/users/${adultWriterId}`);
    const actions = page.getByRole('region', { name: 'Actions' });
    await actions.getByRole('button', { name: 'Correct birthday' }).click();
    await actions.getByLabel('Month').selectOption('3');
    await actions.getByLabel('Day (optional)').selectOption('14');
    await actions.getByLabel('Reason (required)').fill(`${stamp}: they wrote to support.`);
    await actions.getByRole('button', { name: 'Save the birthday' }).click();
    await expect(actions.getByText('Done. The birthday is saved.')).toBeVisible();
    expect(
      runSql(`select birthday_month || '-' || birthday_day from public.profiles
        where id = '${adultWriterId}';`),
    ).toBe('3-14');
    expect(
      runSql(`select count(*) from public.audit_log where action = 'account.birthday_corrected'
        and reason like '${stamp}%';`),
    ).toBe('1');
  });

  for (const view of everyView(['/settings'])) {
    test(`Settings with the Birthday panel passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      const page = await openAs(browser, 'adult_writer', view.address);
      // The account's own language wins over the browser's (S1-E1-04), so save the view's.
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${adultWriterId}';`,
      );
      await checkScreen(page, view);
      await expect(page.locator('#settings-birthday-month')).toBeVisible();
    });
  }
});
