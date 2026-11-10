/**
 * A space's owner hides, shows and moves a reply, and anyone shares a space with a link and a QR
 * code, in a real browser (bundle GAPS-10; story S1-E8-07; board 5.3 A user space).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the owner opens "Moderate" under a reply, writes a reason and hides it: the owner and the
 *   reply's writer still see it with a note saying the space's moderators hid it, another reader
 *   doesn't; "Show again" brings it back for everyone;
 * - the owner moves a reply by pasting another thread's address: the owner lands on the reply in
 *   its new thread, where it is marked "Moved here by a moderator"; words that are no thread
 *   leave the button waiting;
 * - a reader gets no "Moderate" button;
 * - "Share" on the space page opens the link, a QR code and "Copy link";
 * - the thread with a hidden and a moved reply, and the space page with the Share dialog open,
 *   pass axe at 390, 768 and 1440 px, light and night, ro and en, with no doodle drawn.
 * Test data: two threads this spec writes into the seeded space's forum, removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The two threads; the ending marks their rows for clean-up. */
const promptTitle = 'Dragon names e2e posts';
const offTopicTitle = 'Off topic e2e posts';
/** The replies teacher wrote in the first thread. */
const hiddenReply = 'Buy my book instead e2e';
const movedReply = 'Anyone watching the match tonight e2e';
/** The seeded 16+ space, its forum and its owner (adult_writer). */
const spaceAddress = '/spaces/fantasy-writers-circle';
const forumAddress = '/forums/space-fantasy-writers-circle';

/** Removes this spec's threads and hides, and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.moderated_items where item_type = 'forum_post' and item_id in (
      select forum_posts.id from public.forum_posts
      join public.forum_threads on forum_threads.id = forum_posts.thread_id
      where forum_threads.title like '%e2e posts');
    delete from public.forum_threads where title like '%e2e posts';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher', 'support');`);
}

/**
 * Runs SQL as one persona, so the space's own rules about who may post apply (its age group).
 *
 * @param handle - the persona
 * @param sql - what to run
 */
function runSqlAs(handle: string, sql: string) {
  runSql(`select set_config('request.jwt.claims',
      json_build_object('sub', (select id from public.profiles where handle = '${handle}'), 'role', 'authenticated')::text, false);
    ${sql}`);
}

/**
 * Starts one thread as the owner, then posts teacher's replies.
 *
 * @param title - the thread's title
 * @param replies - teacher's replies, in order
 */
function addThread(title: string, replies: string[]) {
  runSqlAs(
    'adult_writer',
    `select public.start_forum_thread('space-fantasy-writers-circle', '${title}', 'First post.');`,
  );
  for (const reply of replies) {
    runSqlAs(
      'teacher',
      `select public.reply_to_forum_thread((select thread_number from public.forum_threads where title = '${title}'), '${reply}');`,
    );
  }
}

/** Opens a page as a persona in English, with motion reduced. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  // The profile's language wins over the browser's, so set it first.
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/** The address of one of this spec's threads, read from the database. */
function threadAddress(title: string): string {
  const number = runSql(
    `select thread_number from public.forum_threads where title = '${title}' and deleted_at is null;`,
  ).trim();
  return `${forumAddress}/${number}`;
}

/**
 * Opens "Moderate" under one post and writes the reason.
 *
 * @param page - the owner's thread page
 * @param postNumber - the post's number
 * @param reason - the reason
 * @returns the open tools
 */
async function openTools(page: Page, postNumber: number, reason: string) {
  await page.getByRole('button', { name: `Moderate post ${postNumber}` }).click();
  const tools = page.getByRole('group', { name: `Moderate post ${postNumber}` });
  await tools.getByLabel('Reason').fill(reason);
  return tools;
}

