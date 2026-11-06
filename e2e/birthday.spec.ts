/**
 * The optional birthday month and the Discover greeting in a real browser (stories S1-E2-12 and
 * S1-E2-13; Robert, 25 Oct 2026, 07:07 to 07:11; QA-7, 6 Nov 2026: the month only, never a day).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a signed-in person saves this month (Romanian date) in Settings › Birthday, and Discover says
 *   "Happy birthday month" to them by name; the panel offers no day at all;
 * - with no birthday, in the month they joined (from the first anniversary on), Discover says
 *   "Happy … anniversary"; on any other day it says good morning, afternoon or evening;
 * - a moderator corrects the birthday month from the account page, with a reason, and it lands in the
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

/** This month on the Romanian calendar, as the database counts it ('1' to '12'). */
function romanianMonth(): string {
  const month = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest',
    month: 'numeric',
  }).format(new Date());
  // Some ICU versions pad the month ("03"); the select's values are plain numbers ("3").
  return String(Number(month));
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
    runSql(`update public.profiles set birthday_month = null,
        created_at = '${joinedAt}'
      where id = '${adultWriterId}';
      update public.profiles set locale = 'ro' where handle in ('adult_writer', 'moderator');`);
  });

  test('this month saved gets "Happy birthday month", and no day is ever asked', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/settings');
    const panel = page.getByRole('region', { name: 'Birthday' });
    // CLAUDE.md rule 5 (QA-7): a day beside the year of birth would be a full date of birth.
    await expect(panel.getByLabel(/^Day/)).toHaveCount(0);
    await panel.getByLabel('Month').selectOption(romanianMonth());
    await panel.getByRole('button', { name: 'Save birthday' }).click();
    await expect(panel.getByText('Saved.')).toBeVisible();
    await page.goto('/discover');
    await expect(greeting(page)).toHaveText('Happy birthday month, Lia Scrie!');
  });

  test('the joining month gets the anniversary, other days a plain greeting', async ({
    browser,
  }) => {
    // No birthday, and an account that joined two years ago this month.
    runSql(`update public.profiles set birthday_month = null,
      created_at = now() - interval '2 years' where id = '${adultWriterId}';`);
    const page = await openAs(browser, 'adult_writer', '/discover');
    await expect(greeting(page)).toContainText('anniversary, Lia Scrie!');
    // Joined five months ago: an ordinary day.
    runSql(`update public.profiles set created_at = now() - interval '5 months'
      where id = '${adultWriterId}';`);
    await page.reload();
    await expect(greeting(page)).toHaveText(/^Good (morning|afternoon|evening), Lia Scrie\.$/);
  });

  test('a moderator corrects the birthday month with a reason, logged', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', `/staff/users/${adultWriterId}`);
    const actions = page.getByRole('region', { name: 'Actions' });
    await actions.getByRole('button', { name: 'Correct birthday' }).click();
    await actions.getByLabel('Month').selectOption('3');
    await actions.getByLabel('Reason (required)').fill(`${stamp}: they wrote to support.`);
    await actions.getByRole('button', { name: 'Save the birthday' }).click();
    await expect(actions.getByText('Done. The birthday is saved.')).toBeVisible();
    expect(
      runSql(`select birthday_month from public.profiles where id = '${adultWriterId}';`),
    ).toBe('3');
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
