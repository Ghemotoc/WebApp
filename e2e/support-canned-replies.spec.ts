/**
 * Canned replies in a real browser (story S1-E11-13, part 13b; bundle ADMIN-2h3b; criterion 8).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - support adds a canned reply on the Canned replies page, changes it, and deletes it after
 *   saying yes once more;
 * - on a Romanian ticket, inserting a canned reply puts its Romanian words in the reply box with
 *   the person's name and the ticket's number, to edit before sending; nothing is sent;
 * - the Canned replies page passes axe and doesn't scroll sideways at 390, 768 and 1440 px,
 *   light and night, ro and en.
 * Test data: seed personas; the ticket and replies made here are removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Makes this run's titles and subjects unique, so a rerun finds its own. */
const stamp = Date.now().toString(36);
const title = `Drafts help ${stamp}`;
const subject = `Canned check ${stamp}`;

/** Opens an address in English as the support persona. */
async function openAsSupport(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = 'support';`);
  await useSessionInBrowser(context, (await signInPersona('support')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('canned replies (S1-E11-13, ADMIN-2h3b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.support_canned_replies where title like '%${stamp}%';
      delete from public.support_tickets where subject = '${subject}';
      update public.profiles set locale = 'ro' where handle = 'support';`);
  });

  test('support adds, changes and deletes a canned reply', async ({ browser }) => {
    const page = await openAsSupport(browser, '/staff/support');
    await page.getByRole('link', { name: 'Manage canned replies' }).click();
    await page.getByRole('button', { name: 'Add a canned reply' }).click();
    await page.getByLabel('Title (only staff see it)').fill(title);
    await page
      .getByLabel('Words in Romanian')
      .fill('Bună, {{name}}! Ciornele sunt la #{{number}}.');
    await page.getByLabel('Words in English').fill('Hi {{name}}! Drafts for #{{number}}.');
    await page.getByRole('button', { name: 'Save' }).click();
    const list = page.getByRole('list', { name: 'Canned replies' });
    await expect(list.getByRole('heading', { name: title })).toBeVisible();

    await list.getByRole('button', { name: `Edit “${title}”` }).click();
    await page.getByLabel('Words in English').fill('Hi {{name}}! Your drafts for #{{number}}.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(list.getByText('Hi {{name}}! Your drafts for #{{number}}.')).toBeVisible();

    await list.getByRole('button', { name: `Delete “${title}”` }).click();
    await list.getByRole('button', { name: 'Delete it' }).click();
    await expect(list.getByRole('heading', { name: title })).toHaveCount(0);
  });

  test('inserting a reply fills the name and number in the ticket’s language', async ({
    browser,
  }) => {
    runSql(`
      insert into public.support_tickets (requester_user_id, subject, channel, language, last_message_at)
      values ('00000000-0000-4000-8000-000000000001', '${subject}', 'in_app', 'ro', now());`);
    const number = runSql(
      `select number from public.support_tickets where subject = '${subject}';`,
    );
    const name = runSql(
      `select public.display_name(handle, pen_name) from public.profiles where handle = 'adult_writer';`,
    );
    const page = await openAsSupport(browser, `/staff/support/${number}`);
    await page.getByLabel('Canned reply').selectOption({ label: 'Thanks, we’re looking into it' });
    await page.getByRole('button', { name: 'Insert' }).click();
    const box = page.getByLabel('Answer the person, or add a note');
    await expect(box).toHaveValue(new RegExp(`^Bună, ${name},[\\s\\S]*#${number}`));
    await expect(box).toBeFocused();
    await expect(page.getByText(/is in the box: check it and edit it/)).toBeVisible();
    // Nothing was sent: the ticket has no answer yet.
    expect(
      runSql(`select count(*) from public.support_ticket_messages as messages
              join public.support_tickets as tickets on tickets.id = messages.ticket_id
              where tickets.number = ${number} and messages.kind = 'staff_reply';`),
    ).toBe('0');
  });

  for (const view of everyView(['/staff/support/canned'])) {
    test(`axe: canned replies at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'support';`);
      await useSessionInBrowser(page.context(), (await signInPersona('support')).session);
      await checkScreen(page, view);
    });
  }
});
