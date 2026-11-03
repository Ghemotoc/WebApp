/**
 * Support ticket emails, out and in, in a real browser and against the local Pages Functions
 * (story S1-E11-13, part 13a; bundle ADMIN-2h2).
 *
 * Who runs it: `npm run test:e2e` (Supabase with Mailpit started first). Local pg_cron never calls
 * out, so the test wakes the worker itself with the seeded local worker key, and plays Brevo's
 * inbound parsing by posting to /api/support-inbound with the local key (playwright.config.ts).
 * What it proves:
 * - a new in-app ticket is acknowledged by email with "[#number]" in the subject (criterion 2);
 * - a staff answer shows "Waiting to be emailed", then goes out with the number, our Message-ID
 *   and the answer, and shows "Emailed" (criterion 3);
 * - the person's emailed answer lands in the same ticket, "by email", and opens it again;
 * - an email from an unknown address starts an "email only" ticket, acknowledged in both languages;
 * - the inbound webhook refuses a wrong key;
 * - the inbox shows its saved views with counts and the first-reply timer (part h3a);
 * - a ticket left waiting for the person is solved with a polite email (part h3a).
 * Test data: teen_17 and the support persona; the tickets made here are removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { waitForEmail } from './support/mailpit';
import { signInPersona, useSessionInBrowser } from './support/personas';

const stamp = Date.now().toString(36);
const subject = `Email thread ${stamp}`;
const memberEmail = 'teen_17@personas.test';
const strangerEmail = `stranger-${stamp}@example.test`;
const workerKey = 'local-only-email-worker-key-not-for-staging';
const inboundKey = 'local-e2e-inbound-key';
const mailpitUrl = 'http://127.0.0.1:54324/api/v1';

/** Opens a staff ticket page in English as the support persona. */
async function openStaffTicket(browser: Browser, ticketNumber: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = 'support';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('support')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(`/staff/support/${ticketNumber}`);
  return page;
}

/** The member's ticket number. */
function ticketNumber(): string {
  return runSql(`select number from public.support_tickets where subject = '${subject}'`);
}

/** The headers of the newest email to an address with a word in its subject. */
async function headersOf(address: string, subjectWord: string): Promise<Record<string, string[]>> {
  const query = encodeURIComponent(`to:"${address}" subject:"${subjectWord}"`);
  const { messages } = (await (await fetch(`${mailpitUrl}/search?query=${query}`)).json()) as {
    messages: { ID: string }[];
  };
  const id = messages[0]?.ID ?? '';
  return (await (await fetch(`${mailpitUrl}/message/${id}/headers`)).json()) as Record<
    string,
    string[]
  >;
}

