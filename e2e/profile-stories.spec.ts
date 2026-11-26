/**
 * End-to-end tests for a writer's every story, /u/<username>/stories (bundle 3 of "Build: the full
 * design as user stories", board C05; Robert, 25 Nov 2026, 09:50 UTC: no widget missing between
 * the canvas and the live site).
 *
 * What it proves:
 * - Both lists ongoing and completed stories; Ongoing and Completed each keep only their own,
 *   and the choice stays in the address, so a reload keeps it;
 * - a signed-in reader gets Follow story on every row, a visitor none (one "Get in to follow"
 *   beside the name is enough);
 * - the page passes axe and never scrolls sideways at 390, 768 and 1440 px, by day and at night,
 *   in Romanian and English.
 * Personas: adult_writer (…01) wrote the stories; teacher (…07) reads them.
 * Test data: two of Lia's stories, one ongoing and one completed, each with a published chapter,
 * made here and removed afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const ongoingTitle = 'Felinarul din curte e2e';
const completedTitle = 'Ultimul tren spre mare e2e';

/** Removes the spec's stories and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.chapters where code in ('c05curs1', 'c05gata1');
    delete from public.stories where slug in ('c05-e2e-curs', 'c05-e2e-gata');
    update public.profiles set locale = 'ro' where id in ('${writerId}', '${teacherId}');`);
}

/**
 * One of Lia's stories with one published chapter.
 *
 * @param slug - the story's address
 * @param title - its title
 * @param status - ongoing or completed
 * @param chapterCode - its chapter's code
 */
function seedStory(slug: string, title: string, status: string, chapterCode: string) {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${writerId}', '${slug}', '${title}', 'Un rând despre poveste.', 'ro',
      (select id from public.categories where slug = 'fiction'), '${status}', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, '${chapterCode}', 1, 'Capitol', 'x', 300, 'published', 'Început', 'Text.',
      300, now()
    from public.stories where slug = '${slug}';`);
}

/** The two stories. */
function seedStories() {
  cleanUp();
  seedStory('c05-e2e-curs', ongoingTitle, 'ongoing', 'c05curs1');
  seedStory('c05-e2e-gata', completedTitle, 'completed', 'c05gata1');
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

test.describe('a writer’s every story (board C05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('Ongoing, Completed and Both keep only their own stories', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/u/adult_writer/stories');
    const stories = page.getByRole('region', { name: 'Stories by Lia Scrie' });
    const status = stories.getByRole('group', { name: 'Which stories' });
    // Step 1: Both, the board's default, lists the two.
    await expect(status.getByRole('radio', { name: 'Both' })).toBeChecked();
    await expect(stories.getByRole('link', { name: ongoingTitle })).toBeVisible();
    await expect(stories.getByRole('link', { name: completedTitle })).toBeVisible();
    // Step 2: Ongoing keeps the ongoing story, and says so in the address.
    await status.getByText('Ongoing', { exact: true }).click();
    await expect(page).toHaveURL(/\?status=ongoing$/);
    await expect(stories.getByRole('link', { name: ongoingTitle })).toBeVisible();
    await expect(stories.getByRole('link', { name: completedTitle })).toHaveCount(0);
    // Step 3: Completed keeps the completed one, and a reload keeps the choice.
    await status.getByText('Completed', { exact: true }).click();
    await page.reload();
    await expect(status.getByRole('radio', { name: 'Completed' })).toBeChecked();
    await expect(stories.getByRole('link', { name: completedTitle })).toBeVisible();
    await expect(stories.getByRole('link', { name: ongoingTitle })).toHaveCount(0);
    // Step 4: a signed-in reader can follow the story from its row.
    await expect(
      stories.getByRole('button', { name: new RegExp(`^Follow(ing)? story ${completedTitle}$`) }),
    ).toBeVisible();
    await page.context().close();
  });

  test('a visitor gets the rows without Follow story', async ({ browser }) => {
    const page = await openAs(browser, null, '/u/adult_writer/stories');
    const stories = page.getByRole('region', { name: 'Stories by Lia Scrie' });
    await expect(stories.getByRole('link', { name: ongoingTitle })).toBeVisible();
    await expect(stories.getByRole('button', { name: /^Follow story / })).toHaveCount(0);
    await page.context().close();
  });

  test('the page passes axe in all 12 views and never scrolls sideways', async ({ browser }) => {
    // Twelve full axe scans in one test: about 2.5 s each on the build machine.
    test.setTimeout(90_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    for (const view of everyView(['/u/adult_writer/stories'])) {
      // The account's language wins over the browser's, so set it to the view's (S1-E1-04).
      runSql(`update public.profiles set locale = '${view.language}' where id = '${teacherId}';`);
      const page = await context.newPage();
      await test.step(`axe at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await expect(page.getByRole('link', { name: ongoingTitle })).toBeVisible();
      });
      await page.close();
    }
    await context.close();
  });
});
