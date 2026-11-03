/**
 * Turning a support ticket into a report or a data request in a real browser (story S1-E11-13,
 * part 13b; bundle ADMIN-2h4b; criteria 10 and 11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - support converts a ticket about a child's safety, with no address, into a report for the
 *   moderation team; the ticket lists the report and its history says so;
 * - support opens a data request from a member's ticket and follows the link to its page;
 * - a ticket from someone without an account says the request must be answered by email.
 * Test data: seed personas; the tickets, notices and requests made here are removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Makes this run's subjects unique, so a rerun finds its own tickets. */
const stamp = Date.now().toString(36);

/** Opens a staff ticket page in English as the support persona. */
async function openAsSupport(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = 'support';`);
  await useSessionInBrowser(context, (await signInPersona('support')).session);
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

test.describe('support tickets to reports and data requests (S1-E11-13, ADMIN-2h4b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.public_notices where support_ticket_id in
        (select id from public.support_tickets where subject like '%${stamp}%');
      delete from public.data_requests where support_ticket_id in
        (select id from public.support_tickets where subject like '%${stamp}%');
      delete from public.support_tickets where subject like '%${stamp}%';
      update public.profiles set locale = 'ro' where handle = 'support';`);
  });

  test('support converts a ticket about a child into a report', async ({ browser }) => {
    const number = addTicket(`Worried about a friend ${stamp}`);
    const page = await openAsSupport(browser, `/staff/support/${number}`);
    await page.getByLabel('Reason').selectOption('threat_to_minor');
    await page.getByLabel('What the ticket says is wrong').fill('A friend may be in danger.');
    await page.getByRole('button', { name: 'Convert to report' }).click();
    await expect(page.getByText(/the moderation team checks it by hand/)).toBeVisible();

    const started = page.getByRole('list', { name: 'Started from this ticket' });
    await expect(started.getByText(/Report N-\d{6} sent to the moderation team/)).toBeVisible();
    const history = page.getByRole('region', { name: 'History' });
    await expect(history.getByText(/N-\d{6}/)).toBeVisible();
  });

  test('support opens a data request from a member’s ticket', async ({ browser }) => {
    const number = addTicket(`Copy of my data ${stamp}`);
    const page = await openAsSupport(browser, `/staff/support/${number}`);
    await page.getByLabel('What the person asks for').selectOption('copy');
    await page.getByRole('button', { name: 'Open data request' }).click();
    const started = page.getByRole('list', { name: 'Started from this ticket' });
    await started
      .getByRole('link', { name: /Data request .+ \(A copy of their data\), due/ })
      .click();
    await expect(page.getByRole('heading', { name: /^Data request / })).toBeVisible();
  });

  test('a ticket from someone without an account is answered by email', async ({ browser }) => {
    const number = addTicket(`Delete me ${stamp}`, 'stranger@example.test');
    const page = await openAsSupport(browser, `/staff/support/${number}`);
    await expect(page.getByText(/This person has no account/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open data request' })).toHaveCount(0);
  });
});
