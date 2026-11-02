/**
 * Writer ranks in a real browser (bundle FORUMS-2, part e; story S1-E8-09; boards 6.1 and 5.2).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a writer with 15 published chapters shows "Rank: Storyteller" beside their name, the rank
 *   card with the ladder and "41,200 of 100,000 words to Novelist", and the Storyteller sticker
 *   on their picture (criterion 2; board 6.1);
 * - their forum post shows the rank beside their name, at phone width too (criterion 5);
 * - unpublishing chapters lowers the rank on the next visit (criterion 2);
 * - a writer with no published chapter shows no rank at all;
 * - the profile passes axe at 390, 768 and 1440 px, light and night, ro and en, and no doodle
 *   touches text or a control (the avatar's initials keep a line height of 1 since this part).
 * Test data: one story "Ranguri e2e" with 15 published chapters by the support persona, and one
 * thread "Ranguri e2e" they start here. Both are removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';

/**
 * The support persona's user ID (the seed's). No other spec writes as support, so the rank's
 * numbers stay exact while the other shards publish chapters for adult_writer at the same time.
 */
const writerId = '00000000-0000-4000-8000-000000000011';
const storyId = '23100000-0000-4000-9000-00000000e2e1';
const title = 'Ranguri e2e';

/** Takes off the story, its chapters and the thread, so the rank goes too. */
function cleanUp() {
  runSql(`
    delete from public.chapters where story_id = '${storyId}';
    delete from public.stories where id = '${storyId}';
    delete from public.forum_threads where title = '${title}';
    update public.profiles set locale = 'ro' where handle = 'support';`);
}

/**
 * Gives support a story with 15 published chapters and 41,200 words in all, so they are a
 * Storyteller on their way to Novelist. The database's triggers work the rank out.
 */
function publishChapters() {
  runSql(`
    insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
      first_published_at, last_chapter_published_at)
    values ('${storyId}', '${writerId}', 'ranguri-e2e', '${title}', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select '${storyId}', '${writerId}', 'rke2e' || lpad(step::text, 3, '0'), step, 'Capitol', 'x',
      words, 'published', 'Capitol', 'Text.', words, now()
    from generate_series(1, 15) as step,
         lateral (select case when step = 1 then 3204 else 2714 end as words) as sizes;`);
}

/** Starts the writer's thread, as the writer, and answers its address. */
function startThread(): string {
  const number =
    runSql(`select set_config('request.jwt.claims', '{"sub": "${writerId}", "role": "authenticated"}', false);
    select public.start_forum_thread('first-chapters', '${title}', 'Prima postare.') ->> 'thread_number';`)
      .split('\n')
      .at(-1);
  return `/forums/first-chapters/${number ?? ''}`;
}

/** Opens a page signed out, in English. */
async function openSignedOut(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

test.describe('writer ranks (FORUMS-2e, S1-E8-09)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a writer with no published chapter has no rank', async ({ browser }) => {
    const page = await openSignedOut(browser, '/u/support');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('rank-chip')).toHaveCount(0);
    await expect(page.getByText('The four ranks')).toHaveCount(0);
    await page.context().close();
  });

  test('the profile shows the rank, the ladder and the way to the next rank', async ({
    browser,
  }) => {
    publishChapters();
    const page = await openSignedOut(browser, '/u/support');
    await expect(page.getByTestId('rank-chip')).toHaveText('Rank: Storyteller');
    const card = page.getByRole('region', { name: 'Storyteller' });
    await expect(card.getByText('Forum posts don’t count.', { exact: false })).toBeVisible();
    const ladder = card.getByRole('list', { name: 'The four ranks' });
    await expect(ladder.getByRole('listitem')).toHaveCount(4);
    await expect(ladder.locator('[aria-current="step"]')).toContainText('Storyteller');
    await expect(card.getByText('41,200 of 100,000 words to Novelist')).toBeVisible();
    await expect(
      card.getByRole('progressbar', { name: 'Progress to Novelist, 41 per cent' }),
    ).toBeVisible();
    await page.context().close();
  });

  test('a forum post shows its author’s rank', async ({ browser }) => {
    const page = await openSignedOut(browser, startThread());
    const post = page.getByRole('article').first();
    await expect(post.getByTestId('rank-chip')).toHaveText('Rank: Storyteller');
    // Criterion 5: at phone width the chip still sits next to the name.
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(post.getByTestId('rank-chip')).toBeVisible();
    await page.context().close();
  });

  test('unpublishing chapters lowers the rank', async ({ browser }) => {
    runSql(`update public.chapters set status = 'draft'
      where story_id = '${storyId}' and position > 4;`);
    const page = await openSignedOut(browser, '/u/support');
    await expect(page.getByTestId('rank-chip')).toHaveText('Rank: New writer');
    await expect(page.getByText('4 of 5 chapters to Writer')).toBeVisible();
    await page.context().close();
    runSql(`update public.chapters set status = 'published' where story_id = '${storyId}';`);
  });

  test('axe: the profile with its rank, every view', async ({ browser }) => {
    // 12 views in one browser take longer than one test's usual 30 s.
    test.setTimeout(240_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const view of everyView(['/u/support'])) {
      await checkScreen(page, view);
      await expect(page.getByTestId('rank-chip')).toBeVisible();
      await expectNoDoodleOverlap(page);
    }
    await context.close();
  });
});
