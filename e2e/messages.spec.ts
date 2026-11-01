/**
 * Private messages and message requests, end to end (story S1-E9-01; board Messages 5.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the seeded chat between adult_writer and teacher shows in Messages; a message sent appears,
 *   the other person sees "Messages" with a count in the top bar, and opening the chat reads it;
 * - a first message to someone who doesn't follow the sender is a request: the sender is told it
 *   waits and gets no box; the recipient finds it under Requests and accepts it, and both can
 *   write (criterion 2);
 * - "Delete request" takes it out of the recipient's lists, and the sender still only waits;
 * - the profile shows Message only to someone who may write (S1-E9-03): not to an adult on a
 *   14-year-old's profile; each message from the other person has its own Report (rule 6);
 * - text only: the box says so (criterion 4);
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on /messages and one chat, and no
 *   sideways scroll.
 * Test data: the seed personas adult_writer, teacher, blocker (an adult) and kid_14_waiting, and
 * the seeded chat; chats this file makes are deleted at the start and the end. adults_only is
 * switched off for the run (minors' profiles are hidden while it is on) and put back as it was.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

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

/**
 * The open chat's messages, so a check never matches the list's preview of the same words.
 *
 * @returns the scroll region of the chat on screen
 */
function chatOn(page: Page) {
  return page.getByRole('region', { name: /^Messages with/ });
}

/** Deletes every chat but the seeded one, and the seeded chat's extra messages and reads. */
function resetChats() {
  runSql(`
    delete from public.conversations where id <> '${seededChatId}';
    delete from public.messages where conversation_id = '${seededChatId}'
      and created_at > now() - interval '50 minutes';
    update public.conversation_members set last_read_at = now() where conversation_id = '${seededChatId}';
    delete from public.rate_limit_events where action in ('message', 'new_conversation');
    delete from public.follows_users
      where user_id = (select id from public.profiles where handle = 'blocker');
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher', 'blocker');`);
}

test.describe('private messages (S1-E9-01)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    resetChats();
  });

  test.afterAll(() => {
    resetChats();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('a message in the seeded chat reaches the other person, who sees the count', async ({
    browser,
  }) => {
    // Step 1: adult_writer opens Messages and the chat with teacher.
    const page = await openAs(browser, 'adult_writer', '/messages');
    await page.locator('a[href="/messages/teacher"]').click();
    await expect(page).toHaveURL(/\/messages\/teacher$/);
    await expect(
      chatOn(page).getByText('Of course. Send them over whenever you like.'),
    ).toBeVisible();
    await expect(page.getByText('Text only. You can’t send pictures or files.')).toBeVisible();
    // Step 2: a new message appears in the chat.
    await page.getByLabel('Message to teacher').fill('Here are my answers for Friday.');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(chatOn(page).getByText('Here are my answers for Friday.')).toBeVisible();
    await expect(page.getByLabel('Message to teacher')).toHaveValue('');
    // Step 3: teacher sees the count in the top bar, opens the chat and the count goes.
    const teacher = await openAs(browser, 'teacher', '/discover');
    const link = teacher.getByRole('link', { name: 'Messages, 1 chat with new messages' });
    await expect(link).toBeVisible();
    await link.click();
    // adult_writer writes as their pen name, Lia Scrie.
    await teacher.locator('a[href="/messages/adult_writer"]').click();
    await expect(chatOn(teacher).getByText('Here are my answers for Friday.')).toBeVisible();
    // The other person's message has its own Report (rule 6).
    await expect(
      teacher.getByRole('button', { name: /^Report the message from Lia Scrie/ }),
    ).toHaveCount(2);
    await expect(teacher.getByRole('link', { name: 'Messages', exact: true })).toBeVisible();
  });

  test('a first message to someone who doesn’t follow you is a request until they accept', async ({
    browser,
  }) => {
    // Step 1: adult_writer opens blocker's profile and chooses Message.
    const page = await openAs(browser, 'adult_writer', '/u/blocker');
    await page.getByRole('link', { name: 'Message blocker' }).click();
    await expect(page).toHaveURL(/\/messages\/blocker$/);
    await expect(page.getByText(/your first message goes to their requests/)).toBeVisible();
    await page.getByLabel('Message to blocker').fill('Hi! Want to swap feedback?');
    await page.getByRole('button', { name: 'Send' }).click();
    // Step 2: it waits, and there is no box to send more.
    await expect(
      page.getByText('Your message is waiting in blocker’s requests.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByLabel('Message to blocker')).toHaveCount(0);
    // Step 3: blocker finds it under Requests and accepts.
    const blocker = await openAs(browser, 'blocker', '/messages');
    await blocker.getByRole('button', { name: /Requests/ }).click();
    await blocker.locator('a[href="/messages/adult_writer"]').click();
    await expect(chatOn(blocker).getByText('Hi! Want to swap feedback?')).toBeVisible();
    await blocker.getByRole('button', { name: 'Accept request' }).click();
    await blocker.getByLabel('Message to Lia Scrie').fill('Yes, gladly!');
    await blocker.getByRole('button', { name: 'Send' }).click();
    await expect(chatOn(blocker).getByText('Yes, gladly!')).toBeVisible();
    // Step 4: adult_writer can write again.
    await page.reload();
    await expect(chatOn(page).getByText('Yes, gladly!')).toBeVisible();
    await expect(page.getByLabel('Message to blocker')).toBeVisible();
  });

  test('a deleted request leaves the recipient’s lists, and the sender still only waits', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', '/messages/blocker');
    await teacher.getByLabel('Message to blocker').fill('Would your class like a visit?');
    await teacher.getByRole('button', { name: 'Send' }).click();
    await expect(teacher.getByText(/is waiting in blocker’s requests/)).toBeVisible();
    const blocker = await openAs(browser, 'blocker', '/messages/teacher');
    await blocker.getByRole('button', { name: 'Delete request' }).click();
    await expect(blocker.getByText('teacher isn’t taking messages right now.')).toHaveCount(0);
    await blocker.goto('/messages');
    await blocker.getByRole('button', { name: /Requests/ }).click();
    await expect(blocker.getByText('No message requests.')).toBeVisible();
    await teacher.reload();
    await expect(teacher.getByText(/is waiting in blocker’s requests/)).toBeVisible();
  });

  test('the profile offers Message only to someone who may write', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/u/kid_14_waiting');
    await expect(page.getByText('kid_14_waiting isn’t taking messages right now.')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Message / })).toHaveCount(0);
    await page.goto('/messages/kid_14_waiting');
    await expect(page.getByText('kid_14_waiting isn’t taking messages right now.')).toBeVisible();
    await expect(page.getByLabel('Message to kid_14_waiting')).toHaveCount(0);
  });

  for (const view of everyView(['/messages', '/messages/teacher'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's own language wins (S1-E1-04), so it is set to the view's.
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
});
