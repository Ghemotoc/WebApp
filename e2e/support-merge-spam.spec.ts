/**
 * Merging support tickets and marking spam in a real browser (story S1-E11-13, part 13b; bundle
 * ADMIN-2h4a; criteria 9 and 13).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - support merges a member's second ticket into their first from the ticket page; the history
 *   says so, and the member's old request links to the one that stayed;
 * - support marks a ticket as spam: it shows in the Spam view only and can't be answered;
 *   "Not spam" takes it back.
 * Test data: seed personas; the tickets made here are removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Makes this run's subjects unique, so a rerun finds its own tickets. */
const stamp = Date.now().toString(36);

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Adds a ticket for adult_writer, or an email-only one, and returns its number. */
function addTicket(subject: string, email: string | null = null): string {
  const requester =
    email === null ? `'00000000-0000-4000-8000-000000000001', null` : `null, '${email}'`;
  runSql(`
    insert into public.support_tickets (requester_user_id, requester_email, subject, channel, last_message_at)
    values (${requester}, '${subject}', '${email === null ? 'in_app' : 'email'}', now());`);
  return runSql(`select number from public.support_tickets where subject = '${subject}';`);
}

test.describe('merging support tickets and spam (S1-E11-13, ADMIN-2h4a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.support_tickets where subject like '%${stamp}%';
      update public.profiles set locale = 'ro' where handle in ('adult_writer', 'support');`);
  });

  test('support merges two tickets and the member is pointed to the one that stays', async ({
    browser,
  }) => {
    const first = addTicket(`Drafts gone ${stamp}`);
    const second = addTicket(`Drafts still gone ${stamp}`);
    const page = await openAs(browser, 'support', `/staff/support/${second}`);
    await page.getByLabel('Merge into ticket number').fill(first);
    await page.getByRole('button', { name: 'Merge', exact: true }).click();
    await expect(page.getByRole('link', { name: `Merged into #${first}` })).toBeVisible();
    const history = page.getByRole('region', { name: 'History' });
    await expect(history.getByText(`@support: Merged into #${first}`)).toBeVisible();

    const member = await openAs(browser, 'adult_writer', `/support/${second}`);
    await member.getByRole('link', { name: `This request continues as #${first}` }).click();
    await expect(member.getByRole('heading', { name: `Drafts gone ${stamp}` })).toBeVisible();
  });

  test('support marks a ticket as spam and takes it back', async ({ browser }) => {
    const number = addTicket(`Buy now ${stamp}`, 'spammer@example.test');
    const page = await openAs(browser, 'support', `/staff/support/${number}`);
    await page.getByRole('button', { name: 'Mark as spam' }).click();
    await expect(page.getByText(/Marked as spam: it shows only in the Spam view/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send answer' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Back to the inbox' }).click();
    await expect(page.getByRole('link', { name: `Buy now ${stamp}` })).toHaveCount(0);
    await page.getByRole('button', { name: /^Spam/ }).click();
    await page.getByRole('link', { name: `Buy now ${stamp}` }).click();
    await page.getByRole('button', { name: 'Not spam' }).click();
    await expect(page.getByRole('button', { name: 'Send answer' })).toBeVisible();
  });
});
