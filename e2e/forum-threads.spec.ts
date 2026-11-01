/**
 * Forum threads and posts in a real browser (bundle FORUMS-1, part b; story S1-E8-02; board 5.2
 * Forum thread).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a member starts a thread from a forum and lands on it as post #1; another member replies and
 *   gets #2; every post shows its number as a permalink, and a permalink opens at that post
 *   (criterion 3);
 * - HTML in a post is refused with plain words, and a link shows with rel="nofollow ugc noopener"
 *   (criteria 1 and 2);
 * - the author edits a post, which then says "Edited"; a moderator can read the earlier version
 *   (criterion 4);
 * - a signed-out visitor reads the thread and is asked to log in to reply; every post by someone
 *   else has Report; the author deletes their reply and its number stays as "Post deleted";
 * - the forum, the thread and the new-thread page pass axe at 390, 768 and 1440 px, light and
 *   night, ro and en, and no doodle touches text or a control.
 * Test data: the threads this spec starts, removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The thread this spec starts; its title marks its rows for clean-up. */
const threadTitle = 'How do I open without a prologue? e2e';

/** Removes the threads this spec starts and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher', 'moderator');`);
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

/** The address of this spec's thread, read from the database. */
function threadAddress(): string {
  const number = runSql(
    `select thread_number from public.forum_threads where title = '${threadTitle}' and deleted_at is null;`,
  ).trim();
  return `/forums/first-chapters/${number}`;
}

/** One post's card on the thread page. */
function postCard(page: Page, number: number) {
  return page.locator(`#post-${number}`);
}

test.describe('forum threads and posts (FORUMS-1b, S1-E8-02)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a member starts a thread and lands on it as post #1', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/forums/first-chapters');
    await page.getByRole('link', { name: 'Start a thread' }).click();
    await expect(page).toHaveURL(/\/forums\/first-chapters\/new$/);
    await page.getByLabel('Title').fill(threadTitle);
    await page
      .getByLabel('Your post')
      .fill('Every version of my chapter one starts with **two pages** of history.');
    await page.getByRole('button', { name: 'Post the thread' }).click();
    await expect(page.getByRole('heading', { level: 1, name: threadTitle })).toBeVisible();
    await expect(postCard(page, 1).getByText('Thread starter')).toBeVisible();
    await expect(postCard(page, 1).locator('strong')).toHaveText('two pages');
    await expect(postCard(page, 1).getByRole('link', { name: 'Link to post #1' })).toBeVisible();
    await page.context().close();
  });

  test('another member replies safely and gets #2', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', threadAddress());
    // HTML is refused with plain words (criterion 1).
    await page
      .getByRole('textbox', { name: 'Your reply' })
      .fill('Try this <script>alert(1)</script>');
    await page.getByRole('button', { name: 'Post reply' }).click();
    await expect(page.getByText('Posts can’t contain HTML tags.', { exact: false })).toBeVisible();
    // A reply with a link posts as #2, and the link is safe (criterion 2).
    await page
      .getByRole('textbox', { name: 'Your reply' })
      .fill('Start with the scene. Our [guide](https://example.com/guide) helps.');
    await page.getByRole('button', { name: 'Post reply' }).click();
    await expect(page).toHaveURL(/\?post=2$/);
    const reply = postCard(page, 2);
    await expect(reply.getByRole('link', { name: 'Link to post #2' })).toBeVisible();
    await expect(reply.getByRole('link', { name: 'guide' })).toHaveAttribute(
      'rel',
      'nofollow ugc noopener',
    );
    await page.context().close();
  });

  test('a permalink opens at its post; a visitor reads and is asked to log in', async ({
    browser,
  }) => {
    const page = await openAs(browser, null, `${threadAddress()}?post=2`);
    await expect(postCard(page, 2)).toBeFocused();
    await expect(page.getByRole('link', { name: 'Log in to reply' })).toBeVisible();
    await postCard(page, 2).getByRole('button', { name: 'Report' }).click();
    await expect(page.getByRole('dialog').getByText('Report this post')).toBeVisible();
    await page.context().close();
  });

  test('the author edits; a moderator reads the earlier version', async ({ browser }) => {
    const writer = await openAs(browser, 'adult_writer', threadAddress());
    await postCard(writer, 1).getByRole('button', { name: 'Edit post 1' }).click();
    await writer.getByLabel('Your post').fill('My chapter one now opens on the scene.');
    await writer.getByRole('button', { name: 'Save changes' }).click();
    await expect(postCard(writer, 1).getByText(/^Edited /)).toBeVisible();
    await expect(
      postCard(writer, 1).getByText('My chapter one now opens on the scene.'),
    ).toBeVisible();
    await writer.context().close();
    const moderator = await openAs(browser, 'moderator', threadAddress());
    await postCard(moderator, 1).getByRole('button', { name: 'Earlier versions' }).click();
    await expect(
      postCard(moderator, 1).getByText('Only moderators see these.', { exact: false }),
    ).toBeVisible();
    await expect(postCard(moderator, 1).locator('strong')).toHaveText('two pages');
    await moderator.context().close();
  });

  test('the author deletes their reply and its number stays', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', threadAddress());
    await postCard(page, 2).getByRole('button', { name: 'Delete post 2' }).click();
    await page.getByRole('button', { name: 'Delete the post' }).click();
    await expect(postCard(page, 2).getByText('Post deleted')).toBeVisible();
    await expect(postCard(page, 1)).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView(['/forums/first-chapters'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
      await expectNoDoodleOverlap(page);
    });
  }

  test('axe: the thread page and the new-thread page, every view', async ({ page }) => {
    // Two pages times every view: longer than the default 30 s.
    test.setTimeout(180_000);
    runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    for (const view of everyView([threadAddress(), '/forums/first-chapters/new'])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view);
      await expectNoDoodleOverlap(page);
    }
  });
});