test.describe('a space hides and moves replies, and is shared by link (GAPS-10)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    addThread(promptTitle, [hiddenReply, movedReply]);
    addThread(offTopicTitle, []);
  });
  test.afterAll(cleanUp);

  test('the owner hides a reply and shows it again', async ({ browser }) => {
    const owner = await openAs(browser, 'adult_writer', threadAddress(promptTitle));
    const tools = await openTools(owner, 2, 'Advertising');
    await tools.getByRole('button', { name: 'Hide post' }).click();
    const note = 'This space’s moderators hid this post.';
    await expect(owner.locator('#post-2')).toContainText(note);
    // Its writer still reads it, with the same note; another reader doesn't get it at all.
    const writer = await openAs(browser, 'teacher', threadAddress(promptTitle));
    await expect(writer.locator('#post-2')).toContainText(note);
    await expect(writer.getByRole('button', { name: /^Moderate post/ })).toHaveCount(0);
    const reader = await openAs(browser, 'support', threadAddress(promptTitle));
    await expect(reader.getByText(movedReply)).toBeVisible();
    await expect(reader.getByText(hiddenReply)).toHaveCount(0);
    // "Show again" brings it back.
    const again = await openTools(owner, 2, 'A fair question after all');
    await again.getByRole('button', { name: 'Show again' }).click();
    await expect(owner.locator('#post-2')).not.toContainText(note);
    await reader.reload();
    await expect(reader.getByText(hiddenReply)).toBeVisible();
    await owner.context().close();
    await writer.context().close();
    await reader.context().close();
  });

  test('the owner moves a reply to another thread of the space', async ({ browser }) => {
    const owner = await openAs(browser, 'adult_writer', threadAddress(promptTitle));
    const tools = await openTools(owner, 3, 'Not about dragon names');
    // Words that are no thread leave the button waiting.
    await tools.getByLabel('Thread that takes the post').fill('the other one');
    await expect(tools.getByRole('button', { name: 'Move post' })).toBeDisabled();
    // A pasted address is read for its number.
    await tools
      .getByLabel('Thread that takes the post')
      .fill(`https://example.test${threadAddress(offTopicTitle)}`);
    await tools.getByRole('button', { name: 'Move post' }).click();
    // The owner lands on the reply in its new thread.
    await expect(owner.getByRole('heading', { level: 1, name: offTopicTitle })).toBeVisible();
    await expect(owner.locator('#post-2')).toContainText(movedReply);
    await expect(owner.locator('#post-2')).toContainText('Moved here by a moderator');
    // The old thread no longer has it.
    await owner.goto(threadAddress(promptTitle));
    await expect(owner.getByText(hiddenReply)).toBeVisible();
    await expect(owner.getByText(movedReply)).toHaveCount(0);
    await owner.context().close();
  });

  test('Share opens the link and a QR code', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', spaceAddress);
    await page.getByRole('button', { name: /^Share the space/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Share this space' });
    await expect(dialog.getByLabel('Link')).toHaveValue(/\/spaces\/fantasy-writers-circle$/);
    await expect(dialog.getByRole('img', { name: 'QR code that opens this space' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Copy link' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toHaveCount(0);
    await page.context().close();
  });

  test('axe: a hidden and a moved reply, and the space page, every view', async ({ page }) => {
    // Every view times two pages: longer than the default 30 s.
    test.setTimeout(300_000);
    runSql(`insert into public.moderated_items (item_type, item_id, user_id, state, note, moderated_by_user_id, space_id)
      select 'forum_post', forum_posts.id, forum_posts.user_id, 'hidden', 'Advertising', spaces.user_id, spaces.id
      from public.forum_posts, public.spaces
      where forum_posts.body = '${hiddenReply}' and spaces.slug = 'fantasy-writers-circle'
        and not exists (select 1 from public.moderated_items where item_id = forum_posts.id and restored_at is null);`);
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    for (const view of everyView([threadAddress(promptTitle), threadAddress(offTopicTitle)])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view);
      await expectNoDoodles(page);
    }
    // The space page with "Share this space" open: the dialog must read on every theme.
    for (const view of everyView([spaceAddress])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view, async (spacePage) => {
        await spacePage
          .getByRole('button', { name: /^(Share the space|Distribuie spațiul)/ })
          .click();
        await expect(spacePage.getByRole('dialog')).toBeVisible();
      });
    }
  });
});
