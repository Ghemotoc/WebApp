/**
 * Epic check for S1-E5, discovery and profiles (story S1-E5-QA, part one: the journey from the
 * public home page waits for S1-E5-08 in CMS-1).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's main journeys in a real browser.
 * - Journey 1, a visitor browses (S1-E5-01 × S1-E5-02 × S1-E5-03 × S1-E5-09 × S1-E5-05): Discover
 *   → a category page, in popular order → sorted by title → a story → "See profile" → the
 *   writer's See all page (by its address: "View more" shows only past 20 stories).
 * - Journey 2, popularity from reading (S1-E6-03 × S1-E5-03): teacher likes the quieter story's
 *   chapter in the reader, and after the scoring run it leads the tag page.
 * - Journey 3, ratings (S1-E3-06 × S1-E5-03): the spec's 16+ story is on teen_17's Popular list,
 *   never on kid_14_ok's or kid_14_waiting's.
 * - Journey 4, blocks (S1-E5-05 × S1-E5-03): blocker, who blocks `blocked` in the seed, never
 *   gets blocked's story on Popular; teacher does.
 * - Journey 5, axe on the See all and profile pages at 390, 768 and 1440 px, at night, in
 *   Romanian (the stories' own specs cover the other views).
 * The database half is supabase/tests/database/098-epic-s1-e5.test.sql.
 * Test data: seed personas; three stories of the spec's own tagged "e2e-epic5", removed after
 * with their likes, and the personas' language put back.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const blockedId = '00000000-0000-4000-8000-000000000016';
const tag = 'e2e-epic5';

/** The spec's stories: slug, title, writer, rating and how many days ago they came out. */
const stories = [
  ['epic5-e2e-quiet', 'Quiet orchard', adultWriterId, 'all_ages', 1],
  ['epic5-e2e-loud', 'Loud fairground', adultWriterId, '16_plus', 3],
  ['epic5-e2e-hidden', 'Hidden garden', blockedId, 'all_ages', 2],
] as const;

/** Removes the spec's stories, their chapters, likes and the tag. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'ep5e2e%';
    delete from public.stories where slug like 'epic5-e2e-%';
    delete from public.tags where normalised_name = '${tag}';
    update public.profiles set locale = 'ro'
    where handle in ('teacher', 'teen_17', 'kid_14_ok', 'kid_14_waiting', 'blocker');`);
}

/** The three stories, each with one published chapter, the tag and fresh scores. */
function seedStories() {
  cleanUp();
  const rows = stories.map(
    ([slug, title, writerId, rating, days]) =>
      `('${writerId}', '${slug}', '${title}', 'x', 'en',
        (select id from public.categories where slug = 'fiction'), 'ongoing', '${rating}',
        now() - interval '${days} days', now() - interval '${days} days')`,
  );
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ${rows.join(',')};
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'ep5e2e' || substr(md5(slug), 1, 2), 1, 'One', 'x', 1, 'published', 'One',
      'Text.', 1, first_published_at from public.stories where slug like 'epic5-e2e-%';
    insert into public.tags (name, normalised_name) values ('${tag}', '${tag}');
    insert into public.story_tags (story_id, tag_id, user_id)
    select stories.id, tags.id, stories.user_id from public.stories, public.tags
    where stories.slug like 'epic5-e2e-%' and tags.normalised_name = '${tag}';
    select public.compute_story_scores();`);
}

/** Opens a page as a persona (or a visitor), in a language. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** A story card's link on the current page. */
function card(page: Page, title: string) {
  return page.getByRole('link', { name: new RegExp(title) });
}

test.describe('epic check S1-E5 (S1-E5-QA)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('journey 1: a visitor browses from Discover to a writer’s stories', async ({ browser }) => {
    const page = await openAs(browser, null, '/discover');
    await page
      .getByRole('navigation', { name: 'Browse by category' })
      .getByRole('link', { name: /Fiction/ })
      .click();
    await expect(page).toHaveURL(/\/discover\/c\/fiction$/);
    await expect(page.getByLabel('Sort by')).toHaveValue('popular');
    await page.getByLabel('Sort by').selectOption({ label: 'Title, A to Z' });
    await expect(page).toHaveURL(/sort=title_az/);
    await card(page, 'Quiet orchard').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Quiet orchard' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Story numbers' })).toContainText('1 chapter');
    await page.getByRole('link', { name: 'See profile' }).click();
    await expect(page).toHaveURL(/\/u\/adult_writer$/);
    await expect(card(page, 'Quiet orchard')).toBeVisible();
    await expect(card(page, 'Loud fairground')).toHaveCount(0);
    // The profile's "View more" appears only past 20 stories (rule 20), so the address it would
    // open is visited directly.
    await page.goto('/u/adult_writer/stories');
    await expect(card(page, 'Quiet orchard')).toBeVisible();
    // A visitor never gets the 16+ story, on any list (CLAUDE.md rule 18).
    await expect(card(page, 'Loud fairground')).toHaveCount(0);
  });

  test('journey 2: a like in the reader lifts a story on the next scoring run', async ({
    browser,
  }) => {
    // Hidden garden (by blocked) and Quiet orchard start level; the newer one leads.
    const before = await openAs(browser, 'teacher', `/discover/t/${tag}`);
    await expect(card(before, 'Quiet orchard|Hidden garden').first()).toHaveAccessibleName(
      /Quiet orchard/,
    );
    const reader = await openAs(browser, 'teacher', '/s/epic5-e2e-hidden');
    await reader.getByRole('link', { name: /One/ }).first().click();
    await reader.getByRole('button', { name: /^Like/ }).first().click();
    await expect(reader.getByRole('button', { name: /^Like/ }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    runSql('select public.compute_story_scores();');
    const after = await openAs(browser, 'teacher', `/discover/t/${tag}`);
    await expect(card(after, 'Quiet orchard|Hidden garden').first()).toHaveAccessibleName(
      /Hidden garden/,
    );
  });

  test('journey 3: the 16+ story is on teen_17’s Popular list, never a child’s', async ({
    browser,
  }) => {
    const teen = await openAs(browser, 'teen_17', '/discover/all/popular');
    await expect(card(teen, 'Loud fairground')).toBeVisible();
    for (const child of ['kid_14_ok', 'kid_14_waiting'] as const) {
      const page = await openAs(browser, child, '/discover/all/popular');
      await expect(card(page, 'Quiet orchard')).toBeVisible();
      await expect(card(page, 'Loud fairground')).toHaveCount(0);
    }
  });

  test('journey 4: blocker never gets blocked’s story on Popular; teacher does', async ({
    browser,
  }) => {
    const blocker = await openAs(browser, 'blocker', '/discover/all/popular');
    await expect(card(blocker, 'Quiet orchard')).toBeVisible();
    await expect(card(blocker, 'Hidden garden')).toHaveCount(0);
    const teacher = await openAs(browser, 'teacher', '/discover/all/popular');
    await expect(card(teacher, 'Hidden garden')).toBeVisible();
  });

  for (const address of ['/discover/all/popular', '/u/adult_writer']) {
    for (const width of screenWidths) {
      test(`journey 5: ${address} passes axe at ${width} px, night, Romanian`, async ({ page }) => {
        await checkScreen(page, { address, width, theme: 'night', language: 'ro' });
      });
    }
  }
});
