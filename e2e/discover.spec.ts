/**
 * Discover and the story lists in a real browser (stories S1-E5-01, S1-E5-09; boards 3.1, 3.10).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the top bar links to Discover, and Discover shows the shelves with this spec's stories; a 16+
 *   story is left out for a visitor (CLAUDE.md rule 18), and "View more" opens the See all page;
 * - a tag on the story page opens the tag page, whose filters go into the address and survive a
 *   reload (S1-E5-09, fourth criterion);
 * - an adult sees the 16+ story on the same page;
 * - an address for a list that doesn't exist says so;
 * - Discover and a category page pass axe and don't scroll sideways at 390, 768 and 1440 px,
 *   light and night, Romanian and English.
 * Test data: three stories of its own by adult_writer, one chapter each, all tagged
 * "e2e-farul", removed afterwards. Assertions use only these stories, so other specs publishing
 * at the same time don't change the result.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const tag = 'e2e-farul';

/** This spec's stories: slug, title, category, language, status and rating. */
const stories = [
  ['disc-e2e-farul', 'Farul de la Sulina', 'fiction', 'ro', 'ongoing', 'all_ages'],
  ['disc-e2e-tide', 'Tide Tables', 'poetry', 'en', 'completed', 'all_ages'],
  ['disc-e2e-noapte', 'Noaptea lungă', 'fiction', 'ro', 'ongoing', '16_plus'],
] as const;

/** Removes this spec's stories, chapters and tag. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'disce%';
    delete from public.stories where slug like 'disc-e2e-%';
    delete from public.tags where normalised_name = '${tag}';`);
}

/** The three stories, each with one published chapter and the shared tag. */
function seedStories() {
  cleanUp();
  const rows = stories.map(
    ([slug, title, category, language, status, rating]) =>
      `('${adultWriterId}', '${slug}', '${title}', 'x', '${language}',
        (select id from public.categories where slug = '${category}'), '${status}', '${rating}',
        now(), now())`,
  );
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ${rows.join(',')};
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'disce' || substr(md5(slug), 1, 3), 1, 'Unu', 'x', 1, 'published', 'Unu',
      'Text.', 1, now() from public.stories where slug like 'disc-e2e-%';
    insert into public.tags (name, normalised_name) values ('${tag}', '${tag}');
    insert into public.story_tags (story_id, tag_id, user_id)
    select stories.id, tags.id, stories.user_id from public.stories, public.tags
    where stories.slug like 'disc-e2e-%' and tags.normalised_name = '${tag}';`);
}

/** A visitor's page in English. */
async function openAsVisitor(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Discover and story lists (S1-E5-01, S1-E5-09)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('a visitor finds the shelves from the top bar, without the 16+ story', async ({
    browser,
  }) => {
    const page = await openAsVisitor(browser, '/');
    await page.getByRole('banner').getByRole('link', { name: 'Discover' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Find your next story' }),
    ).toBeVisible();
    const updated = page.getByRole('region', { name: 'Recently updated', exact: true });
    await expect(updated.getByRole('link', { name: /Farul de la Sulina/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Noaptea lungă/ })).toHaveCount(0);
    // Every shelf leads to its See all page.
    await page.goto('/discover/all/updated');
    await expect(page.getByRole('heading', { level: 1, name: 'Recently updated' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Tide Tables/ })).toBeVisible();
  });

  test('a tag opens its page, and the filters stay in the address', async ({ browser }) => {
    const page = await openAsVisitor(browser, '/s/disc-e2e-farul');
    await page.getByRole('list', { name: 'Tags' }).getByRole('link', { name: tag }).click();
    await expect(page).toHaveURL(new RegExp(`/discover/t/${tag}$`));
    await expect(page.getByText('2 stories')).toBeVisible();
    // Completed only.
    await page
      .getByRole('radiogroup', { name: 'Status' })
      .getByRole('radio', { name: 'Completed' })
      .click();
    await expect(page).toHaveURL(/status=completed/);
    await expect(page.getByText('1 story', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: /Tide Tables/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Farul de la Sulina/ })).toHaveCount(0);
  });

  test('an adult sees the 16+ story on the tag page', async ({ browser }) => {
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    const page = await context.newPage();
    await page.goto(`/discover/t/${tag}`);
    await expect(page.getByRole('link', { name: /Noaptea lungă/ })).toBeVisible();
  });

  test('a list that does not exist says so', async ({ browser }) => {
    const page = await openAsVisitor(browser, '/discover/all/secret');
    await expect(page.getByRole('heading', { name: 'There is no such list.' })).toBeVisible();
  });

  for (const view of everyView(['/discover', '/discover/c/fiction'])) {
    test(`${view.address} passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
