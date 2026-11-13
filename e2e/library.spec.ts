/**
 * The reader's library and their place in every chapter, in a real browser (story S1-E4-03;
 * board 3.7 Library).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a reader scrolls a chapter and leaves; on another device (a fresh browser) the chapter offers
 *   to go back there, and the Library's "Continue reading" shows the story with "Continue" and
 *   the story page says "Continue chapter 1" (first criterion);
 * - the story page's Library drop-down saves a story for later; the Library's shelves show
 *   Reading, Saved for later and Finished with their sizes, and the shelf's See all page lists it
 *   (second and fifth criteria);
 * - a visitor gets a log-in card, never anyone's library (third criterion);
 * - the Library passes axe at 390 px, light, ro and en, and it draws no doodle
 *   at 1440, 768 and 390 px (DoD design rules);
 * - with a writer and a story followed, the Following cards stay inside a 390 px screen (the
 *   accessibility check of 6 Nov 2026 found them 19 px too wide; WCAG 1.4.10, CLAUDE.md rule 21).
 * Test data: adult_writer's story "Raftul bibliotecii" with two chapters (the first long enough to
 *   scroll); teen_17 reads it. All removed afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const readerId = '00000000-0000-4000-8000-000000000002';
const storySlug = 'library-e2e';

/** Removes the spec's story, its chapters and the reader's library rows. */
function cleanUp() {
  runSql(`delete from public.reading_positions where user_id = '${readerId}';
    delete from public.library_entries where user_id = '${readerId}';
    delete from public.follows_users where user_id = '${readerId}';
    delete from public.follows_stories where user_id = '${readerId}';
    delete from public.chapters where code like 'libre2e%';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle = 'teen_17';`);
}

/** The story: two published chapters, the first with 80 paragraphs so it scrolls on any screen. */
function seedStory() {
  cleanUp();
  const longText = Array.from(
    { length: 80 },
    (_, index) =>
      `Paragraful ${index + 1} al capitolului, cu destule cuvinte cât să umple un rând.`,
  ).join('\n\n');
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}', 'Raftul bibliotecii', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select stories.id, stories.user_id, 'libre2e' || place, place, 'Capitol', 'x', 1000, 'published',
      'Capitolul ' || place, $text$${longText}$text$, 1000, now()
    from public.stories cross join generate_series(1, 2) as place
    where stories.slug = '${storySlug}';`);
}

/** Opens a page in a fresh browser context (a new device), as a persona or a visitor. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  path: string,
  language: 'en' | 'ro' = 'en',
) {
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
  await page.goto(path);
  return page;
}

test.describe('library and continue reading (S1-E4-03)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('the place is kept when the reader leaves and offered on another device', async ({
    browser,
  }) => {
    // Step 1: read part of chapter 1, then leave (the save runs when the page goes away).
    const page = await openAs(browser, 'teen_17', `/s/${storySlug}/libre2e1`);
    await expect(page.getByRole('heading', { level: 1, name: 'Capitolul 1' })).toBeVisible();
    await page.mouse.wheel(0, 2500);
    await expect
      .poll(
        () =>
          runSql(
            `select count(*) from public.reading_positions where user_id = '${readerId}';`,
          ).trim(),
        {
          timeout: 10000,
        },
      )
      .toBe('1');
    await page.context().close();
    // Step 2: another device finds the place in the chapter.
    const again = await openAs(browser, 'teen_17', `/s/${storySlug}/libre2e1`);
    await expect(again.getByText(/You stopped \d+% of the way through this chapter/)).toBeVisible();
    await again.getByRole('button', { name: 'Go back there' }).click();
    await expect(again.getByRole('button', { name: 'Go back there' })).toBeHidden();
    // Step 3: the Library and the story page offer it too.
    await again.goto('/library');
    const card = again.getByRole('article', { name: 'Raftul bibliotecii' });
    await expect(card).toContainText('Chapter 1 of 2');
    await expect(card.getByRole('link', { name: 'Continue Raftul bibliotecii' })).toHaveAttribute(
      'href',
      `/s/${storySlug}/libre2e1`,
    );
    await again.goto(`/s/${storySlug}`);
    await expect(again.getByRole('link', { name: 'Continue chapter 1' })).toBeVisible();
    await expect(again.getByLabel('Library')).toHaveValue('reading');
  });

  test('the Library drop-down saves a story for later, and the shelves list it', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teen_17', `/s/${storySlug}`);
    await page.getByLabel('Library').selectOption('saved');
    await expect
      .poll(() =>
        runSql(`select shelf from public.library_entries where user_id = '${readerId}';`).trim(),
      )
      .toBe('saved');
    await page.goto('/library');
    const shelves = page.getByRole('radiogroup', { name: 'Shelf' });
    await expect(shelves.getByRole('radio', { name: 'Reading (0)' })).toBeChecked();
    await shelves.getByRole('radio', { name: 'Saved for later (1)' }).click();
    await expect(page.getByRole('link', { name: /Raftul bibliotecii/ }).first()).toBeVisible();
    await page.goto('/library/saved');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Saved for later');
    await expect(page.getByRole('link', { name: /Raftul bibliotecii/ }).first()).toBeVisible();
  });

  test('a visitor gets a log-in card, never a library', async ({ browser }) => {
    const page = await openAs(browser, null, '/library');
    await expect(page.getByRole('heading', { name: 'Keep a library' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get in' }).last()).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await page.goto('/library/saved');
    await expect(page.getByRole('link', { name: /Raftul bibliotecii/ })).toHaveCount(0);
  });

  test('the Library draws no doodle at any width', async ({ browser }) => {
    const page = await openAs(browser, 'teen_17', '/library');
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoDoodles(page);
    }
  });

  test('the Following cards fit a 390 px screen with a writer and a story followed', async ({
    browser,
  }) => {
    // Step 1: the reader follows the story's writer and the story, so both cards have a row.
    runSql(`insert into public.follows_users (user_id, followed_user_id)
        values ('${readerId}', '00000000-0000-4000-8000-000000000001');
      insert into public.follows_stories (user_id, story_id)
        select '${readerId}', id from public.stories where slug = '${storySlug}';`);
    // Step 2: the Library on a phone, with nothing scrolling sideways.
    const page = await openAs(browser, 'teen_17', '/library');
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.getByRole('heading', { level: 3, name: 'Stories (1)' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Writers (1)' })).toBeVisible();
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(390);
    await page.context().close();
  });

  for (const language of ['ro', 'en'] as const) {
    test(`axe: the Library at 390 px, light, ${language}`, async ({ browser }) => {
      const page = await openAs(browser, 'teen_17', '/library', language);
      await checkScreen(page, { address: '/library', width: 390, theme: 'light', language });
    });
  }
});
