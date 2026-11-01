/**
 * Epic check S1-E9-QA: the private messages stories tested together, end to end (S1-E9-01 to
 * S1-E9-04; board Messages 5.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * The journeys, with the seed personas only (CLAUDE.md, Safety while building):
 * 1. the adult and 16 to 17 rules × messages × settings: adult_writer can't message teen_17 until
 *    teen_17 turns on "Let adults message me" in Settings; then the chat starts accepted (teen_17
 *    follows adult_writer) and both write;
 * 2. block and report × the case page: teen_17 reports adult_writer's message, the moderator sees
 *    it with the messages before it, then teen_17 blocks adult_writer from the chat and the chat is
 *    gone for both;
 * 3. under-16s: an adult never gets Message on kid_14_waiting's profile, and kid_14_waiting (still
 *    waiting for a parent) can't write to anyone; kid_14_ok, an active 14-year-old, can write to
 *    teen_17, who follows them, and the message reaches teen_17's list;
 * 4. Delete chat × the clean-up: blocker and adult_writer (who follows blocker) chat, both delete it, and the
 *    nightly clean-up deletes the messages for good.
 * Test data: everything this file makes is deleted at the start and the end; adults_only is
 * switched off for the run and put back as it was.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The seeded chat between teacher and adult_writer, which this file leaves alone. */
const seededChatId = '00000000-0000-4000-a000-000000000901';

/** adult_writer's user ID: the reported message in journey 2 is theirs. */
const adultWriterId = '00000000-0000-4000-8000-000000000001';

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

/** The open chat's messages, so a check never matches the list's preview of the same words. */
function chatOn(page: Page) {
  return page.getByRole('region', { name: /^Messages with/ });
}

/** Sends one message from the open chat. */
async function send(page: Page, toName: string, words: string) {
  await page.getByLabel(`Message to ${toName}`).fill(words);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(chatOn(page).getByText(words)).toBeVisible();
}

/** Deletes what the journeys make and puts the settings back as the seed has them. */
function cleanUp() {
  runSql(`
    delete from public.case_actions where case_id in (select id from public.cases where item_type = 'message' and user_id = '${adultWriterId}');
    delete from public.reports where case_id in (select id from public.cases where item_type = 'message' and user_id = '${adultWriterId}');
    delete from public.cases where item_type = 'message' and user_id = '${adultWriterId}';
    delete from public.blocks where user_id = (select id from public.profiles where handle = 'teen_17')
      and blocked_user_id = '${adultWriterId}';
    insert into public.follows_users (user_id, followed_user_id)
      select '00000000-0000-4000-8000-000000000002', '${adultWriterId}' on conflict do nothing;
    delete from public.follows_users where user_id = '00000000-0000-4000-8000-000000000002'
      and followed_user_id = (select id from public.profiles where handle = 'kid_14_ok');
    delete from public.follows_users where user_id = '${adultWriterId}'
      and followed_user_id = (select id from public.profiles where handle = 'blocker');
    delete from public.conversations where id <> '${seededChatId}';
    delete from public.rate_limit_events where action in ('message', 'new_conversation');
    update public.profiles set messages_from = null, adults_may_message = false
      where handle in ('adult_writer', 'teen_17', 'kid_14_ok', 'blocker');
    update public.profiles set locale = 'ro'
      where handle in ('adult_writer', 'teen_17', 'kid_14_ok', 'kid_14_waiting', 'blocker', 'moderator');`);
}

