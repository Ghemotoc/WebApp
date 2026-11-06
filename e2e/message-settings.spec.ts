/**
 * Message settings and Delete chat, end to end (story S1-E9-04; board Messages 5.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - criterion 1: "Message settings" on /messages opens Settings › Messages; adult_writer picks
 *   "Nobody", the notice on /messages says so and another adult no longer gets Message on their
 *   profile; teen_17 sees "Let adults message me" (an adult doesn't) and turning it on lets
 *   adult_writer write to them;
 * - Delete chat: adult_writer deletes the chat with teacher from About this chat after a
 *   confirmation; it leaves their list while teacher still has it;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on Settings scrolled to Messages and
 *   no sideways scroll.
 * Test data: the seed personas adult_writer, teacher, teen_17 and blocker, and the seeded chat.
 * Everything changed is put back at the start and the end. adults_only is switched off for the
 * run (minors' profiles are hidden while it is on) and put back as it was.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The seeded chat between teacher and adult_writer (supabase/seed.sql). */
const seededChatId = '00000000-0000-4000-a000-000000000901';

/** Whether adults_only was on before this file, so it is put back as it was. */
let wasAdultsOnly = 'true';

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

/** Puts the settings, the seeded chat, teen_17's follow and the locales back as the seed has them. */
function resetMessages() {
  runSql(`
    update public.profiles set messages_from = null, adults_may_message = false
      where handle in ('adult_writer', 'teen_17', 'teacher', 'blocker');
    delete from public.conversations where id <> '${seededChatId}';
    update public.conversation_members set deleted_at = null where conversation_id = '${seededChatId}';
    delete from public.rate_limit_events where action in ('message', 'new_conversation');
    -- The seed's follow (teen_17 follows adult_writer), which other files can remove before this
    -- one runs; the 17-year-old's test depends on it.
    insert into public.follows_users (user_id, followed_user_id)
      select '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'
      where not exists (select 1 from public.follows_users
        where user_id = '00000000-0000-4000-8000-000000000002'
          and followed_user_id = '00000000-0000-4000-8000-000000000001');
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher', 'teen_17', 'blocker');`);
}

test.describe('message settings and Delete chat (S1-E9-04)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    resetMessages();
  });

  test.afterAll(() => {
    resetMessages();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('"Nobody" stops new chats, and the notice says so', async ({ browser }) => {
    // Step 1: from /messages to Settings › Messages.
    const page = await openAs(browser, 'adult_writer', '/messages');
    await page.getByRole('link', { name: 'Message settings' }).click();
    await expect(page).toHaveURL(/\/settings#messages$/);
    const section = page.getByRole('region', { name: 'Who can message you' });
    await expect(section.getByRole('radio', { name: 'Everyone' })).toBeChecked();
    await expect(section.getByLabel('Let adults message me')).toHaveCount(0);
    // Step 2: "Nobody", saved at once.
    await section.getByRole('radio', { name: 'Nobody' }).check();
    await expect(section.getByRole('radio', { name: 'Nobody' })).toBeChecked();
    await page.goto('/messages');
    await expect(page.getByText('Right now, nobody can start a new chat with you.')).toBeVisible();
    // Step 3: another adult has no Message on adult_writer's profile.
    const other = await openAs(browser, 'blocker', '/u/adult_writer');
    await expect(other.getByText('Lia Scrie isn’t taking messages right now.')).toBeVisible();
    await expect(other.getByRole('link', { name: /^Message / })).toHaveCount(0);
  });

  test('a 17-year-old can let adults message them', async ({ browser }) => {
    // Step 1: before, adult_writer can't write to teen_17.
    runSql(`update public.profiles set messages_from = null where handle = 'adult_writer';`);
    const writer = await openAs(browser, 'adult_writer', '/u/teen_17');
    await expect(writer.getByRole('link', { name: /^Message / })).toHaveCount(0);
    // Step 2: teen_17 turns the switch on in Settings.
    const teen = await openAs(browser, 'teen_17', '/settings#messages');
    const section = teen.getByRole('region', { name: 'Who can message you' });
    await expect(section.getByRole('radio', { name: 'People you follow' })).toBeChecked();
    await expect(
      section.getByText(/Adults can never message anyone under 16/).first(),
    ).toBeVisible();
    await section.getByLabel('Let adults message me').check();
    await expect(section.getByLabel('Let adults message me')).toBeChecked();
    // Step 3: teen_17 follows adult_writer (seed), so now adult_writer may write.
    await writer.reload();
    await expect(writer.getByRole('link', { name: 'Message teen_17' })).toBeVisible();
  });

  test('Delete chat removes the chat for one person only', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/messages/teacher');
    await page.getByRole('button', { name: 'Delete chat' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete this chat?' });
    await expect(dialog).toContainText(
      'When both of you delete it, the messages are deleted for good.',
    );
    await dialog.getByRole('button', { name: 'Delete chat' }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(page.locator('a[href="/messages/teacher"]')).toHaveCount(0);
    const teacher = await openAs(browser, 'teacher', '/messages');
    await expect(teacher.locator('a[href="/messages/adult_writer"]')).toBeVisible();
  });

  for (const view of everyView(['/settings#messages'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's own language wins (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teen_17';`);
      await useSessionInBrowser(page.context(), (await signInPersona('teen_17')).session);
      await checkScreen(page, view);
      await expect(page.locator('#messages')).toBeVisible();
    });
  }
});
