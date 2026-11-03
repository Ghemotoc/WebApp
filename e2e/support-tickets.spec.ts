/**
 * Support tickets in a real browser (story S1-E11-13, part 13a; bundle ADMIN-2h1).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a member finds "Your support requests" in Settings, asks for help and gets a numbered ticket;
 * - support finds it in the inbox, sees the age group (never the year of birth), shows the email,
 *   changes the status, priority, assignee and tags (kept in the history), adds an internal note
 *   and answers; the member sees the answer from "The support team", never the note, and their
 *   answer opens the ticket again;
 * - a Contact us message from a visitor becomes an "email only" ticket, numbered in the reply;
 * - a ticket from someone under 16 shows the safeguarding banner;
 * - a moderator can't read the inbox;
 * - asking for help and the ticket page pass axe and don't scroll sideways at 390, 768 and
 *   1440 px, light and night, ro and en.
 * Test data: seed personas; the tickets made here are removed afterwards. The local Vault secret
 * stays, because e2e/support-emails.spec.ts may be using it at the same time.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Makes this run's subjects unique, so a rerun finds its own tickets. */
const stamp = Date.now().toString(36);
/** The subject the member's ticket gets. */
const subject = `My drafts vanished ${stamp}`;

/** Opens an address in English as a persona, or signed out with null. */
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
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The number of this run's member ticket. */
function memberTicketNumber(): string {
  return runSql(`select number from public.support_tickets where subject = '${subject}'`);
}

