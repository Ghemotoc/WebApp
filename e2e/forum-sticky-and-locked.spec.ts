/**
 * Sticky and locked threads and "Don't bump" in a real browser (bundle FORUMS-1, part e; story
 * S1-E8-05; boards 5.1 Forums and 5.2 Forum thread).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a moderator makes a thread sticky with a reason: it shows first in its forum with a Pinned
 *   pill; removing sticky puts it back in order of latest activity (criterion 1);
 * - a moderator locks a thread with a reason: a member sees "This thread is locked" with the
 *   reason and the moderation team (never the moderator's name) instead of the reply box, and the
 *   list shows a Locked pill; unlocking brings the reply box back (criterion 2);
 * - "Don't bump" posts the reply but leaves the thread where it was in the list (criterion 3);
 * - a member sees no moderator tools; the locked thread passes axe at 390, 768 and 1440 px,
 *   light and night, ro and en, with its padlock doodle clear of the text.
 * Test data: two threads this spec writes to the database, removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The two threads; the ending marks their rows for clean-up. */
const olderTitle = 'Older thread e2e sticky';
const newerTitle = 'Newer thread e2e sticky';
/** adult_writer, who starts both threads. */
const writerId = '00000000-0000-4000-8000-000000000001';
/** The forum's list. */
const forumAddress = '/forums/first-chapters';

/** Removes this spec's threads and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e sticky';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher', 'moderator');`);
}

/**
 * Writes one thread with its first post, its latest activity some days ago.
 *
 * @param title - the thread's title
 * @param daysAgo - how long ago its latest post came
 */
function addThread(title: string, daysAgo: number) {
  runSql(`with thread as (
      insert into public.forum_threads (user_id, forum_id, title, last_post_number, last_post_at, bumped_at)
      select '${writerId}', forums.id, '${title}', 1, now() - interval '${daysAgo} days', now() - interval '${daysAgo} days'
      from public.forums where slug = 'first-chapters' returning id)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select '${writerId}', thread.id, 1, 'The first post.' from thread;`);
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

/** The titles of this spec's threads in the forum's list, top to bottom. */
async function listedOrder(page: Page): Promise<string[]> {
  await page.goto(forumAddress);
  const links = page.getByRole('link', { name: /e2e sticky$/ });
  await expect(links).toHaveCount(2);
  return links.allTextContents();
}

/** One row of the forum's list. */
function threadRow(page: Page, title: string) {
  // The forum's own list, not the "New for you" card beside it (bundle G8a), which can name it too.
  return page
    .locator('section[aria-labelledby="thread-list-heading"]')
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: title }) });
}

/**
 * A moderator writes a reason and presses one of the tools.
 *
 * @param page - the moderator's thread page
 * @param reason - the reason
 * @param button - the tool's name
 */
async function moderate(page: Page, reason: string, button: string) {
  const tools = page.getByRole('region', { name: 'Moderator tools' });
  await tools.getByLabel('Reason').fill(reason);
  await tools.getByRole('button', { name: button }).click();
  await expect(tools.getByText(/^The thread (is|is back)/)).toBeVisible();
}

test.describe('sticky and locked threads, and Don’t bump (FORUMS-1e, S1-E8-05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    addThread(olderTitle, 3);
    addThread(newerTitle, 1);
  });
  test.afterAll(cleanUp);

  test('a moderator makes a thread sticky, and removes it again', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', threadAddress(olderTitle));
    expect(await listedOrder(page)).toEqual([newerTitle, olderTitle]);
    await page.goto(threadAddress(olderTitle));
    await moderate(page, 'The rules for this forum', 'Make sticky');
    expect(await listedOrder(page)).toEqual([olderTitle, newerTitle]);
    await expect(threadRow(page, olderTitle).getByText('Pinned', { exact: true })).toBeVisible();
    await page.goto(threadAddress(olderTitle));
    await moderate(page, 'Not needed any more', 'Remove sticky');
    expect(await listedOrder(page)).toEqual([newerTitle, olderTitle]);
    await page.context().close();
  });

  test('a locked thread shows its reason and takes no replies', async ({ browser }) => {
    const moderator = await openAs(browser, 'moderator', threadAddress(newerTitle));
    await moderate(moderator, 'The prompt has ended.', 'Lock thread');
    const member = await openAs(browser, 'teacher', threadAddress(newerTitle));
    const note = member.getByRole('region', { name: 'This thread is locked' });
    await expect(note).toContainText('Locked by the moderation team on');
    await expect(note).toContainText('Reason: “The prompt has ended.”');
    await expect(note).not.toContainText('moderator');
    await expect(member.getByRole('textbox', { name: 'Your reply' })).toHaveCount(0);
    await expect(member.getByRole('region', { name: 'Moderator tools' })).toHaveCount(0);
    await member.goto(forumAddress);
    await expect(threadRow(member, newerTitle).getByText('Locked', { exact: true })).toBeVisible();
    // Unlocking brings the reply box back.
    await moderate(moderator, 'Reopened for late entries', 'Unlock thread');
    await member.goto(threadAddress(newerTitle));
    await expect(member.getByRole('textbox', { name: 'Your reply' })).toBeVisible();
    await moderator.context().close();
    await member.context().close();
  });

  test('Don’t bump posts the reply and leaves the thread where it was', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', threadAddress(olderTitle));
    await page.getByRole('textbox', { name: 'Your reply' }).fill('A quiet note, no need to bump.');
    await page.getByRole('checkbox', { name: 'Don’t bump' }).check();
    await page.getByRole('button', { name: 'Post reply' }).click();
    await expect(page.locator('#post-2')).toBeVisible();
    expect(await listedOrder(page)).toEqual([newerTitle, olderTitle]);
    await page.context().close();
  });

  test('axe: a locked thread, every view', async ({ page }) => {
    // Every view times one page: longer than the default 30 s.
    test.setTimeout(180_000);
    runSql(`update public.forum_threads set locked_at = now(), lock_reason = 'The prompt has ended.'
      where title = '${olderTitle}';`);
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    for (const view of everyView([threadAddress(olderTitle)])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view);
      await expectNoDoodleOverlap(page);
    }
  });
});