test.describe('support ticket emails (S1-E11-13, ADMIN-2h2)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    // The server signs inbound emails with SUPPORT_TICKET_SECRET; the database checks the same
    // value in its Vault (shared with e2e/support-tickets.spec.ts). Never a real secret.
    runSql(`
      do $$ begin
        if not exists (select 1 from vault.secrets where name = 'support_ticket_secret') then
          perform vault.create_secret('local-e2e-support-secret', 'support_ticket_secret');
        end if;
      end $$;
      update public.support_ticket_emails set sent_at = now() where sent_at is null;`);
  });

  test.afterAll(() => {
    runSql(`
      delete from public.support_tickets where subject like '%${stamp}%' or requester_email = '${strangerEmail}';
      update public.profiles set locale = 'ro' where handle = 'support';`);
  });

  /** Wakes the worker as pg_cron would. */
  async function runWorker(request: import('@playwright/test').APIRequestContext) {
    const response = await request.post('/api/support-emails', {
      headers: { Authorization: `Bearer ${workerKey}` },
    });
    expect(response.status()).toBe(200);
  }

  test('a new in-app ticket is acknowledged by email with its number', async ({ request }) => {
    runSql(`
      with ticket as (
        insert into public.support_tickets (requester_user_id, subject, channel)
        values ('00000000-0000-4000-8000-000000000002', '${subject}', 'in_app') returning id)
      insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
      select id, 'from_requester', '00000000-0000-4000-8000-000000000002', 'Where is my chapter?', 'in_app' from ticket;`);
    await runWorker(request);
    const email = await waitForEmail(memberEmail, 15_000, `#${ticketNumber()}`);
    expect(email.Subject).toContain(`[#${ticketNumber()}]`);
    expect(email.Text).toContain(`/support/${ticketNumber()}`);
  });

  test('a staff answer is emailed with the number and our Message-ID', async ({
    browser,
    request,
  }) => {
    const page = await openStaffTicket(browser, ticketNumber());
    await page.getByLabel('Answer the person, or add a note').fill(`It is in Drafts ${stamp}.`);
    await page.getByRole('button', { name: 'Send answer' }).click();
    await expect(page.getByText('Waiting to be emailed')).toBeVisible();
    await runWorker(request);
    const email = await waitForEmail(memberEmail, 15_000, `Re: ${subject}`);
    expect(email.Subject).toBe(`Re: ${subject} [#${ticketNumber()}]`);
    expect(email.Text).toContain(`It is in Drafts ${stamp}.`);
    const headers = await headersOf(memberEmail, `Re: ${subject}`);
    expect(headers['Message-Id']?.[0] ?? headers['Message-ID']?.[0]).toMatch(
      /support-[0-9a-f-]{36}@/,
    );
    await page.reload();
    await expect(page.getByText('Emailed', { exact: false })).toBeVisible();
  });

  test('the person’s emailed answer lands in the same ticket and reopens it', async ({
    browser,
    request,
  }) => {
    const token = runSql(`
      select emails.message_token from public.support_ticket_emails as emails
      join public.support_tickets as tickets on tickets.id = emails.ticket_id
      where tickets.subject = '${subject}' and emails.kind = 'staff_reply'`);
    const response = await request.post(`/api/support-inbound?key=${inboundKey}`, {
      data: {
        items: [
          {
            From: { Address: memberEmail },
            Subject: 'Re: my question',
            MessageId: `<answer-${stamp}@example.test>`,
            InReplyTo: `<${token}@example.test>`,
            ExtractedMarkdownMessage: `Found it, thanks ${stamp}`,
          },
        ],
      },
    });
    expect(await response.json()).toEqual({ received: 1, skipped: 0 });
    const page = await openStaffTicket(browser, ticketNumber());
    await expect(page.getByText(`Found it, thanks ${stamp}`)).toBeVisible();
    await expect(page.getByText(/by email/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Ticket' }).getByLabel('Status')).toHaveValue(
      'open',
    );
  });

  test('an email from an unknown address starts an email-only ticket', async ({ request }) => {
    const response = await request.post(`/api/support-inbound?key=${inboundKey}`, {
      data: {
        items: [
          {
            From: { Address: strangerEmail },
            Subject: `Is it free? ${stamp}`,
            MessageId: `<question-${stamp}@example.test>`,
            RawTextBody: 'Hello, is reading free?',
          },
        ],
      },
    });
    expect(response.status()).toBe(200);
    await runWorker(request);
    const email = await waitForEmail(strangerEmail);
    expect(email.Subject).toContain('Am primit cererea ta');
    expect(email.Text).toContain('— English —');
    expect(email.Text).not.toContain('/support/');
  });

  test('the inbox shows saved views with counts and the first-reply timer', async ({ browser }) => {
    runSql(`update public.profiles set locale = 'en' where handle = 'support';`);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('support')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/staff/support');
    const views = page.getByRole('group', { name: 'Views' });
    await expect(views.getByRole('button', { name: /^All open \(\d+\)$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await views.getByRole('button', { name: /^Unassigned/ }).click();
    await expect(views.getByRole('button', { name: /^Unassigned/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const strangerRow = page.getByRole('listitem').filter({ hasText: `Is it free? ${stamp}` });
    await expect(strangerRow.getByText(/^Answer by /)).toBeVisible();
  });

  test('a ticket left waiting for the person is solved with a polite email', async ({
    request,
  }) => {
    runSql(`
      update public.support_tickets set status = 'pending_on_user', last_message_at = now() - interval '8 days'
      where subject = '${subject}';
      select public.auto_solve_support_tickets();`);
    expect(runSql(`select status from public.support_tickets where subject = '${subject}'`)).toBe(
      'solved',
    );
    await runWorker(request);
    const email = await waitForEmail(memberEmail, 15_000, 'marcat');
    expect(email.Subject).toContain(`[#${ticketNumber()}]`);
  });

  test('the inbound webhook refuses a wrong key', async ({ request }) => {
    const response = await request.post('/api/support-inbound?key=wrong', { data: { items: [] } });
    expect(response.status()).toBe(401);
  });
});
