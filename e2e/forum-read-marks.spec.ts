/**
 * Read and unread in the forums in a real browser (bundle FORUMS-1, part d; story S1-E8-04;
 * boards 5.1 Forums and 5.2 Forum thread).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a thread with posts the reader hasn't seen shows "New posts" in its forum's list, on the
 *   index and in "New for you" (criterion 1);
 * - opening it from the list lands on the first new post, and once read it shows "No new posts"
 *   (criterion 2);
 * - "Mark as read" on a forum and "Mark all as read" on the index clear the dots (criterion 3);
 * - a visitor sees no dots and no mark buttons;
 * - the index and the forum's page with new posts pass axe at 390, 768 and 1440 px, light and
 *   night, ro and en, and no doodle is drawn.
 * Test data: the thread this spec starts, removed before and after. Replies by adult_writer are
 * added straight into the database, as if written later, so the post limit doesn't come into it.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The thread this spec starts; its title marks its rows for clean-up. */
const threadTitle = 'Is it new to you e2e reads';

/** adult_writer's user ID in the seed. */
const writerId = '00000000-0000-4000-8000-000000000001';

/** Removes the thread, teacher's marks and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e reads';
    delete from public.forum_read_marks where user_id = '00000000-0000-4000-8000-000000000007';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher');`);
}

/** Opens a page as a persona (or a visitor) in English, with motion reduced. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    // The profile's language wins over the browser's, so set it first.
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/** The number of this spec's thread, read from the database. */
function threadNumber(): string {
  return runSql(
    `select thread_number from public.forum_threads where title = '${threadTitle}' and deleted_at is null;`,
  ).trim();
}

/** Adds a reply by adult_writer at the end of the thread, written now. */
function addReply(words: string) {
  runSql(`with thread as (
      update public.forum_threads set last_post_number = last_post_number + 1, last_post_at = now()
      where title = '${threadTitle}' returning id, last_post_number)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select '${writerId}', thread.id, thread.last_post_number, '${words}' from thread;`);
}

/** The thread's row in its forum's list. */
function threadRow(page: Page) {
  // The forum's own list, not the "New for you" card beside it (bundle G8a), which can name it too.
  return page
    .locator('section[aria-labelledby="thread-list-heading"]')
    .getByRole('listitem')
    .filter({ hasText: threadTitle });
}

/** The First chapters row on the index. */
function forumRow(page: Page) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: 'First chapters', exact: true }) });
}

test.describe('read and unread in the forums (FORUMS-1d, S1-E8-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a new thread is new in the list, on the index and in New for you', async ({ browser }) => {
    const writer = await openAs(browser, 'adult_writer', '/forums/first-chapters/new');
    await writer.getByLabel('Title').fill(threadTitle);
    await writer.getByLabel('Your post').fill('Does this look new to you?');
    await writer.getByRole('button', { name: 'Post the thread' }).click();
    await expect(writer.getByRole('heading', { level: 1, name: threadTitle })).toBeVisible();
    // One's own thread is never new to oneself.
    await writer.goto('/forums/first-chapters');
    await expect(threadRow(writer).getByText('No new posts')).toBeAttached();
    await writer.context().close();

    const page = await openAs(browser, 'teacher', '/forums');
    await expect(forumRow(page).getByText('New posts since your last visit')).toBeAttached();
    const newForYou = page.getByRole('region', { name: 'New for you' });
    await expect(newForYou.getByRole('link', { name: new RegExp(threadTitle) })).toHaveAttribute(
      'href',
      `/forums/first-chapters/${threadNumber()}?post=1`,
    );
    await expect(newForYou.getByText('1 new')).toBeVisible();
    await page.context().close();
  });

  test('the list opens a thread at its first new post, then it is read', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/forums/first-chapters');
    await threadRow(page).getByRole('link', { name: threadTitle }).click();
    await expect(page).toHaveURL(/\?post=1$/);
    await expect(page.locator('#post-1')).toBeFocused();
    await page.goto('/forums/first-chapters');
    await expect(threadRow(page).getByText('No new posts')).toBeAttached();
    // Two replies later, the list opens it at #2, the first of them.
    addReply('Second post, written later.');
    addReply('Third post, written later.');
    await page.reload();
    await expect(threadRow(page).getByText('New posts since your last visit')).toBeAttached();
    await threadRow(page).getByRole('link', { name: threadTitle }).click();
    await expect(page).toHaveURL(/\?post=2$/);
    await expect(page.locator('#post-2')).toBeFocused();
    await page.context().close();
  });

  test('Mark as read on a forum, and Mark all as read on the index', async ({ browser }) => {
    addReply('Fourth post.');
    const page = await openAs(browser, 'teacher', '/forums/first-chapters');
    await expect(threadRow(page).getByText('New posts since your last visit')).toBeAttached();
    await page.getByRole('button', { name: 'Mark as read: First chapters' }).click();
    await expect(threadRow(page).getByText('No new posts')).toBeAttached();

    addReply('Fifth post.');
    await page.goto('/forums');
    await expect(forumRow(page).getByText('New posts since your last visit')).toBeAttached();
    await page.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(forumRow(page).getByText('No new posts')).toBeAttached();
    await expect(
      page.getByRole('region', { name: 'New for you' }).getByText('You’re up to date.'),
    ).toBeVisible();
    await page.context().close();
  });

  test('a visitor sees no dots and nothing to mark', async ({ browser }) => {
    const page = await openAs(browser, null, '/forums');
    await expect(forumRow(page)).toBeVisible();
    await expect(page.getByText('New posts since your last visit')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark all as read' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'New for you' })).toHaveCount(0);
    await page.context().close();
  });

  test('axe: the index and a forum with new posts, every view', async ({ page }) => {
    // Two pages times every view: longer than the default 30 s.
    test.setTimeout(180_000);
    addReply('Sixth post, so something is new.');
    await useSessionInBrowser(page.context(), (await signInPersona('teacher')).session);
    for (const view of everyView(['/forums', '/forums/first-chapters'])) {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      await checkScreen(page, view);
      await expectNoDoodles(page);
    }
  });
});
