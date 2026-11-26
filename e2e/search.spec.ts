/**
 * Search stories, writers and Together in a real browser (story S1-E5-04; user stories 1.7 and
 * 1.8, boards A07-Search and A08-SearchResults).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - from Discover, a member searches without diacritics and finds the stories (criteria 1 and 2;
 *   the top bar's search is for members only since TRIAL-WALL);
 * - a 16+ story never appears for a visitor (criterion 3);
 * - more than 20 stories show 20 rows and "Show more results", sorted by best match, and a sort
 *   or filter applies at once and stays in the address (criterion 4; board A08);
 * - the Writers tab finds a writer by username and opens their profile;
 * - on a phone "Filter and sort" opens a sheet and counts the filters on, and writer rows have
 *   Follow (board A08);
 * - a search that finds nothing says so, with suggestions;
 * - before a search, Trending tags lists a tag read this week and opens its page (board A07);
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
// A tag of the spec's own, read this week, for Trending tags (board A07).
const trendingTag = 'trendsrche';

/** Removes the spec's stories and their chapters. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'srche2%';
    delete from public.stories where slug like 'search-e2e-%';
    delete from public.tags where name = '${trendingTag}';`);
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
    // The top bar's round search button opens the Search page (user story 1.7, board A07). The
    // member's own account language takes over from the English set above once the profile loads,
    // which redraws the bar, so the field is typed into until the word stays put.
    await page
      .getByRole('banner')
      .getByRole('link', { name: /Search|Caută/ })
      .click();
    await expect(page).toHaveURL(/\/search$/);
    const searchField = page.getByRole('search').getByRole('searchbox');
    await expect(async () => {
      await searchField.fill(foldedWord);
      await expect(searchField).toHaveValue(foldedWord, { timeout: 1000 });
    }).toPass();
    await searchField.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/search\\?q=${foldedWord}$`));
    // An adult member also sees the 16+ story, so all 22 are found (a visitor's 21 are below).
    // The member's account language may be Romanian, so the heading is matched by its number.
    await expect(page.getByRole('heading', { name: /^22 / })).toBeVisible();
    await expect(
      page.getByRole('link', { name: new RegExp(`${word} 1\\b`) }).first(),
    ).toBeVisible();
  });

  test('a 16+ story never shows for a visitor', async ({ page }) => {
    await page.goto(`/search?q=${foldedWord}`);
    await expect(
      page.getByRole('heading', { name: `21 stories for “${foldedWord}”` }),
    ).toBeVisible();
    await expect(page.getByText(`${word} de noapte`)).toHaveCount(0);
  });

  test('more than 20 stories show 20 rows and Show more results, and a sort applies at once', async ({
    page,
  }) => {
    await page.goto(`/search?q=${foldedWord}`);
    const stories = page.getByRole('list', { name: `21 stories for “${foldedWord}”` });
    // Only the rows themselves: each row's meta line is a list too.
    await expect(stories.locator(':scope > li')).toHaveCount(20);
    await expect(page.getByRole('radio', { name: 'Best match' })).toBeChecked();
    await page.getByRole('button', { name: 'Show more results' }).click();
    await expect(stories.locator(':scope > li')).toHaveCount(21);
    // Board A08: the filters apply at once, and the address keeps them.
    await page.getByRole('radio', { name: 'Most read' }).check();
    await expect(page).toHaveURL(/sort=popular/);
    await expect(page.getByText('Sorted by Most read')).toBeVisible();
  });

  test('the Writers tab finds a writer by username and opens their profile', async ({ page }) => {
    await page.goto('/search?q=teacher');
    await page
      .getByRole('group', { name: 'Results' })
      .getByText(/^Writers/)
      .click();
    await expect(page).toHaveURL(/in=writers/);
    // The row's link carries the writer's name; the username sits in the meta line under it.
    await page
      .getByRole('list', { name: 'Writers' })
      .getByRole('listitem')
      .filter({ hasText: '@teacher' })
      .first()
      .getByRole('link')
      .first()
      .click();
    await expect(page).toHaveURL(/\/u\/teacher$/);
  });

  test('on a phone Filter and sort opens a sheet and counts the filters, and writers have Follow', async ({
    page,
  }) => {
    // Board A08: under 1024 px the filters sit in a sheet, with the number of filters on.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/search?q=${foldedWord}`);
    await page.getByRole('button', { name: 'Filter and sort' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: 'Ongoing' }).check();
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
    await expect(page).toHaveURL(/status=ongoing/);
    await expect(page.getByRole('button', { name: 'Filter and sort · 1' })).toBeVisible();
    await page.goto('/search?q=teacher&in=writers');
    const writers = page.getByRole('list', { name: 'Writers' });
    await expect(writers.getByText(/follow/i).first()).toBeVisible();
  });

  test('before a search, Trending tags lists a tag read this week and opens its page', async ({
    page,
  }) => {
    // One of the spec's stories gets an approved tag and 1,000 reads today, so it trends.
    runSql(`insert into public.tags (name, normalised_name, status)
        values ('${trendingTag}', '${trendingTag}', 'approved') on conflict do nothing;
      insert into public.story_tags (story_id, tag_id, user_id)
        select stories.id, tags.id, stories.user_id from public.stories, public.tags
        where stories.slug = 'search-e2e-1' and tags.name = '${trendingTag}'
        on conflict do nothing;
      insert into public.chapter_reads (chapter_id, read_on, total)
        select chapters.id, current_date, 1000 from public.chapters where chapters.code = 'srche201'
        on conflict do nothing;`);
    await page.goto('/search');
    const trending = page.getByRole('region', { name: 'Trending tags' });
    await trending.getByRole('link', { name: `#${trendingTag}` }).click();
    await expect(page).toHaveURL(new RegExp(`/discover/t/${trendingTag}$`));
  });

  test('a search that finds nothing says so, with suggestions', async ({ page }) => {
    await page.goto(`/search?q=${missingWord}`);
    await expect(
      page.getByRole('heading', { name: `No stories match “${missingWord}”` }),
    ).toBeVisible();
    await expect(page.getByText('Check the spelling.')).toBeVisible();
  });

  for (const view of everyView([`/search?q=${foldedWord}`, '/search/writers?q=teacher'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
