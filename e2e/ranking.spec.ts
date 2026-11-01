/**
 * Popularity ranking in a real browser (story S1-E5-03, with S1-E5-02's popular sort; board 3.1).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - Discover shows its shelves in the order of the discover_shelves setting, Popular and New and
 *   rising included, and a changed setting changes the order with no release (Q46);
 * - a list opens in popular order: the story with likes and a comment comes before the one
 *   without (criterion 1), and the sort drop-down says Popular;
 * - "How ranking works" opens the terms at section 5 (DSA art. 27);
 * - the story page's stats row shows the likes, comments, chapters and the last update, and no
 *   read total.
 * Test data: two stories of its own by adult_writer tagged "e2e-rank", liked by teacher and
 * blocker and commented on by teacher; removed afterwards, and the setting restored.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const blockerId = '00000000-0000-4000-8000-000000000015';
const tag = 'e2e-rank';
// The setting as the migrations leave it (S1-E5-06 classics, S1-E2-06 picked, IDEAS-1e shared),
// so cleaning up puts back every shelf the other specs expect.
const defaultShelves =
  '["following", "picked", "popular", "rising", "shared", "new", "completed", "updated", "classics", "categories"]';

/** Removes this spec's stories, likes, comments and tag, and puts the setting back. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'rnke2e%';
    delete from public.stories where slug like 'rank-e2e-%';
    delete from public.tags where normalised_name = '${tag}';
    update public.settings set value = '${defaultShelves}'::jsonb where key = 'discover_shelves';`);
}

/** Two stories: "Liked" with two likes and a comment, "Quiet" newer but with nothing. */
function seedStories() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values
      ('${adultWriterId}', 'rank-e2e-liked', 'Liked lighthouse', 'x', 'en',
       (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages',
       now() - interval '2 days', now() - interval '2 days'),
      ('${adultWriterId}', 'rank-e2e-quiet', 'Quiet harbour', 'x', 'en',
       (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages',
       now() - interval '1 day', now() - interval '1 day');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'rnke2e' || substr(md5(slug), 1, 2), 1, 'One', 'x', 1, 'published', 'One',
      'Text.', 1, first_published_at from public.stories where slug like 'rank-e2e-%';
    insert into public.tags (name, normalised_name, status) values ('${tag}', '${tag}', 'approved');
    insert into public.story_tags (story_id, tag_id, user_id)
    select stories.id, tags.id, stories.user_id from public.stories, public.tags
    where stories.slug like 'rank-e2e-%' and tags.normalised_name = '${tag}';
    insert into public.chapter_likes (user_id, chapter_id)
    select persona, chapters.id from public.chapters
    join public.stories on stories.id = chapters.story_id and stories.slug = 'rank-e2e-liked',
      unnest(array['${teacherId}', '${blockerId}']::uuid[]) as persona;
    insert into public.comments (user_id, chapter_id, body)
    select '${teacherId}', chapters.id, 'Lovely.' from public.chapters
    join public.stories on stories.id = chapters.story_id and stories.slug = 'rank-e2e-liked';
    select public.compute_story_scores();`);
}

/** A visitor's page in English. */
async function openAsVisitor(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The shelf headings on Discover, in page order. */
async function shelfHeadings(page: Page): Promise<string[]> {
  // Shelves load one by one, so wait for both shelves every test reads before taking the order.
  await expect(page.getByRole('heading', { level: 2, name: 'Popular' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Recently updated' })).toBeVisible();
  return page.getByRole('heading', { level: 2 }).allInnerTexts();
}

test.describe('popularity ranking (S1-E5-03)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('Discover follows the shelf setting, and a new order needs no release', async ({
    browser,
  }) => {
    const page = await openAsVisitor(browser, '/discover');
    const headings = await shelfHeadings(page);
    const popular = headings.indexOf('Popular');
    expect(popular).toBeGreaterThanOrEqual(0);
    expect(headings.indexOf('New and rising')).toBeGreaterThan(popular);
    expect(headings.indexOf('Recently updated')).toBeGreaterThan(headings.indexOf('Completed'));

    runSql(`update public.settings set value = '["updated", "popular"]'::jsonb
      where key = 'discover_shelves';`);
    const reordered = await openAsVisitor(browser, '/discover');
    expect((await shelfHeadings(reordered)).slice(0, 2)).toEqual(['Recently updated', 'Popular']);
    await expect(reordered.getByRole('heading', { level: 2, name: 'New and rising' })).toHaveCount(
      0,
    );
  });

  test('a list opens in popular order: likes and comments come first', async ({ browser }) => {
    const page = await openAsVisitor(browser, `/discover/t/${tag}`);
    const cards = page.getByRole('link', { name: /Liked lighthouse|Quiet harbour/ });
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toHaveAccessibleName(/Liked lighthouse/);
    await expect(page.getByLabel('Sort by')).toHaveValue('popular');
    // Newest first puts the quieter, newer story on top instead.
    await page.getByLabel('Sort by').selectOption({ label: 'Newest' });
    await expect(cards.first()).toHaveAccessibleName(/Quiet harbour/);
  });

  test('"How ranking works" opens the terms at the ranking section', async ({ browser }) => {
    const page = await openAsVisitor(browser, '/discover');
    await page.getByRole('link', { name: 'How ranking works' }).click();
    await expect(page).toHaveURL(/\/legal\/terms#section-5$/);
    await expect(page.locator('#section-5')).toBeInViewport();
    await expect(page.locator('#section-5')).toContainText(/rank/i);
  });

  test('the story page shows likes, comments, chapters and the update, never reads', async ({
    browser,
  }) => {
    const page = await openAsVisitor(browser, '/s/rank-e2e-liked');
    const stats = page.getByRole('list', { name: 'Story numbers' });
    await expect(stats).toContainText('2 likes');
    await expect(stats).toContainText('1 comment');
    await expect(stats).toContainText('1 chapter');
    await expect(stats).toContainText('Updated');
    await expect(stats).not.toContainText(/reads?/i);
  });
});
