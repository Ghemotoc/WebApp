/**
 * End-to-end tests for the profile's activity and public bookshelves (bundle 3 of "Build: the full
 * design as user stories", boards C04 and C06; Robert, 25 Nov 2026, 09:50 UTC: no widget missing
 * between the canvas and the live site).
 *
 * What it proves:
 * - the profile shows the Following number, "Recent posts in Together" linking to the post, and
 *   "Also on" with the public bookshelves, the posts and the spaces;
 * - "1 public bookshelf" opens /u/<username>/bookshelves, which lists the public bookshelf with
 *   its books and never the private one;
 * - the story rows carry "Follow story" and "See every story";
 * - Share gives the profile's own link, never the user ID;
 * - someone the owner blocks sees neither the profile nor its bookshelves;
 * - the bookshelves page passes axe and never scrolls sideways at 390, 768 and 1440 px, by day
 *   and at night, in Romanian and English.
 * Personas: teacher (…07) keeps the bookshelves and writes the post; adult_writer (…01) visits;
 * blocker (…15) blocks blocked (…16) in the seed.
 * Test data: a story of Lia's with one chapter, two bookshelves and a forum thread, made here and
 * removed afterwards.
 */
import { type Browser } from '@playwright/test';
import { expect, test } from './support/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const teacherId = '00000000-0000-4000-8000-000000000007';
const visitorId = '00000000-0000-4000-8000-000000000001';
const publicShelf = 'Raft public e2e';
const privateShelf = 'Raft privat e2e';
const threadTitle = 'Cum încep fără prolog e2e';
// The bookshelves hold a story of the spec's own: a seed story has no published chapter, and a
// bookshelf lists only stories that can be read.
const storySlug = 'raft-e2e-poveste';
const storyTitle = 'Ceainăria de pe raft';

/**
 * Runs SQL as one persona, signed in.
 *
 * @param userId - whose session
 * @param statements - what to run
 * @returns the last line psql prints
 */
function runAs(userId: string, statements: string): string {
  const output = runSql(`select set_config('role', 'authenticated', false),
      set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', false);
    ${statements}`);
  return output.trim().split('\n').at(-1) ?? '';
}

/** Removes the spec's bookshelves, story and thread, and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.reading_lists
      where user_id = '${teacherId}' and name in ('${publicShelf}', '${privateShelf}');
    delete from public.chapters where code = 'raftcap1';
    delete from public.stories where slug = '${storySlug}';
    delete from public.forum_threads where title = '${threadTitle}';
    update public.profiles set locale = 'ro' where id in ('${teacherId}', '${visitorId}');`);
}

/**
 * Lia's story with one published chapter, the teacher's public bookshelf holding it, a private one
 * holding it too, and the teacher's thread in First chapters.
 */