test.describe('support tickets (S1-E11-13, ADMIN-2h1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    // The server signs Contact us tickets with SUPPORT_TICKET_SECRET (playwright.config.ts); the
    // database checks them against the same value in its Vault. Never a real secret.
    runSql(`
      do $$ begin
        if not exists (select 1 from vault.secrets where name = 'support_ticket_secret') then
          perform vault.create_secret('local-e2e-support-secret', 'support_ticket_secret');
        end if;
      end $$;
      delete from public.rate_limit_events where user_id = '00000000-0000-4000-8000-000000000001';`);
  });
  test.afterAll(() => {
    runSql(`
      delete from public.support_tickets where subject like '%${stamp}%'
        or id in (select ticket_id from public.support_ticket_messages where body like '%${stamp}%');
      update public.profiles set locale = 'ro' where handle in ('adult_writer', 'support', 'moderator');`);
  });

  test('a member asks for help from Settings and gets a numbered ticket', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/settings');
    await page.getByRole('link', { name: 'See your support requests' }).click();
    await page.getByRole('link', { name: 'Ask for help' }).click();
    await page.getByLabel('What is it about?').selectOption({ label: 'Writing' });
    await page.getByLabel('Subject').fill(subject);
    await page.getByLabel('Your message').fill(`I saved three chapters yesterday ${stamp}.`);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText(/Sent\. Your request is #\d+/)).toBeVisible();
    await page.getByRole('link', { name: 'Open your request' }).click();
    await expect(page.getByRole('heading', { name: subject })).toBeVisible();
    await expect(page.getByText(`#${memberTicketNumber()} · New`)).toBeVisible();
  });

  test('support works on the ticket: fields, history, a note and an answer', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'support', '/staff/support');
    await page.getByRole('link', { name: subject }).click();
    const who = page.getByRole('region', { name: 'Who is asking' });
    await expect(who.getByText('18 and over')).toBeVisible();
    await expect(who.getByText(/birth/i)).toHaveCount(0);
    await who.getByRole('button', { name: 'Show email' }).click();
    await expect(who.getByText('adult_writer@personas.test')).toBeVisible();

    const fields = page.getByRole('region', { name: 'Ticket' });
    await fields.getByLabel('Status').selectOption({ label: 'Open' });
    await fields.getByLabel('Priority').selectOption({ label: 'High' });
    await fields.getByLabel('Assigned to').fill('@support');
    await fields.getByLabel('Tags').fill('Drafts, lost-work');
    await fields.getByRole('button', { name: 'Save changes' }).click();
    const history = page.getByRole('region', { name: 'History' });
    await expect(history.getByText('@support: Priority from Normal to High')).toBeVisible();
    await expect(history.getByText('@support: Tags from none to drafts, lost-work')).toBeVisible();

    const reply = page.getByLabel('Answer the person, or add a note');
    await reply.fill(`Checked the logs ${stamp}; nothing was deleted.`);
    await page.getByRole('button', { name: 'Add an internal note' }).click();
    await expect(page.getByText('Internal note by @support (only staff see this)')).toBeVisible();
    await reply.fill('Your drafts are under Write › Drafts. Does that help?');
    await page.getByRole('button', { name: 'Send answer' }).click();
    await expect(
      history.getByText('@support: Status from Open to Waiting for your answer'),
    ).toBeVisible();
  });

  test('the member reads the answer, never the note, and their answer reopens it', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `/support/${memberTicketNumber()}`);
    await expect(page.getByText('The support team', { exact: true })).toBeVisible();
    await expect(page.getByText(/Checked the logs/)).toHaveCount(0);
    await expect(page.getByText(/Waiting for your answer/)).toBeVisible();
    await page.getByLabel('Your answer').fill('Found them, thank you!');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText(`#${memberTicketNumber()} · Open`)).toBeVisible();
  });

  test('a visitor’s Contact us message becomes an email-only ticket', async ({ browser }) => {
    const visitor = await openAs(browser, null, '/contact');
    const form = visitor.getByRole('form', { name: 'Your message' });
    await form.getByText('A question', { exact: true }).click();
    await form.getByLabel('Message', { exact: true }).fill(`Is it free to read? ${stamp}`);
    await form.getByLabel('Your email').fill(`visitor-${stamp}@example.com`);
    await form.getByRole('button', { name: 'Send message' }).click();
    const sent = visitor.getByRole('status', { name: 'Message sent' });
    await expect(sent).toContainText(/#\d+/);
    const ticketNumber = /#(\d+)/.exec(await sent.innerText())?.[1] ?? '';

    const page = await openAs(browser, 'support', `/staff/support/${ticketNumber}`);
    await expect(page.getByText(`#${ticketNumber} · arrived by Contact us`)).toBeVisible();
    await expect(page.getByText('Email only: no account uses this address.')).toBeVisible();
    await expect(page.getByText(`Is it free to read? ${stamp}`)).toBeVisible();
  });

  test('a ticket from someone under 16 shows the safeguarding banner', async ({ browser }) => {
    const ticketNumber = runSql(`
      with ticket as (
        insert into public.support_tickets (requester_user_id, subject, channel)
        select id, 'Under 16 test ${stamp}', 'in_app' from public.profiles where handle = 'kid_14_ok'
        returning id, number, requester_user_id)
      , message as (
        insert into public.support_ticket_messages (ticket_id, kind, author_user_id, body, channel)
        select id, 'from_requester', requester_user_id, 'Help please ${stamp}', 'in_app' from ticket)
      select number from ticket;`);
    const page = await openAs(browser, 'support', `/staff/support/${ticketNumber}`);
    await expect(page.getByText('This person is under 16')).toBeVisible();
    await expect(page.getByText('13 to 15')).toBeVisible();
  });

  test('a moderator can’t read the support inbox', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/support');
    await expect(page.getByText('Only support staff can read support tickets.')).toBeVisible();
  });

  for (const view of everyView(['/support/new'])) {
    test(`axe: Ask for help at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view);
    });
  }

  for (const view of everyView(['/staff/support/TICKET'])) {
    test(`axe: a support ticket at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'support';`);
      await useSessionInBrowser(page.context(), (await signInPersona('support')).session);
      await checkScreen(page, { ...view, address: `/staff/support/${memberTicketNumber()}` });
    });
  }
});
