/**
 * Following a forum thread in a real browser (bundle GAPS-16, part a; story S1-E8-02; board 5.2,
 * "Follow thread").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a member presses Follow thread, the button turns to a ticked "Following" (aria-pressed), and
 *   it stays so after a reload;
 * - a reply by someone else puts "… replied in …" in the follower's notifications, and its
 *   action opens the thread;
 * - Following pressed again unfollows;
 * - a visitor sees no Follow button;
 * - the thread page with the button passes axe at 390 and 1440 px, light and night.
 * Test data: one thread teacher starts (in the database, so teacher follows it), removed before
 * and after with its notifications; the replies are added in the database as if written later.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The thread this spec starts; its title marks its rows for clean-up. */
const threadTitle = 'Who follows this e2e follows';
const writerId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the thread (its follows and notifications go with it) and puts the languages back. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e follows';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher');`);
}

/** Starts the thread as teacher, as start_forum_thread() would: teacher follows it. */
function startThread() {
  runSql(`with forum as (select id from public.forums where slug = 'first-chapters'),
    thread as (
      insert into public.forum_threads (user_id, forum_id, title, last_post_number)
      select '${teacherId}', forum.id, '${threadTitle}', 1 from forum returning id)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select '${teacherId}', thread.id, 1, 'Who is reading along?' from thread;`);
}

/** Adds a reply by a persona at the end of the thread, written now. */
function addReply(userId: string, words: string) {
  runSql(`with thread as (
      update public.forum_threads set last_post_number = last_post_number + 1, last_post_at = now()
      where title = '${threadTitle}' returning id, last_post_number)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select '${userId}', thread.id, thread.last_post_number, '${words}' from thread;`);
}

/** The thread's address. */
function threadAddress(): string {
  const number = runSql(
    `select thread_number from public.forum_threads where title = '${threadTitle}';`,
  ).trim();
  return `/forums/first-chapters/${number}`;
}

/** Opens a page as a persona (or a visitor) in English. */
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

test.describe('following a forum thread (GAPS-16a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    startThread();
  });
  test.afterAll(cleanUp);

  test('a member follows a thread and it stays followed', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', threadAddress());
    const follow = page.getByRole('button', { name: 'Follow thread' });
    await expect(follow).toHaveAttribute('aria-pressed', 'false');
    await follow.click();
    const following = page.getByRole('button', { name: 'Following' });
    await expect(following).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('You get a notification when someone replies.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
    await page.context().close();
  });

  test('a reply reaches the follower, and the row opens the thread', async ({ browser }) => {
    addReply(teacherId, 'Glad you are here.');
    const page = await openAs(browser, 'adult_writer', '/notifications');
    const row = page.getByRole('listitem').filter({ hasText: `replied in “${threadTitle}”` });
    await expect(row).toBeVisible();
    await row.getByRole('link', { name: 'Open the thread' }).click();
    await expect(page.getByRole('heading', { level: 1, name: threadTitle })).toBeVisible();
    await page.context().close();
  });

  test('the starter follows from the start and hears the member reply', async ({ browser }) => {
    addReply(writerId, 'Reading along.');
    const page = await openAs(browser, 'teacher', '/notifications');
    await expect(page.getByText(`replied in “${threadTitle}”`)).toBeVisible();
    await page.goto(threadAddress());
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
    await page.context().close();
  });

  test('pressing Following again unfollows', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', threadAddress());
    await page.getByRole('button', { name: 'Following' }).click();
    await expect(page.getByRole('button', { name: 'Follow thread' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const follows = runSql(
      `select count(*) from public.forum_thread_follows where user_id = '${writerId}';`,
    ).trim();
    expect(follows).toBe('0');
    await page.context().close();
  });

  test('a visitor sees no Follow button', async ({ browser }) => {
    const page = await openAs(browser, null, threadAddress());
    await expect(page.getByRole('heading', { level: 1, name: threadTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Follow thread' })).toHaveCount(0);
    await page.context().close();
  });

  for (const view of [
    { width: 390, theme: 'night' },
    { width: 1440, theme: 'light' },
  ] as const) {
    test(`axe: the thread page at ${view.width} px, ${view.theme}`, async ({ browser }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, address: threadAddress(), language: 'en' });
      await context.close();
    });
  }
});
