/**
 * Notifications that open a paragraph's thread, and the "Most shared this week" shelf, in a real
 * browser (bundle IDEAS-1, part e; ideas IDEA-20261031-2 and -9).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the writer opens a notification about a comment on paragraph 2: the chapter opens with that
 *   paragraph's thread open, its marker in view and focused (idea 2, first criterion);
 * - a notification about a paragraph the writer has since changed opens "Comments on an earlier
 *   version" (idea 2, second criterion);
 * - Discover has "Most shared this week", ordered by this week's shares, and its See all page
 *   offers that order; a 14-year-old never sees the 16+ story on it (idea 9);
 * - the shelf's See all page passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: two stories by adult_writer (one 16+), a chapter with teacher's comments and the
 *   writer's notifications about them, and this week's share totals. All removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
/** The personas this spec signs in as, by their seeded IDs (handles differ from persona names). */
const personaIds = {
  adult_writer: adultWriterId,
  teacher: teacherId,
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
} as const;
const chapterPath = '/s/plinks-e2e-lumina/plnke001';

/** This spec's stories: slug, title and rating. */
const stories = [
  ['plinks-e2e-lumina', 'Lumina din turn', 'all_ages'],
  ['plinks-e2e-umbra', 'Umbra de la miezul nopții', '16_plus'],
] as const;

/** Removes this spec's stories, chapters, comments, shares and notifications. */
function cleanUp() {
  runSql(`delete from public.notifications where chapter_id in
      (select id from public.chapters where code like 'plnke%');
    delete from public.comments where chapter_id in (select id from public.chapters where code like 'plnke%');
    delete from public.chapters where code like 'plnke%';
    delete from public.stories where slug like 'plinks-e2e-%';
    update public.profiles set locale = 'ro' where id in (${Object.values(personaIds)
      .map((id) => `'${id}'`)
      .join(', ')});`);
}

/** The stories, a chapter of three paragraphs, teacher's comments and the shares. */
function seedData() {
  cleanUp();
  const rows = stories.map(
    ([slug, title, rating]) =>
      `('${adultWriterId}', '${slug}', '${title}', 'x', 'ro',
        (select id from public.categories where slug = 'fiction'), 'ongoing', '${rating}', now(), now())`,
  );
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ${rows.join(',')};
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, case slug when 'plinks-e2e-lumina' then 'plnke001' else 'plnke002' end, 1,
      'Unu', 'x', 6, 'published', 'Unu',
      'The tower was dark.' || chr(10) || chr(10) || 'Then a light came on.' || chr(10) || chr(10) || 'Nobody lived there.',
      6, now() from public.stories where slug like 'plinks-e2e-%';
    insert into public.comments (user_id, chapter_id, body, paragraph_key, paragraph_number)
    select '${teacherId}', id, comment.body, public.paragraph_key_of(comment.paragraph), comment.number
    from public.chapters, (values ('The light gave me chills.', 'Then a light came on.', 2),
      ('I miss the old opening.', 'It was a stormy night.', 1)) as comment (body, paragraph, number)
    where code = 'plnke001';
    insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id, comment_id)
    select '${adultWriterId}', 'comment_on_chapter', array['${teacherId}'::uuid], 1, chapters.story_id,
      chapters.id, comments.id
    from public.comments join public.chapters on chapters.id = comments.chapter_id
    where chapters.code = 'plnke001';
    insert into public.chapter_shares (chapter_id, shared_on, total)
    select id, (now() at time zone 'Europe/Bucharest')::date, 500 from public.chapters where code like 'plnke%';`);
}

/** A page signed in as a persona, in English (the profile's language wins), with motion reduced. */
async function openAs(
  browser: Browser,
  persona: keyof typeof personaIds,
  address: string,
): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona]}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/**
 * Opens the writer's notification whose quote is the given comment.
 *
 * @param page - the writer's page on /notifications
 * @param quote - the comment's words
 */
async function openNotification(page: Page, quote: string) {
  await page
    .getByRole('listitem')
    .filter({ hasText: `“${quote}”` })
    .getByRole('link')
    .click();
}

test.describe('paragraph links and "Most shared this week" (IDEAS-1 part e)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedData);
  test.afterAll(cleanUp);

  test("a notification about paragraph 2 opens that paragraph's thread", async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/notifications');
    await openNotification(page, 'The light gave me chills.');
    await expect(page).toHaveURL(new RegExp(`${chapterPath}#paragraph-2$`));
    const thread = page.getByRole('region', { name: 'Comments on paragraph 2' });
    await expect(thread.getByText('The light gave me chills.')).toBeVisible();
    await expect(thread).toBeInViewport();
    // The marker that opened it has focus, so Close or Escape hands focus back to it.
    await expect(page.locator('[aria-controls="paragraph-thread-2"]')).toBeFocused();
    await page.context().close();
  });

  test('a notification about a since-changed paragraph opens the earlier version', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/notifications');
    await openNotification(page, 'I miss the old opening.');
    await expect(page).toHaveURL(new RegExp(`${chapterPath}#paragraph-earlier$`));
    const thread = page.getByRole('region', { name: 'Comments on an earlier version' });
    await expect(thread.getByText('I miss the old opening.')).toBeVisible();
    await expect(thread).toBeInViewport();
    await page.context().close();
  });

  test('Discover has "Most shared this week", without the 16+ story for a 14-year-old', async ({
    browser,
  }) => {
    // An adult sees both stories, shared 500 times today: more than anything else in the seed.
    const adult = await openAs(browser, 'teacher', '/discover');
    const shelf = adult.getByRole('region', { name: 'Most shared this week', exact: true });
    await expect(shelf.getByRole('link', { name: /Lumina din turn/ })).toBeVisible();
    await expect(shelf.getByRole('link', { name: /Umbra de la miezul nopții/ })).toBeVisible();
    await adult.context().close();
    // A 14-year-old gets the All ages one only (rule 18).
    const kid = await openAs(browser, 'kid_14_ok', '/discover');
    const kidShelf = kid.getByRole('region', { name: 'Most shared this week', exact: true });
    await expect(kidShelf.getByRole('link', { name: /Lumina din turn/ })).toBeVisible();
    await expect(kid.getByRole('link', { name: /Umbra de la miezul nopții/ })).toHaveCount(0);
    await kid.context().close();
  });

  test('its See all page is in "Most shared this week" order', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/discover/all/shared');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Most shared this week' }),
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Sort/ })).toHaveValue('shared');
    await expect(page.getByRole('link', { name: /Lumina din turn/ })).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView(['/discover/all/shared'])) {
    test(`See all passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await checkScreen(page, view);
      await context.close();
    });
  }
});
