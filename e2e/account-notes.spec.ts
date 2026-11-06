/**
 * Staff notes and the full staff history on an account page, in a real browser (bundle LOGS-1,
 * parts a and b; Robert, 6 Nov 2026: on every profile "a log … for whatever action our staff has
 * done, and also a place for them to leave comments").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - support (who may open accounts but not act) adds a note; it shows at the top with its author,
 *   the field empties, and the audit log says a note was added without its words;
 * - a moderator reads the same note; the content editor can't open the account at all;
 * - notes page 20 at a time, "Page 1 of 2", and Older shows the rest;
 * - the owner sees "account.note_added" in the account's staff actions, and the link opens the
 *   Audit log already filtered to the account;
 * - the account page with notes passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas; every note this spec writes starts with its stamp and is deleted
 * afterwards (the test database user may delete; signed-in staff never can).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const teacherId = '00000000-0000-4000-8000-000000000007';
const moderatorId = '00000000-0000-4000-8000-000000000010';
const stamp = `e2e notes ${Date.now()}`;

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Deletes this spec's notes and puts the staff personas' language back. */
function cleanUp() {
  runSql(`delete from public.account_staff_notes where body like '${stamp}%';
    update public.profiles set locale = 'ro' where handle in ('owner', 'moderator', 'support', 'editor');`);
}

test.describe('staff notes and history on an account (LOGS-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('support adds a note, logged without its words, and a moderator reads it', async ({
    browser,
  }) => {
    const support = await openAs(browser, 'support', `/staff/users/${teacherId}`);
    await expect(support.getByRole('heading', { name: 'Staff notes' })).toBeVisible();
    const field = support.getByLabel('Add a note for the team');
    await field.fill(`${stamp}: asked about a class invite.`);
    await support.getByRole('button', { name: 'Add note' }).click();

    // The note is first, with its author, and the field is empty again.
    const notes = support.getByRole('region', { name: 'Staff notes' }).getByRole('listitem');
    await expect(notes.first()).toContainText(`${stamp}: asked about a class invite.`);
    await expect(notes.first()).toContainText('@support');
    await expect(field).toHaveValue('');

    // The audit row names the account and the note, never the words.
    expect(
      runSql(`select count(*) from public.audit_log where action = 'account.note_added'
        and target_user_id = '${teacherId}' and created_at > now() - interval '5 minutes'
        and coalesce(after_values::text, '') not like '%class invite%'`),
    ).not.toBe('0');

    const moderator = await openAs(browser, 'moderator', `/staff/users/${teacherId}`);
    await expect(moderator.getByText(`${stamp}: asked about a class invite.`)).toBeVisible();
  });

  test('notes page 20 at a time', async ({ browser }) => {
    // 21 more notes by the moderator, each a minute older than the last.
    runSql(`insert into public.account_staff_notes (user_id, author_user_id, body, created_at)
      select '${teacherId}', '${moderatorId}', '${stamp} older note ' || number,
             now() - make_interval(mins => number)
      from generate_series(1, 21) as number;`);
    const page = await openAs(browser, 'moderator', `/staff/users/${teacherId}`);
    const pager = page.getByRole('navigation', { name: 'Pages of staff notes' });
    await expect(pager).toContainText('Page 1 of 2');
    await pager.getByRole('button', { name: 'Older' }).click();
    await expect(pager).toContainText('Page 2 of 2');
    await expect(page.getByText(`${stamp} older note 21`, { exact: true })).toBeVisible();
    await expect(pager.getByRole('button', { name: 'Older' })).toBeDisabled();
  });

  test('the owner sees the note in the staff actions and opens the filtered audit log', async ({
    browser,
  }) => {
    const owner = await openAs(browser, 'owner', `/staff/users/${teacherId}`);
    const history = owner.getByRole('region', { name: 'Staff actions on @teacher' });
    await expect(history.getByText(/@support · account\.note_added/).first()).toBeVisible();
    await history.getByRole('link', { name: 'Open the audit log for this account' }).click();
    await expect(owner).toHaveURL(new RegExp(`/staff/audit-log\\?target=${teacherId}$`));
    await expect(owner.getByText(/account\.note_added/).first()).toBeVisible();

    const editor = await openAs(browser, 'editor', `/staff/users/${teacherId}`);
    await expect(editor.getByRole('heading', { name: 'Staff notes' })).toHaveCount(0);
  });

  for (const view of everyView([`/staff/users/${teacherId}`])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, view);
    });
  }
});
