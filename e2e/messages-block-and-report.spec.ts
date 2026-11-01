/**
 * Block and report inside messages, end to end (story S1-E9-02; board Messages 5.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - criterion 2: adult_writer reports teacher's message from the chat; the dialog says the
 *   message and up to 20 before it go with the report, and the reporter gets "Report sent" with a
 *   reference; the moderator's case page shows the reported message marked "Reported" with the
 *   messages before it;
 * - the chat header has Report for the person's profile too (rule 6);
 * - criterion 1: teacher blocks adult_writer from the chat ("Block Lia Scrie?", "won't be told"),
 *   goes back to Messages without the chat, and adult_writer can no longer open it;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on the case page with the messages
 *   panel, and no sideways scroll.
 * Test data: the seed personas adult_writer, teacher and moderator, and the seeded chat between
 * teacher and adult_writer. The report, its case and the block are deleted at the end (the audit
 * log's sensitive reads stay: it is append-only).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** teacher's user ID: the reported messages are theirs. */
const teacherId = '00000000-0000-4000-8000-000000000007';

/** The case this file makes, found again for the axe views. */
let caseId = '';

/**
 * Opens an address in English as a persona, in a fresh browser at 1440 px.
 *
 * @returns the page
 */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The open chat's messages, so a check never matches the list's preview of the same words. */
function chatOn(page: Page) {
  return page.getByRole('region', { name: /^Messages with/ });
}

/** Deletes the cases about teacher this file made, the block and the locales it changed. */
function cleanUp() {
  runSql(`
    delete from public.case_actions where case_id in (select id from public.cases where user_id = '${teacherId}' and created_at > now() - interval '1 hour');
    delete from public.reports where case_id in (select id from public.cases where user_id = '${teacherId}' and created_at > now() - interval '1 hour');
    delete from public.cases where user_id = '${teacherId}' and created_at > now() - interval '1 hour';
    delete from public.blocks where user_id = '${teacherId}'
      and blocked_user_id = (select id from public.profiles where handle = 'adult_writer');
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher', 'moderator');`);
}

test.describe('block and report inside messages (S1-E9-02)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a reported message reaches the moderator with the messages before it', async ({
    browser,
  }) => {
    // Step 1: adult_writer reports teacher's last message from the chat.
    const page = await openAs(browser, 'adult_writer', '/messages/teacher');
    await expect(page.getByRole('button', { name: 'Report @teacher' })).toBeVisible();
    await chatOn(page)
      .getByRole('button', { name: /^Report the message from teacher/ })
      .last()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Report this message' });
    await expect(
      dialog.getByText(/We’ll send this message and up to 20 messages before it/),
    ).toBeVisible();
    await dialog.getByText('Harassment', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByText('Report sent')).toBeVisible();
    const reference = /R-\d{6}/.exec(await dialog.innerText())?.[0] ?? '';
    expect(reference).toMatch(/^R-\d{6}$/);

    // Step 2: the moderator opens the case and sees the message with its context.
    caseId = runSql(`select case_id from public.reports where reference = '${reference}';`).trim();
    const moderator = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    const panel = moderator.getByRole('region', {
      name: 'The reported message and the 20 before it',
    });
    await expect(panel).toContainText('A private chat between @adult_writer and @teacher.');
    const lines = panel.getByRole('list', { name: 'Messages, oldest first' }).getByRole('listitem');
    await expect(lines).toHaveCount(3);
    await expect(lines.first()).toContainText('My class is reading your story');
    await expect(lines.last()).toContainText('Reported');
    await expect(lines.last()).toContainText('I’ll collect them on Friday.');
  });

  test('blocking from the chat ends it for both, and the other person isn’t told', async ({
    browser,
  }) => {
    // Step 1: teacher opens the chat and chooses Block.
    const page = await openAs(browser, 'teacher', '/messages/adult_writer');
    await page.getByRole('button', { name: 'Block Lia Scrie' }).click();
    const dialog = page.getByRole('dialog', { name: 'Block Lia Scrie?' });
    await expect(dialog).toContainText(
      'You won’t be able to message, mention or follow each other.',
    );
    await expect(dialog).toContainText('Lia Scrie won’t be told.');
    // Step 2: "Don't block" changes nothing; the second time it blocks.
    await dialog.getByRole('button', { name: 'Don’t block' }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Block Lia Scrie' }).click();
    await dialog.getByRole('button', { name: 'Block Lia Scrie' }).click();
    // Step 3: back on Messages, the chat is gone.
    await expect(page).toHaveURL(/\/messages$/);
    await expect(page.locator('a[href="/messages/adult_writer"]')).toHaveCount(0);
    // Step 4: adult_writer can't open the chat any more; nothing says why.
    const writer = await openAs(browser, 'adult_writer', '/messages/teacher');
    await expect(writer.getByText('There’s nobody to message with that username.')).toBeVisible();
    await expect(writer.getByLabel('Message to teacher')).toHaveCount(0);
  });

  for (const view of everyView(['/staff/moderation/cases/'])) {
    test(`axe: the message case at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's own language wins (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, { ...view, address: `${view.address}${caseId}` });
      await expect(
        page.getByRole('heading', { name: /reported message|Mesajul raportat/ }),
      ).toBeVisible();
    });
  }
});
