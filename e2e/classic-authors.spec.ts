/**
 * Classics show their real author, in a real browser (part of story S1-E5-06; Robert,
 * 25 Oct 2026: classics stay classics, but the writer shown is the real one).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a classic's story page names its real author in the header and in an author card that says
 *   when the author died, with no Follow button and no profile link (the author has no account);
 * - the reader names the real author too;
 * - the card on a list names the real author;
 * - the story page shows no "Completed" pill but says Completed and the year the work was first
 *   published under "Labels from the writer", with the title beside the cover on a desktop
 *   (Robert, 6 Nov 2026);
 * - the author card passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: one story of its own, owned by adult_writer as a stand-in for the classics account,
 * with one published chapter and a made-up author; removed afterwards.
 */
import { expect, test } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const slug = 'classic-e2e-story';
const authorName = 'Ana Testescu';

/** Removes this spec's story, chapter and author. */
function cleanUp() {
  runSql(`delete from public.chapters where code = 'clse2e01';
    delete from public.stories where slug = '${slug}';
    delete from public.classic_authors where name = '${authorName}';`);
}

/** One classic by a made-up author who died in 1901, first published in 1888, with one chapter. */
function seedClassic() {
  cleanUp();
  runSql(`insert into public.classic_authors (name, died_year) values ('${authorName}', 1901);
    insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at, classic_author_id)
    values ('${adultWriterId}', '${slug}', 'Old lighthouse tales', 'x', 'en',
      (select id from public.categories where slug = 'fiction'), 'completed', 'all_ages',
      now() - interval '1 day', now() - interval '1 day',
      (select id from public.classic_authors where name = '${authorName}'));
    update public.stories set first_published_year = 1888 where slug = '${slug}';
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'clse2e01', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1,
      first_published_at from public.stories where slug = '${slug}';`);
}

test.describe('classics show their real author (S1-E5-06)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedClassic);
  test.afterAll(cleanUp);

  test('the story page, the reader and the list name the real author', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);

    // The story page: the header and the author card, with no Follow and no profile.
    await page.goto(`/s/${slug}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Old lighthouse tales' }),
    ).toBeVisible();
    await expect(page.getByText(`by ${authorName}`).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: authorName })).toBeVisible();
    await expect(
      page.getByText('A classic in the public domain. Its author died in 1901.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'See profile' })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: new RegExp(`Follow ${authorName}`) }),
    ).toHaveCount(0);

    // The reader.
    await page.goto(`/s/${slug}/clse2e01`);
    await expect(page.getByText(authorName).first()).toBeVisible();

    // The card on the New list.
    await page.goto('/discover/all/new');
    await expect(page.getByText(new RegExp(authorName)).first()).toBeVisible();
  });

  test('the story page shows Completed only in the labels, the first publication year, and the title beside the cover', async ({
    page,
  }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/s/${slug}`);
    const title = page.getByRole('heading', { level: 1, name: 'Old lighthouse tales' });
    await expect(title).toBeVisible();

    // No status pill for a finished story; the labels still say it, with the year.
    const header = page.locator('header').filter({ has: title });
    await expect(header.getByText('Completed', { exact: true })).toHaveCount(0);
    const labels = page.getByRole('heading', { name: 'Labels from the writer' }).locator('..');
    await expect(labels.getByText('Completed', { exact: true })).toBeVisible();
    await expect(labels.getByText('First published')).toBeVisible();
    await expect(labels.getByText('1888', { exact: true })).toBeVisible();

    // Beside the cover: the title starts to the right of the cover and above its bottom edge.
    const coverBox = await header.locator('div').first().boundingBox();
    const titleBox = await title.boundingBox();
    expect(coverBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    if (coverBox === null || titleBox === null) return;
    expect(titleBox.x).toBeGreaterThanOrEqual(coverBox.x + coverBox.width);
    expect(titleBox.y).toBeLessThan(coverBox.y + coverBox.height);
  });

  test('axe: the author card at every width', async ({ page }) => {
    for (const view of everyView([`/s/${slug}`])) {
      await checkScreen(page, view);
    }
  });
});
