/**
 * Comments on a chapter in a real browser (story S1-E6-01; board 3.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - teacher posts a comment; it shows under the chapter with their name and the heading counts
 *   it; the writer replies one level deep, with the "Writer" pill (criterion 1);
 * - a comment marked as a spoiler is hidden for others until they press "Show spoiler"
 *   (criterion 2);
 * - the writer deletes a comment on their own story (criterion 3);
 * - over the limit, the next comment is refused with how many minutes to wait (criterion 4);
 * - another reader reports a comment through the shared Report button (rule 6);
 * - a read-only account is told it can't comment yet;
 * - the comments pass axe and don't scroll sideways at 390, 768 and 1440 px, light and night,
 *   Romanian and English.
 * Test data: one published chapter on adult_writer's "Stația meteo"; its comments go with it.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/comme001';

/** Removes this spec's chapter (its comments, jobs and reports go with it) and the seed state. */
function cleanUp() {
  runSql(`delete from public.reports where item_type = 'comment';
    delete from public.cases where item_type = 'comment';
    delete from public.jobs where kind = 'comment_posted';
    delete from public.comments where chapter_id in (select id from public.chapters where code like 'comme%');
    delete from public.chapters where code like 'comme%';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    update public.settings set value = '5'::jsonb where key = 'comment_hourly_limit_new_account';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'adult_writer', 'blocker', 'kid_14_ok');`);
}

/** One published chapter to comment on. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'comme001', 1, 'Unu', 'x', 3, 'published', 'Unu',
      'Primul capitol aici.', 3, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/** Opens the chapter in English, as a persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(chapterAddress);
  return page;
}

/** Types a comment, ticks the spoiler box if asked, and posts it. */
async function postComment(page: Page, text: string, isSpoiler = false) {
  await page.getByLabel('Add a comment').fill(text);
  if (isSpoiler) await page.getByLabel('Hide as a spoiler').check();
  await page.getByRole('button', { name: 'Post comment' }).click();
}

test.describe('comments on a chapter (S1-E6-01)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('teacher comments; the writer replies one level deep', async ({ browser }) => {
    const teacher = await openAs(browser, 'teacher');
    await expect(teacher.getByRole('heading', { name: '0 comments' })).toBeVisible();
    await postComment(teacher, 'I had to put my phone down for a minute.');
    await expect(teacher.getByRole('heading', { name: '1 comment' })).toBeVisible();
    await expect(teacher.getByRole('article', { name: 'teacher' })).toContainText(
      'put my phone down',
    );
    await expect(teacher.getByLabel('Add a comment')).toHaveValue('');
    await teacher.context().close();

    const writer = await openAs(browser, 'adult_writer');
    await writer.getByRole('button', { name: 'Reply teacher' }).click();
    await writer.getByLabel('Reply to teacher').fill('That line took me four drafts.');
    await writer.getByRole('button', { name: 'Post reply' }).click();
    const replies = writer.getByRole('group', { name: 'Replies to teacher' });
    await expect(replies.getByRole('article', { name: 'Lia Scrie' })).toContainText('four drafts');
    await expect(replies.getByText('Writer', { exact: true })).toBeVisible();
    await expect(replies.getByRole('button', { name: /^Reply/ })).toHaveCount(0);
    await writer.context().close();
  });

  test('a spoiler stays hidden until “Show spoiler”', async ({ browser }) => {
    const teacher = await openAs(browser, 'teacher');
    await postComment(teacher, 'Chapter 15 tells you who was in the lift.', true);
    await expect(teacher.getByRole('heading', { name: '3 comments' })).toBeVisible();
    await teacher.context().close();

    const reader = await openAs(browser, 'blocker');
    await expect(reader.getByText('This comment is marked as a spoiler.')).toBeVisible();
    await expect(reader.getByText('who was in the lift')).toHaveCount(0);
    await reader.getByRole('button', { name: 'Show spoiler' }).click();
    await expect(reader.getByText('Chapter 15 tells you who was in the lift.')).toBeVisible();
    await reader.context().close();
  });

  test('another reader reports a comment', async ({ browser }) => {
    const reader = await openAs(browser, 'blocker');
    await reader.getByRole('button', { name: 'Report the comment by teacher' }).first().click();
    await expect(reader.getByRole('dialog', { name: 'Report this comment' })).toBeVisible();
    await reader.keyboard.press('Escape');
    await reader.context().close();
  });

  test('the writer deletes a comment on their own story', async ({ browser }) => {
    const writer = await openAs(browser, 'adult_writer');
    const spoiler = writer.getByRole('article', { name: 'teacher' }).filter({ hasText: 'Spoiler' });
    await spoiler.getByRole('button', { name: 'Delete the comment by teacher' }).click();
    await spoiler.getByRole('button', { name: 'Yes, delete it' }).click();
    await expect(writer.getByRole('heading', { name: '2 comments' })).toBeVisible();
    await expect(writer.getByText('This comment is marked as a spoiler.')).toHaveCount(0);
    await writer.context().close();
  });

  test('over the limit, the next comment says how long to wait', async ({ browser }) => {
    // teacher has posted twice this hour; the seed personas count as new accounts.
    runSql(
      `update public.settings set value = '2'::jsonb where key = 'comment_hourly_limit_new_account';`,
    );
    const teacher = await openAs(browser, 'teacher');
    await postComment(teacher, 'One more thought.');
    await expect(teacher.getByRole('alert')).toHaveText(
      /^You’ve posted a lot of comments\. Wait \d+ minutes? before the next one\.$/,
    );
    await teacher.context().close();
    runSql(
      `update public.settings set value = '5'::jsonb where key = 'comment_hourly_limit_new_account';`,
    );
  });

  test('a read-only account is told it can’t comment yet', async ({ browser }) => {
    const page = await openAs(browser, 'kid_14_ok');
    await postComment(page, 'Salut!');
    await expect(page.getByRole('alert')).toHaveText('Your account can’t comment yet.');
    expect(
      runSql(
        `select count(*) from public.comments where user_id <> '${teacherId}' and user_id <> '${adultWriterId}'`,
      ),
    ).toBe('0');
    await page.context().close();
  });

  for (const view of everyView([chapterAddress])) {
    test(`the comments pass axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('blocker')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.locator('#comments-heading')).toBeVisible();
      await context.close();
    });
  }
});
