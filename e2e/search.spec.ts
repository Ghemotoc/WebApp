/**
 * Search stories, writers and tags in a real browser (story S1-E5-04; board Search 3.2).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - from Discover, a member searches without diacritics and finds the stories (criteria 1 and 2;
 *   the top bar's search is for members only since TRIAL-WALL);
 * - a 16+ story never appears for a visitor (criterion 3);
 * - more than 20 stories make one line of 20 with "View more", which opens every story found,
 *   sorted by best match (criterion 4);
 * - the Writers group finds a writer by username and opens their profile;
 * - on a phone the results are rows of at most 20 with See all, and writer rows have Follow
 *   (bundle CALM-7c);
 * - a search that finds nothing says so and offers Discover;
 * - the search pages pass axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: 22 stories of the spec's own by teacher (one of them 16+), removed afterwards.
 */
import { expect, test } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

// Fixed words, not a time stamp: Playwright builds the test titles in every worker, so a title
// that holds a changing word isn't found again ("Test not found in the worker process").
const word = 'Ciocârliasrche';
const foldedWord = 'ciocarliasrche';
const missingWord = 'zzqqsrche';

/** Removes the spec's stories and their chapters. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'srche2%';
    delete from public.stories where slug like 'search-e2e-%';`);
}

/** 21 readable stories for everyone and one 16+, all with the spec's word in the title. */
function seedStories() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    select '00000000-0000-4000-8000-000000000007', 'search-e2e-' || number,
      case when number = 22 then '${word} de noapte' else '${word} ' || number end, 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing',
      case when number = 22 then '16_plus' else 'all_ages' end::public.story_rating,
      now() - make_interval(hours => number), now()
    from generate_series(1, 22) as number;
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'srche2' || lpad(substr(slug, 12), 2, '0'), 1, 'Unu', 'x', 1, 'published',
      'Unu', 'Text.', 1, now()
    from public.stories where slug like 'search-e2e-%';`);
}

test.describe('search (S1-E5-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(([key]) => localStorage.setItem(key, 'en'), [
      LANGUAGE_STORAGE_KEY,
    ] as const);
  });

  test('a member searches from Discover without diacritics and finds the stories', async ({
    page,
  }) => {
    // The top bar's search shows only to a signed-in member (TRIAL-WALL, Robert, 23 Nov 2026).
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    await page.goto('/discover');
    // The top bar's search pill (bundle G4 SHELL): Enter opens the Search page. The member's own
    // account language takes over from the English set above once the profile loads, which
    // redraws the bar, so the search box is found by its role alone and typed into until the
    // word stays put.
    const topBarSearch = page.getByRole('banner').getByRole('searchbox');
    await expect(async () => {
      await topBarSearch.fill(foldedWord);
      await expect(topBarSearch).toHaveValue(foldedWord, { timeout: 1000 });
    }).toPass();
    await topBarSearch.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/search\\?q=${foldedWord}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(foldedWord);
    // An adult member also sees the 16+ story, so all 22 are found (a visitor's 21 are below).
    await expect(page.getByRole('heading', { name: /^22 / })).toBeVisible();
    await expect(
      page.getByRole('link', { name: new RegExp(`${word} 1\\b`) }).first(),
    ).toBeVisible();
  });

  test('a 16+ story never shows for a visitor', async ({ page }) => {
    await page.goto(`/search?q=${foldedWord}`);
    await expect(page.getByRole('heading', { name: '21 stories' })).toBeVisible();
    await expect(page.getByText(`${word} de noapte`)).toHaveCount(0);
  });

  test('more than 20 stories end with View more, which lists them all by best match', async ({
    page,
  }) => {
    await page.goto(`/search?q=${foldedWord}`);
    await page.getByRole('link', { name: /View more/ }).click();
    await expect(page).toHaveURL(new RegExp(`/search/stories\\?q=${foldedWord}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Stories for “${foldedWord}”`);
    await expect(page.getByText('21 stories')).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Sort/ })).toHaveValue('relevance');
  });

  test('the Writers group finds a writer by username and opens their profile', async ({ page }) => {
    await page.goto('/search?q=teacher');
    await page.getByRole('group', { name: 'Show' }).getByText('Writers', { exact: true }).click();
    await page
      .getByRole('link', { name: /@teacher/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/u\/teacher$/);
  });

  test('on a phone the results are rows with See all, and writers have Follow', async ({
    page,
  }) => {
    // Handover Step 3, "Search on phones" (CALM-7c): rows under 768 px, at most 20, then See all.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/search?q=${foldedWord}`);
    const stories = page.getByRole('list', { name: '21 stories' });
    // Only the rows themselves: each row's meta lines are lists too.
    await expect(stories.locator(':scope > li')).toHaveCount(20);
    await page.getByRole('link', { name: 'See 21 stories' }).click();
    await expect(page).toHaveURL(new RegExp(`/search/stories\\?q=${foldedWord}`));
    await page.goto('/search?q=teacher');
    await page.getByRole('group', { name: 'Show' }).getByText('Writers', { exact: true }).click();
    const writers = page.getByRole('list', { name: /writer/ });
    await expect(writers.getByRole('link', { name: /follow/i }).first()).toBeVisible();
  });

  test('a search that finds nothing says so and offers Discover', async ({ page }) => {
    await page.goto(`/search?q=${missingWord}`);
    await expect(
      page.getByRole('heading', { name: `No results for “${missingWord}”` }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Browse Read' }).click();
    await expect(page).toHaveURL(/\/discover$/);
  });

  for (const view of everyView([`/search?q=${foldedWord}`, '/search/writers?q=teacher'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
