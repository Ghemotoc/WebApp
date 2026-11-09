/**
 * The chapter reader in a real browser (story S1-E4-01a; board 3.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - from the story page a reader opens a chapter: "Chapter 1 of 2", the title as the H1, "by
 *   <pen name> · <date> · n min read", the text as real HTML paragraphs in the story's language;
 *   Next chapter, Previous and Contents move between chapters and back to the story; a draft
 *   between them is skipped; the last chapter ends with "That's the latest chapter so far.";
 * - one read is counted per chapter per tab (a reload doesn't add one), never the writer's own;
 * - a signed-out visitor gets the teaser page instead of the reader (S1-E4-04; the teaser itself
 *   is tested in teaser.spec.ts);
 * - kid_14_ok gets "This chapter isn't available" for a 16+ story; so does a draft's address;
 * - no doodles on the reader; axe in all 12 views (390, 768 and 1440 px, light and night,
 *   Romanian and English) finds nothing serious; nothing scrolls sideways, down to 320 px.
 * Test data: chapters made in SQL on adult_writer's seed story "Stația meteo"; removed after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';

/** The personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
  teacher: '00000000-0000-4000-8000-000000000007',
};

/** Removes this spec's chapters and read totals, and puts the story and languages back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  runSql(`update public.stories set rating = 'all_ages' where id = '${storyId}';`);
  const ids = Object.values(personaIds).map((id) => `'${id}'`);
  runSql(`update public.profiles set locale = 'ro' where id in (${ids.join(', ')});`);
}

/** Two published chapters with a draft between them. */
function seedChapters() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values
      ('${storyId}', '${personaIds.adult_writer}', 'readera1', 1, 'Caietele bunicii', 'x', 450,
        'published', 'Caietele bunicii',
        'Bunica mea **notează** vremea în fiecare dimineață.' || chr(10) || chr(10) || 'Apoi ascultă radioul.',
        450, '2026-10-09T09:00:00Z'),
      ('${storyId}', '${personaIds.adult_writer}', 'readerb2', 2, 'Ciornă', 'x', 1,
        'draft', null, null, null, null),
      ('${storyId}', '${personaIds.adult_writer}', 'readerc3', 3, 'Vântul de miercuri', 'x', 3,
        'published', 'Vântul de miercuri', 'Vântul se întoarce.', 3, '2026-10-10T09:00:00Z');`);
}

/** Today's read total for a chapter (Romania date). */
function readsToday(code: string): string {
  return runSql(`select coalesce((select total from public.chapter_reads
      join public.chapters on chapters.id = chapter_reads.chapter_id
      where chapters.code = '${code}' and read_on = (now() at time zone 'Europe/Bucharest')::date), 0)`);
}

/** Opens a page in English as a persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, path: string) {
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona] ?? ''}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** The chapter navigation in the bar. */
function chapterNav(page: Page) {
  return page.getByRole('navigation', { name: 'Chapters' });
}

test.describe('chapter reader (S1-E4-01a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(seedChapters);
  test.afterAll(cleanUp);

  test('a reader opens a chapter from the story page and moves between chapters', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'teacher', `/s/${slug}`);
    await page.getByRole('link', { name: 'Caietele bunicii' }).click();
    await expect(page).toHaveURL(`/s/${slug}/readera1`);

    // The header: the place, the title as H1, the meta line.
    await expect(page.locator('header').getByText('Chapter 1 of 2')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Caietele bunicii' })).toBeVisible();
    await expect(page.getByText('by Lia Scrie · 9 Oct 2026 · 3 min read')).toBeVisible();

    // The text is real HTML, in the story's language.
    const text = page.locator('.tmc-chapter-text');
    await expect(text).toHaveAttribute('lang', 'ro');
    await expect(text.locator('p')).toHaveCount(2);
    await expect(text.locator('strong')).toHaveText('notează');
    await expectNoDoodles(page);

    // Next skips the draft; the first chapter has no Previous.
    await expect(chapterNav(page).getByRole('link', { name: 'Previous' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Read chapter 2' }).click();
    await expect(page).toHaveURL(`/s/${slug}/readerc3`);
    await expect(page.locator('header').getByText('Chapter 2 of 2')).toBeVisible();
    await expect(page.getByText('End of chapter 2')).toBeVisible();
    await expect(page.getByText('That’s the latest chapter so far.')).toBeVisible();
    await expect(chapterNav(page).getByRole('link', { name: 'Next chapter' })).toHaveCount(0);

    // Previous and Contents.
    await chapterNav(page).getByRole('link', { name: 'Previous' }).click();
    await expect(page).toHaveURL(`/s/${slug}/readera1`);
    await chapterNav(page).getByRole('link', { name: 'Contents' }).click();
    await expect(page).toHaveURL(`/s/${slug}`);
  });

  test('a read is counted once per chapter per tab, never the writer’s own', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'teacher', `/s/${slug}/readera1`);
    await expect(page.locator('.tmc-chapter-text')).toBeVisible();
    await expect.poll(() => readsToday('readera1')).toBe('1');
    await page.reload();
    await expect(page.locator('.tmc-chapter-text')).toBeVisible();
    // Give a second call the time it would need, then check nothing was added.
    await page.waitForTimeout(500);
    expect(readsToday('readera1')).toBe('1');

    const writer = await openAsPersona(browser, 'adult_writer', `/s/${slug}/readera1`);
    await expect(writer.locator('.tmc-chapter-text')).toBeVisible();
    await writer.waitForTimeout(500);
    expect(readsToday('readera1')).toBe('1');
  });

  test('a signed-out visitor gets the teaser page, not the reader', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto(`/s/${slug}/readera1`);
    await expect(page.getByRole('heading', { level: 2, name: 'Caietele bunicii' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Log in to read on' })).toBeVisible();
    // No reader bar, progress line or read counting for a visitor.
    await expect(page.getByRole('navigation', { name: 'Chapters' })).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('a draft, and a 16+ story for kid_14_ok, are not available', async ({ browser }) => {
    const reader = await openAsPersona(browser, 'teacher', `/s/${slug}/readerb2`);
    await expect(
      reader.getByRole('heading', { name: 'This chapter isn’t available' }),
    ).toBeVisible();

    runSql(`update public.stories set rating = '16_plus' where id = '${storyId}';`);
    const kid = await openAsPersona(browser, 'kid_14_ok', `/s/${slug}/readera1`);
    await expect(kid.getByRole('heading', { name: 'This chapter isn’t available' })).toBeVisible();
    await expect(kid.getByText('notează')).toHaveCount(0);
  });

  test('every view passes axe and fits, down to 320 px', async ({ browser }) => {
    test.setTimeout(240_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    for (const view of everyView([`/s/${slug}/readera1`])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${personaIds.teacher}';`,
      );
      const page = await context.newPage();
      await test.step(`axe at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await expect(page.locator('.tmc-chapter-text')).toBeVisible();
      });
      await page.close();
    }
    // The narrowest phone (WCAG 1.4.10): nothing scrolls sideways.
    const narrow = await context.newPage();
    await narrow.setViewportSize({ width: 320, height: 800 });
    await narrow.goto(`/s/${slug}/readerc3`);
    await expect(narrow.locator('.tmc-chapter-text')).toBeVisible();
    expect(await narrow.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
  });
});
