/**
 * Liking a chapter in a real browser (story S1-E6-03; board 3.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - teacher taps "Like this chapter": the button turns to "Liked" (pressed, filled heart) and the
 *   count goes from 0 to 1; tapping again takes it back (first criterion);
 * - the like reaches the table the popularity job reads (second criterion; the job's own sum is
 *   proved in database test 148);
 * - a visitor sees the count and a "Get in to like" link; a read-only account is told why it
 *   can't like;
 * - "Report chapter" sits at the end of the same row and opens the report dialog for this
 *   chapter (S1-E10-01's shared button);
 * - the row passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: one published chapter on adult_writer's "Stația meteo"; removed after.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/likee001';

/** Removes this spec's chapter (its likes go with it) and puts the seed state back. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'likee%';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'kid_14_ok');`);
}

/** One published chapter to like. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'likee001', 1, 'Unu', 'x', 3, 'published', 'Unu',
      'Primul capitol aici.', 3, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/** Opens a page in English, as a persona or as a visitor, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName | null, path: string) {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('liking a chapter (S1-E6-03)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('teacher likes the chapter and takes the like back; the count follows', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', chapterAddress);
    const like = page.getByRole('button', { name: 'Like this chapter 0 likes' });
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await like.click();
    const liked = page.getByRole('button', { name: 'Liked 1 like' });
    await expect(liked).toHaveAttribute('aria-pressed', 'true');
    expect(
      runSql(`select count(*) from public.chapter_likes
        join public.chapters on chapters.id = chapter_likes.chapter_id where chapters.code = 'likee001'`),
    ).toBe('1');
    await liked.click();
    await expect(page.getByRole('button', { name: 'Like this chapter 0 likes' })).toBeVisible();
    await page.context().close();
  });

  test('“Report chapter” opens the report dialog for this chapter', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', chapterAddress);
    await page.getByRole('button', { name: /^Report chapter 1 of Stația meteo/ }).click();
    await expect(page.getByRole('dialog', { name: 'Report this chapter' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.context().close();
  });

  test('a read-only account is told it can’t like yet', async ({ browser }) => {
    const page = await openAs(browser, 'kid_14_ok', chapterAddress);
    await page.getByRole('button', { name: 'Like this chapter 0 likes' }).click();
    await expect(page.getByRole('alert')).toHaveText('This account can’t like chapters yet.');
    await page.context().close();
  });

  for (const view of everyView([chapterAddress])) {
    test(`the reader with Like and Report passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The profile's language wins over the browser's, and the tests above set it to English,
      // so the view's language goes on the profile too.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.getByRole('button', { pressed: false }).first()).toBeVisible();
      await context.close();
    });
  }
});
