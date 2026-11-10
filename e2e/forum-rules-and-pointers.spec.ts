/**
 * A forum's rules strip, a locked thread that points to the next one, and Preview before posting,
 * in a real browser (bundle GAPS-9; stories S1-E8-02 and S1-E8-05; board 5.2 Forum thread).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a moderator makes a thread the forum's rules thread with a reason: every other thread of the
 *   forum shows a strip with "Pinned", the rules thread's title as a link and the opening words
 *   of its first post; the rules thread itself shows no strip;
 * - a moderator points a locked thread at another by pasting its address: a member reads "Go to
 *   …" on the locked note and lands on that thread; removing the pointer takes the link away;
 * - "Preview" shows a reply as it will look, with formatting drawn and raw HTML left out, and
 *   posts nothing;
 * - a thread with the strip and the pointer passes axe at 390, 768 and 1440 px, light and night,
 *   ro and en, with no doodle drawn.
 * Test data: three threads this spec writes to the database, removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The three threads; the ending marks their rows for clean-up. */
const rulesTitle = 'Read this first e2e rules';
const septemberTitle = 'September prompt e2e rules';
const octoberTitle = 'October prompt e2e rules';
/** adult_writer, who starts every thread. */
const writerId = '00000000-0000-4000-8000-000000000001';
/** The forum's list. */
const forumAddress = '/forums/first-chapters';

/** Removes this spec's threads and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e rules';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher', 'moderator');`);
}

/**
 * Writes one thread with its first post.
 *
 * @param title - the thread's title
 * @param body - its first post
 */
function addThread(title: string, body: string) {
  runSql(`with thread as (
      insert into public.forum_threads (user_id, forum_id, title, last_post_number)
      select '${writerId}', forums.id, '${title}', 1
      from public.forums where slug = 'first-chapters' returning id)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select '${writerId}', thread.id, 1, '${body}' from thread;`);
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
 * A moderator writes a reason and presses one of the tools, then waits for "done".
 *
 * @param page - the moderator's thread page
 * @param reason - the reason
 * @param button - the tool's name
 * @param done - words from the success note
 */
async function moderate(page: Page, reason: string, button: string, done: string) {
  const tools = page.getByRole('region', { name: 'Moderator tools' });
  await tools.getByLabel('Reason').fill(reason);
  await tools.getByRole('button', { name: button }).click();
  await expect(tools.getByText(done)).toBeVisible();
}

test.describe('rules strip, a locked thread’s pointer and Preview (GAPS-9)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    addThread(rulesTitle, 'Post up to **2,000 words** at a time.');
    addThread(septemberTitle, 'Write about rain.');
    addThread(octoberTitle, 'Write about fog.');
  });
  test.afterAll(cleanUp);

  test('a moderator makes a thread the rules thread, and other threads show it', async ({
    browser,
  }) => {
    const moderator = await openAs(browser, 'moderator', threadAddress(rulesTitle));
    await moderate(moderator, 'The rules for this forum', 'Make rules thread', 'rules thread');
    // The rules thread shows no strip about itself.
    await expect(moderator.getByRole('complementary', { name: 'Forum rules' })).toHaveCount(0);
    const member = await openAs(browser, 'teacher', threadAddress(septemberTitle));
    const strip = member.getByRole('complementary', { name: 'Forum rules' });
    await expect(strip.getByText('Pinned', { exact: true })).toBeVisible();
    await expect(strip).toContainText('Post up to 2,000 words at a time.');
    await strip.getByRole('link', { name: rulesTitle }).click();
    await expect(member.getByRole('heading', { level: 1, name: rulesTitle })).toBeVisible();
    // Taking the mark away empties the strip.
    await moderate(moderator, 'Trying another', 'Stop being rules thread', 'no rules thread');
    await member.goto(threadAddress(septemberTitle));
    await expect(member.getByRole('heading', { level: 1, name: septemberTitle })).toBeVisible();
    await expect(member.getByRole('complementary', { name: 'Forum rules' })).toHaveCount(0);
    await moderator.context().close();
    await member.context().close();
  });

  test('a locked thread points to the thread that carries on', async ({ browser }) => {
    const moderator = await openAs(browser, 'moderator', threadAddress(septemberTitle));
    await moderate(
      moderator,
      'The September prompt has ended.',
      'Lock thread',
      'Everyone can still read it',
    );
    const tools = moderator.getByRole('region', { name: 'Moderator tools' });
    // Words that are no thread leave the button waiting.
    await tools.getByLabel('Reason').fill('It carries on in October');
    await tools.getByLabel('Thread that carries on').fill('the October one');
    await expect(tools.getByRole('button', { name: 'Point to that thread' })).toBeDisabled();
    // A pasted address is read for its number.
    await tools
      .getByLabel('Thread that carries on')
      .fill(`https://example.test${threadAddress(octoberTitle)}?post=1`);
    await tools.getByRole('button', { name: 'Point to that thread' }).click();
    await expect(tools.getByText('links to that thread')).toBeVisible();

    const member = await openAs(browser, 'teacher', threadAddress(septemberTitle));
    const note = member.getByRole('region', { name: 'This thread is locked' });
    await note.getByRole('link', { name: `Go to “${octoberTitle}”` }).click();
    await expect(member.getByRole('heading', { level: 1, name: octoberTitle })).toBeVisible();

    await moderate(moderator, 'Not needed', 'Remove pointer', 'pointer is gone');
    await member.goto(threadAddress(septemberTitle));
    await expect(note).toBeVisible();
    await expect(note.getByRole('link')).toHaveCount(0);
    await moderator.context().close();
    await member.context().close();
  });

  test('Preview shows the reply as it will look and posts nothing', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', threadAddress(octoberTitle));
    const box = page.getByRole('textbox', { name: 'Reply' });
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Preview' });
    await expect(preview).toContainText('Write something to see it here.');
    await box.fill(
      'Fog is **quiet**.\n\n<img src=x onerror="document.title=\'broken\'"> <b>raw</b>',
    );
    await expect(preview.locator('strong')).toHaveText('quiet');
    // Raw HTML is never drawn, in the preview as in a posted reply.
    await expect(preview.locator('img, b, script')).toHaveCount(0);
    await expect(page).not.toHaveTitle('broken');
    await page.getByRole('button', { name: 'Hide preview' }).click();
    await expect(preview).toHaveCount(0);
    // Nothing was posted: the thread still has its first post only.
    await expect(page.locator('#post-2')).toHaveCount(0);
    expect(
      runSql(
        `select count(*) from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id where forum_threads.title = '${octoberTitle}';`,
      ).trim(),
    ).toBe('1');
    await page.context().close();
  });

  test('axe: the strip and the pointer, every view', async ({ page }) => {
    // Every view times one page: longer than the default 30 s.
    test.setTimeout(240_000);
    runSql(`update public.forums set rules_thread_id = (select id from public.forum_threads where title = '${rulesTitle}')
      where slug = 'first-chapters';
      update public.forum_threads set locked_at = now(), lock_reason = 'The prompt has ended.',
        continues_in_thread_id = (select id from public.forum_threads where title = '${octoberTitle}')
      where title = '${septemberTitle}';`);
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    for (const view of everyView([threadAddress(septemberTitle)])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view);
      await expectNoDoodles(page);
    }
  });
});
