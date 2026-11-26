/**
 * The story page as drawn on board B01 in a real browser (bundle 2, user story 2.1; Robert pressed
 * "As drawn on the canvas", 24 Nov 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a member likes the whole story with the Like button between the library and Share, the
 *   numbers line's likes follow, and the like can be taken back;
 * - the numbers line starts with the public reads total, which a visitor sees too;
 * - the facts line starts with the state in bold (Ongoing here), and "Labels from the writer"
 *   has no Status row;
 * - the writer sees no Like on their own story, and a read-only account is told it can't like;
 * - the hero passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: one published chapter on adult_writer's "Stația meteo", opened 12 times; removed
 * after (its story likes are removed too).
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
const storyAddress = '/s/statia-meteo-seed01';

/** Removes this spec's chapter and story likes and puts the seed state back. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'slkee%';
    delete from public.story_likes where story_id = '${storyId}';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'teen_17', 'adult_writer');`);
}

/** One published chapter, read 12 times, so the story page shows. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'slkee001', 1, 'Unu', 'x', 3, 'published', 'Unu',
      'Primul capitol aici.', 3, now());
    insert into public.chapter_reads (chapter_id, read_on, total)
      select id, current_date, 12 from public.chapters where code = 'slkee001';
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

test.describe('the story page as drawn on board B01 (bundle 2)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('a visitor sees the reads first, the state in bold and no Status row', async ({
    browser,
  }) => {
    const page = await openAs(browser, null, storyAddress);
    const stats = page.getByRole('list', { name: 'Story numbers' });
    await expect(stats.getByRole('listitem').first()).toHaveText('12 reads');
    await expect(stats).toContainText('0 likes');
    const header = page.locator('header').filter({
      has: page.getByRole('heading', { level: 1, name: 'Stația meteo' }),
    });
    const state = header.getByText('Ongoing', { exact: true });
    await expect(state).toBeVisible();
    // "Bold" in the design books is Semibold (600), the MetaLine's state weight.
    await expect(state).toHaveCSS('font-weight', '600');
    await expect(page.getByRole('button', { name: 'Like', exact: true })).toHaveCount(0);
    const labels = page.getByRole('heading', { name: 'Labels from the writer' }).locator('..');
    await expect(labels.getByText('Status', { exact: true })).toHaveCount(0);
    await page.context().close();
  });

  test('teacher likes the story and takes the like back; the numbers line follows', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', storyAddress);
    const stats = page.getByRole('list', { name: 'Story numbers' });
    const like = page.getByRole('button', { name: 'Like', exact: true });
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await like.click();
    const liked = page.getByRole('button', { name: 'Liked', exact: true });
    await expect(liked).toHaveAttribute('aria-pressed', 'true');
    await expect(stats).toContainText('1 like');
    await liked.click();
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await expect(stats).toContainText('0 likes');
    await page.context().close();
  });

  test('the writer sees no Like on their own story', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', storyAddress);
    await expect(page.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Liked?$/ })).toHaveCount(0);
    await page.context().close();
  });

  test('a read-only account is told it can’t like yet', async ({ browser }) => {
    const page = await openAs(browser, 'teen_17', storyAddress);
    await page.getByRole('button', { name: 'Like', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('This account can’t like stories yet.');
    await page.context().close();
  });

  for (const view of everyView([storyAddress])) {
    test(`the story page with Like passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The profile's language wins over the browser's, so the view's language goes on it too.
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