function seedActivity() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${visitorId}', '${storySlug}', '${storyTitle}', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'raftcap1', 1, 'Capitol', 'x', 300, 'published', 'Primul ceai', 'Text.', 300, now()
    from public.stories where slug = '${storySlug}';`);
  runSql(`insert into public.reading_lists (user_id, name, is_public) values
      ('${teacherId}', '${publicShelf}', true), ('${teacherId}', '${privateShelf}', false);
    insert into public.reading_list_stories (list_id, user_id, story_id)
    select reading_lists.id, '${teacherId}', stories.id
    from public.reading_lists, public.stories
    where reading_lists.user_id = '${teacherId}' and reading_lists.name in ('${publicShelf}', '${privateShelf}')
      and stories.slug = '${storySlug}';`);
  runAs(
    teacherId,
    `select public.start_forum_thread('first-chapters', '${threadTitle}', 'Un text scurt.');`,
  );
}

/**
 * Opens a page in English as a persona (or signed out).
 *
 * @param persona - who is signed in, or null for a visitor
 * @param path - the address
 * @returns the page
 */
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

test.describe('the profile’s activity and public bookshelves (boards C04 to C06)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedActivity);
  test.afterAll(cleanUp);

  test('the profile shows Following, the latest post and "Also on"', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/u/teacher');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Following: the number of live accounts the teacher follows, as the database counts them.
    const following = runSql(`select count(*) from public.follows_users
      where user_id = '${teacherId}';`).trim();
    const followingStat = page
      .locator('dl > div')
      .filter({ has: page.locator('dt', { hasText: /^Following$/ }) });
    await expect(followingStat.locator('dd')).toHaveText(following);
    // Recent posts in Together: the thread's title, linking to the post in its thread.
    const posts = page.getByRole('region', { name: 'Recent posts in Together' });
    await expect(posts.getByRole('link', { name: threadTitle })).toHaveAttribute(
      'href',
      /^\/forums\/first-chapters\/\d+\?post=1$/,
    );
    // Also on: one public bookshelf (never the private one) and the post.
    const alsoOn = page.getByRole('region', { name: /^Also on / });
    await expect(alsoOn.getByRole('link', { name: '1 public bookshelf' })).toBeVisible();
    await expect(alsoOn).toContainText(/\d+ posts?/);
    expect(await page.locator('main').innerText()).not.toContain(teacherId);
    await page.context().close();
  });

  test('"1 public bookshelf" opens the public bookshelves, never the private one', async ({
    browser,
  }) => {
    const page = await openAs(browser, null, '/u/teacher');
    await page.getByRole('link', { name: '1 public bookshelf' }).click();
    await expect(page).toHaveURL(/\/u\/teacher\/bookshelves$/);
    // Exact: the row of covers inside is a region of its own ("<name>, scrolls sideways").
    const shelf = page.getByRole('region', { name: publicShelf, exact: true });
    await expect(shelf.getByRole('heading', { name: publicShelf })).toBeVisible();
    await expect(shelf).toContainText('1 of 10 books');
    await expect(shelf.getByRole('link', { name: new RegExp(storyTitle) })).toBeVisible();
    await expect(page.getByText(privateShelf)).toHaveCount(0);
    await shelf.getByRole('link', { name: `Open the bookshelf ${publicShelf}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: publicShelf })).toBeVisible();
    await page.context().close();
  });

  test('the story rows carry Follow story and "See every story"', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/u/adult_writer');
    const stories = page.getByRole('region', { name: 'Stories by Lia Scrie' });
    // The spec's own story is Lia's latest, so it is among the five rows whatever else she wrote.
    await expect(stories.getByRole('link', { name: storyTitle })).toBeVisible();
    await expect(
      stories.getByRole('button', { name: new RegExp(`^Follow(ing)? story ${storyTitle}$`) }),
    ).toBeVisible();
    await stories.getByRole('link', { name: 'See every story' }).click();
    await expect(page).toHaveURL(/\/u\/adult_writer\/stories$/);
    await page.context().close();
  });

  test('Share gives the profile’s own link', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/u/teacher');
    await page.getByRole('button', { name: /^Share .*profile$/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Share this profile' });
    await expect(dialog.getByRole('textbox')).toHaveValue(/\/u\/teacher$/);
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();
    await page.context().close();
  });

  test('someone the owner blocks sees neither the profile nor its bookshelves', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'blocked', '/u/blocker/bookshelves');
    await expect(page.getByRole('heading', { name: 'This profile isn’t available' })).toBeVisible();
    await page.context().close();
  });

  test('the bookshelves page passes axe in all 12 views and never scrolls sideways', async ({
    browser,
  }) => {
    // Twelve full axe scans in one test: about 2.5 s each on the build machine.
    test.setTimeout(90_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    for (const view of everyView(['/u/teacher/bookshelves'])) {
      // The account's language wins over the browser's, so set it to the view's (S1-E1-04).
      runSql(`update public.profiles set locale = '${view.language}' where id = '${visitorId}';`);
      const page = await context.newPage();
      await test.step(`axe at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await expect(page.getByRole('heading', { name: publicShelf, exact: true })).toBeVisible();
      });
      await page.close();
    }
    await context.close();
  });
});