test.describe('epic S1-E9 journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    cleanUp();
  });

  test.afterAll(() => {
    cleanUp();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('journey 1: a 17-year-old lets adults message them, and the chat starts', async ({
    browser,
  }) => {
    // Step 1: off by default, so adult_writer sees only the neutral note (S1-E9-03).
    const writer = await openAs(browser, 'adult_writer', '/u/teen_17');
    await expect(writer.getByText('teen_17 isn’t taking messages right now.')).toBeVisible();
    // Step 2: teen_17 turns it on in Settings › Messages (S1-E9-04).
    const teen = await openAs(browser, 'teen_17', '/settings#messages');
    await teen.getByLabel('Let adults message me').check();
    await expect(teen.getByLabel('Let adults message me')).toBeChecked();
    // Step 3: teen_17 follows adult_writer, so the first message starts the chat (S1-E9-01).
    await writer.reload();
    await writer.getByRole('link', { name: 'Message teen_17' }).click();
    await send(writer, 'teen_17', 'Thanks for following! Which story are you reading?');
    await expect(writer.getByLabel('Message to teen_17')).toBeVisible();
    // Step 4: teen_17 sees the count, opens the chat and answers.
    await teen.goto('/discover');
    await teen.getByRole('link', { name: 'Messages, 1 chat with new messages' }).click();
    await teen.locator('a[href="/messages/adult_writer"]').click();
    await send(teen, 'Lia Scrie', 'The one about the lighthouse!');
  });

  test('journey 2: a report reaches the moderator with context, then a block ends the chat', async ({
    browser,
  }) => {
    // Step 1: teen_17 reports adult_writer's message (S1-E9-02).
    const teen = await openAs(browser, 'teen_17', '/messages/adult_writer');
    await chatOn(teen)
      .getByRole('button', { name: /^Report the message from Lia Scrie/ })
      .click();
    const dialog = teen.getByRole('dialog', { name: 'Report this message' });
    await expect(dialog.getByText(/up to 20 messages before it/)).toBeVisible();
    await dialog.getByText('Other', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByText('Report sent')).toBeVisible();
    const reference = /R-\d{6}/.exec(await dialog.innerText())?.[0] ?? '';
    await dialog.getByRole('button', { name: 'Close' }).first().click();
    // Step 2: the moderator reads it with the messages before it.
    const caseId = runSql(
      `select case_id from public.reports where reference = '${reference}';`,
    ).trim();
    const moderator = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    const panel = moderator.getByRole('region', {
      name: 'The reported message and the 20 before it',
    });
    await expect(panel).toContainText('A private chat between @adult_writer and @teen_17.');
    await expect(panel.getByRole('listitem')).toHaveCount(1);
    // Step 3: teen_17 blocks adult_writer from the chat; it is gone for both.
    await teen.getByRole('button', { name: 'Block Lia Scrie' }).click();
    await teen
      .getByRole('dialog', { name: 'Block Lia Scrie?' })
      .getByRole('button', { name: 'Block Lia Scrie' })
      .click();
    await expect(teen).toHaveURL(/\/messages$/);
    await expect(teen.locator('a[href="/messages/adult_writer"]')).toHaveCount(0);
    const writer = await openAs(browser, 'adult_writer', '/messages');
    await expect(writer.locator('a[href="/messages/teen_17"]')).toHaveCount(0);
  });

  test('journey 3: under-16s and adults never meet; under-18s write to each other', async ({
    browser,
  }) => {
    // Step 1: no Message on a 14-year-old's profile, only the neutral note.
    const writer = await openAs(browser, 'adult_writer', '/u/kid_14_waiting');
    await expect(writer.getByText('kid_14_waiting isn’t taking messages right now.')).toBeVisible();
    await expect(writer.getByRole('link', { name: /^Message / })).toHaveCount(0);
    // Step 2: kid_14_waiting, still waiting for a parent, can't write to teen_17.
    const waiting = await openAs(browser, 'kid_14_waiting', '/messages/teen_17');
    await expect(waiting.getByText('teen_17 isn’t taking messages right now.')).toBeVisible();
    await expect(waiting.getByLabel('Message to teen_17')).toHaveCount(0);
    // Step 3: kid_14_ok writes to teen_17, who follows them; the chat starts accepted.
    runSql(`insert into public.follows_users (user_id, followed_user_id)
      select '00000000-0000-4000-8000-000000000002', id from public.profiles where handle = 'kid_14_ok'
      on conflict do nothing;`);
    const kid = await openAs(browser, 'kid_14_ok', '/messages/teen_17');
    await send(kid, 'teen_17', 'Hi! Are you in the poetry group too?');
    const teen = await openAs(browser, 'teen_17', '/messages');
    await expect(teen.locator('a[href="/messages/kid_14_ok"]')).toContainText(
      'Hi! Are you in the poetry group too?',
    );
  });

  test('journey 4: when both delete a chat, the clean-up deletes it for good', async ({
    browser,
  }) => {
    // Step 1: blocker writes to adult_writer, who follows them, so the chat starts accepted.
    runSql(`insert into public.follows_users (user_id, followed_user_id)
      select '${adultWriterId}', id from public.profiles where handle = 'blocker'
      on conflict do nothing;`);
    const blocker = await openAs(browser, 'blocker', '/messages/adult_writer');
    await send(blocker, 'Lia Scrie', 'Loved your last chapter.');
    // Step 2: both delete the chat from About this chat.
    for (const [page, other] of [
      [blocker, 'adult_writer'],
      [await openAs(browser, 'adult_writer', '/messages/blocker'), 'blocker'],
    ] as const) {
      await page.goto(`/messages/${other}`);
      await page.getByRole('button', { name: 'Delete chat' }).click();
      await page
        .getByRole('dialog', { name: 'Delete this chat?' })
        .getByRole('button', { name: 'Delete chat' })
        .click();
      await expect(page).toHaveURL(/\/messages$/);
    }
    // Step 3: the nightly job runs; the message is gone for good.
    runSql('select public.purge_deleted_chats();');
    const left = runSql(
      `select count(*) from public.messages where body = 'Loved your last chapter.';`,
    );
    expect(left.trim()).toBe('0');
  });
});
