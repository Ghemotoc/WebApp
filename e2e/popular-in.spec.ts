/**
 * "Popular in" a country, in a real browser (bundle MARKETS-2, part d; Robert, 8 Nov 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a visitor from Sweden finds Discover's Popular shelf starting on Sweden, in Sweden's order, and
 *   "Everywhere" brings back the overall order;
 * - the Popular See all page keeps the country in its address, and a country with too few ranked
 *   stories says it shows the overall ranking;
 * - a member's drop-down starts on the country on their profile;
 * - the Popular See all page passes axe and doesn't scroll sideways at 390, 768 and 1440 px,
 *   light and night, Romanian and English.
 * How the country is faked: the local server reads an X-Fake-Country header (never on Cloudflare).
 * Test data: three English stories of its own by adult_writer, one chapter each, with today's
 * reads by country written straight into the totals, then both ranking jobs run. The "fewer than
 * 5 ranked stories" rule is lowered to 2 for the spec and put back afterwards.
 */
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';

/** This spec's stories: slug, title, reads from Sweden, reads from the UK. */
const stories = [
  ['pop-e2e-kite', 'Northern Kite', 10, 0],
  ['pop-e2e-song', 'Harbour Song', 6, 0],
  ['pop-e2e-weather', 'Long Weather', 0, 30],
] as const;

/** Removes this spec's stories and their scores, and puts the settings back. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'pope2e%';
    delete from public.stories where slug like 'pop-e2e-%';
    update public.settings set value = '5'::jsonb where key = 'popular_in_minimum_stories';
    select public.compute_story_scores();
    select public.compute_story_country_scores();`);
}

/** The three stories, read from Sweden and the UK, and both rankings worked out. */
function seedStories() {
  cleanUp();
  const rows = stories.map(
    ([slug, title]) =>
      `('${adultWriterId}', '${slug}', '${title}', 'x', 'en',
        (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now())`,
  );
  const reads = stories.map(([slug, , sweden, britain]) => `('${slug}', ${sweden}, ${britain})`);
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ${rows.join(',')};
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'pope2e' || substr(md5(slug), 1, 2), 1, 'One', 'x', 1, 'published', 'One',
      'Text.', 1, now() from public.stories where slug like 'pop-e2e-%';
    with reads(slug, sweden, britain) as (values ${reads.join(',')}),
    spec_chapters as (
      select chapters.id, reads.sweden, reads.britain from reads
      join public.stories on stories.slug = reads.slug
      join public.chapters on chapters.story_id = stories.id),
    by_country as (
      insert into public.chapter_reads_by_country (chapter_id, read_on, country_code, total)
      select id, (now() at time zone 'Europe/Bucharest')::date, country, total
      from spec_chapters,
        lateral (values ('SE', spec_chapters.sweden), ('GB', spec_chapters.britain)) as each(country, total)
      where total > 0
      returning 1)
    insert into public.chapter_reads (chapter_id, read_on, total)
    select id, (now() at time zone 'Europe/Bucharest')::date, sweden + britain from spec_chapters;
    update public.settings set value = '2'::jsonb where key = 'popular_in_minimum_stories';
    select public.compute_story_scores();
    select public.compute_story_country_scores();`);
}

/**
 * This spec's titles in the order a page shows them.
 *
 * @param page - Discover or the Popular See all page
 * @returns the titles, first to last
 */
async function specTitlesInOrder(page: Page | Locator): Promise<string[]> {
  const links = page.getByRole('link', { name: /Northern Kite|Harbour Song|Long Weather/ });
  await expect(links.first()).toBeVisible();
  const names = await links.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('aria-label') ?? element.textContent ?? ''),
  );
  const order: string[] = [];
  for (const name of names) {
    const title = stories.map(([, each]) => each).find((each) => name.includes(each));
    if (title !== undefined && !order.includes(title)) order.push(title);
  }
  return order;
}

/** A visitor's page in English, from a country. */
async function openAsVisitorFrom(browser: Browser, country: string, address: string) {
  const context = await browser.newContext({ extraHTTPHeaders: { 'X-Fake-Country': country } });
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('"Popular in" a country (MARKETS-2d)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('a visitor from Sweden sees Sweden’s order, and Everywhere brings back the overall one', async ({
    browser,
  }) => {
    const page = await openAsVisitorFrom(browser, 'SE', '/discover');
    const shelf = page.getByRole('region', { name: 'Popular', exact: true });
    const popularIn = shelf.getByRole('combobox', { name: 'Popular in' });
    await expect(popularIn).toHaveValue('SE');
    await expect(popularIn.locator('option:checked')).toHaveText('Sweden');
    expect(await specTitlesInOrder(shelf)).toEqual([
      'Northern Kite',
      'Harbour Song',
      'Long Weather',
    ]);
    await popularIn.selectOption({ label: 'Everywhere' });
    // The shelf keeps its cards while the new order loads, so wait for the order itself.
    await expect
      .poll(() => specTitlesInOrder(shelf))
      .toEqual(['Long Weather', 'Northern Kite', 'Harbour Song']);
    await page.context().close();
  });

  test('the See all page keeps the country, and a country with too few stories says so', async ({
    browser,
  }) => {
    const page = await openAsVisitorFrom(browser, 'SE', '/discover/all/popular');
    const filters = page.getByRole('group', { name: 'Filters' });
    await expect(filters.getByRole('combobox', { name: 'Popular in' })).toHaveValue('SE');
    expect(await specTitlesInOrder(page)).toEqual([
      'Northern Kite',
      'Harbour Song',
      'Long Weather',
    ]);
    // Only one story is ranked in the UK, fewer than the two this spec asks for.
    await filters
      .getByRole('combobox', { name: 'Popular in' })
      .selectOption({ label: 'United Kingdom' });
    await expect(page).toHaveURL(/country=GB/);
    await expect(
      page.getByText(
        'United Kingdom: too few stories are ranked there yet, so this is the overall ranking.',
      ),
    ).toBeVisible();
    await page.context().close();
  });

  test('a member’s drop-down starts on the country on their profile', async ({ browser }) => {
    // adult_writer lives in Romania (the seed), whatever the connection says.
    const context = await browser.newContext({ extraHTTPHeaders: { 'X-Fake-Country': 'SE' } });
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    await page.goto('/discover/all/popular');
    await expect(
      page
        .getByRole('group', { name: /Filters|Filtre/ })
        .getByRole('combobox', { name: /Popular in|Populare în/ }),
    ).toHaveValue('RO');
    await context.close();
  });

  for (const view of everyView(['/discover/all/popular?country=SE'])) {
    test(`axe, Popular See all: ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
