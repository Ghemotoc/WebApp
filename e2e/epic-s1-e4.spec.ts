/**
 * Epic check for S1-E4, reading (story S1-E4-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's main journeys across its March stories, in a real browser.
 * - Journey 1, a signed-in reader (S1-E3-05 × S1-E4-01a × S1-E4-06a): teen_17 opens the story
 *   page, goes into chapter one, can't copy its text (the notice says so honestly), reads on to
 *   chapter two, reaches "That's the latest chapter so far." and goes back through Contents; each
 *   chapter's read is counted once.
 * - Journey 2, a shared link (S1-E4-04 × S1-E4-06a × S1-E4-01a): the link's HTML carries the
 *   preview; a signed-out visitor gets the story card and the teaser, can't copy it either, and
 *   presses "Log in"; signed in as teen_17, the same address gives the whole chapter.
 * - Journey 3, ages and ratings (S1-E3-06 × S1-E4-01a × S1-E4-04): at 16+ teen_17 still reads,
 *   kid_14_ok and kid_14_waiting are told the chapter isn't available, and a visitor sees the
 *   title with "No preview for this story".
 * - Journey 4, the epic's screens at 390, 768 and 1440 px, at night and in Romanian (each
 *   story's own spec covers the other views): the reader with the copy notice, the teaser and
 *   the "No preview" notice; axe finds nothing serious, nothing scrolls sideways and no doodle
 *   is drawn.
 * The database half is supabase/tests/database/093-epic-s1-e4.test.sql.
 * Test data: seed personas; the seed story's chapters are removed and the story put back after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const firstChapter = `/s/${slug}/epicfou1`;

/** The personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teen_17: '00000000-0000-4000-8000-000000000002',
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
  kid_14_waiting: '00000000-0000-4000-8000-000000000004',
};

/** A 648-word first chapter: two paragraphs the teaser keeps, and a third ("ultimul") it doesn't. */
const longChapter = `repeat('Bunica notează vremea. ', 100) || chr(10) || chr(10)
  || repeat('Vântul bate dinspre munte. ', 62) || chr(10) || chr(10) || repeat('ultimul ', 100)`;

/** Removes this spec's chapters and puts the story and the personas' language back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  runSql(`update public.stories set rating = 'all_ages', first_published_at = null,
    last_chapter_published_at = null where id = '${storyId}';`);
  const ids = Object.values(personaIds).map((id) => `'${id}'`);
  runSql(`update public.profiles set locale = 'ro' where id in (${ids.join(', ')});`);
}

/** Two published chapters on adult_writer's seed story (publishing itself is S1-E3's check). */
function seedChapters() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values
      ('${storyId}', '${personaIds.adult_writer}', 'epicfou1', 1, 'Caietele bunicii', 'x', 648,
        'published', 'Caietele bunicii', ${longChapter}, 648, now()),
      ('${storyId}', '${personaIds.adult_writer}', 'epicfou2', 2, 'Vântul', 'x', 3, 'published',
        'Vântul', 'Vântul se întoarce.', 3, now());`);
  runSql(`update public.stories set first_published_at = now(), last_chapter_published_at = now()
    where id = '${storyId}';`);
}

/** Today's read total for a chapter. */
function readsOf(chapterCode: string): string {
  return runSql(`select coalesce(sum(chapter_reads.total), 0) from public.chapter_reads
    join public.chapters on chapters.id = chapter_reads.chapter_id where chapters.code = '${chapterCode}';`);
}

/** Opens a page as a persona, in a language, with the clipboard allowed. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  runSql(
    `update public.profiles set locale = '${language}' where id = '${personaIds[persona] ?? ''}';`,
  );
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Selects the first paragraph of the chapter text, presses Ctrl+C and returns the clipboard. */
async function copyFirstParagraph(page: Page): Promise<string> {
  await page.evaluate(() => navigator.clipboard.writeText('before'));
  await page.evaluate(() => {
    const paragraph = document.querySelector('.tmc-chapter-text p');
    if (paragraph === null) throw new Error('No chapter text on the page');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  });
  await page.keyboard.press('Control+C');
  return page.evaluate(() => navigator.clipboard.readText());
}

test.describe('epic check: reading (S1-E4-QA)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(seedChapters);
  test.afterAll(cleanUp);

  test('journey 1: a signed-in reader reads through the story, without copying', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teen_17', `/s/${slug}`);
    await page.getByRole('link', { name: 'Caietele bunicii' }).click();
    await expect(page.locator('header').getByText('Chapter 1 of 2')).toBeVisible();
    await expect(page.locator('.tmc-chapter-text p')).toHaveCount(3);
    // Copying is off on the text, and the notice says what it can and can't do.
    expect(await copyFirstParagraph(page)).toBe('before');
    await expect(
      page.getByText(/That makes copying harder, but it can’t stop screenshots\./),
    ).toBeVisible();
    // On to chapter two, the last one, and back through Contents.
    await page.getByRole('link', { name: 'Read chapter 2' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Vântul' })).toBeVisible();
    await expect(page.getByText('That’s the latest chapter so far.')).toBeVisible();
    await page.getByRole('link', { name: 'Contents' }).click();
    await expect(page).toHaveURL(new RegExp(`/s/${slug}$`));
    expect(readsOf('epicfou1')).toBe('1');
    expect(readsOf('epicfou2')).toBe('1');
  });

  test('journey 2: a shared link previews, teases and opens fully once signed in', async ({
    browser,
    request,
  }) => {
    // What WhatsApp reads: the server-rendered preview, and noindex on a chapter.
    const preview = await request.get(firstChapter);
    expect(await preview.text()).toContain(
      '<meta property="og:title" content="Stația meteo · Caietele bunicii">',
    );
    expect(preview.headers()['x-robots-tag']).toBe('noindex');
    // The visitor's browser: the teaser, copy-protected, and the prompt.
    const visitorContext = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    await visitorContext.addInitScript(
      (key) => localStorage.setItem(key, 'en'),
      LANGUAGE_STORAGE_KEY,
    );
    const visitor = await visitorContext.newPage();
    await visitor.goto(firstChapter);
    await expect(visitor.getByText('Shared with you · chapter 1 of 2')).toBeVisible();
    await expect(visitor.locator('.tmc-chapter-text p')).toHaveCount(2);
    expect(await copyFirstParagraph(visitor)).toBe('before');
    expect(readsOf('epicfou1')).toBe('0');
    await visitor.getByRole('link', { name: 'Log in' }).last().click();
    await expect(visitor).toHaveURL(/\/sign-in$/);
    // Signed in, the same address is the whole chapter in the reader.
    const reader = await openAs(browser, 'teen_17', firstChapter);
    await expect(reader.locator('.tmc-chapter-text p')).toHaveCount(3);
    await expect(reader.getByRole('navigation', { name: 'Chapters' })).toBeVisible();
  });

  test('journey 3: at 16+, teen_17 reads; the under-16s and the visitor don’t', async ({
    browser,
    page,
  }) => {
    runSql(`update public.stories set rating = '16_plus' where id = '${storyId}';`);
    const teen = await openAs(browser, 'teen_17', firstChapter);
    await expect(teen.locator('.tmc-chapter-text p')).toHaveCount(3);
    for (const persona of ['kid_14_ok', 'kid_14_waiting'] as const) {
      const kid = await openAs(browser, persona, firstChapter);
      await expect(
        kid.getByRole('heading', { name: 'This chapter isn’t available' }),
      ).toBeVisible();
      expect(await kid.content()).not.toContain('Bunica');
    }
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto(firstChapter);
    await expect(page.getByRole('heading', { name: 'No preview for this story' })).toBeVisible();
    await expect(page.getByText('The writer rated it 16+.')).toBeVisible();
  });

  test('journey 4: the reader, the teaser and the notice at three widths, at night, in Romanian', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    runSql(`update public.profiles set locale = 'ro' where id = '${personaIds.teen_17}';`);
    const readerContext = await browser.newContext();
    await useSessionInBrowser(readerContext, (await signInPersona('teen_17')).session);
    const visitorContext = await browser.newContext();
    for (const width of screenWidths) {
      const view = { address: firstChapter, width, theme: 'night', language: 'ro' } as const;
      await test.step(`the reader at ${width} px`, async () => {
        const page = await readerContext.newPage();
        await checkScreen(page, view);
        // From 768 px the chapter links sit in the bar; on a phone they move to the end of the
        // chapter, where "Read chapter 2" leads on (rulebook; bundle G7d).
        if (width >= 768) {
          await expect(page.getByRole('navigation', { name: 'Capitole' })).toBeVisible();
        } else {
          await expect(page.getByRole('link', { name: /Citește capitolul 2/ })).toBeVisible();
        }
        await page.close();
      });
      await test.step(`the teaser at ${width} px`, async () => {
        const page = await visitorContext.newPage();
        await checkScreen(page, view);
        await expect(page.getByText('Citești prima parte')).toBeVisible();
        await expectNoDoodles(page);
        await page.close();
      });
    }
    runSql(`update public.stories set rating = '18_plus' where id = '${storyId}';`);
    for (const width of screenWidths) {
      await test.step(`the notice at ${width} px`, async () => {
        const page = await visitorContext.newPage();
        await checkScreen(page, { address: firstChapter, width, theme: 'night', language: 'ro' });
        await expect(
          page.getByRole('heading', { name: 'Nicio previzualizare pentru această poveste' }),
        ).toBeVisible();
        await page.close();
      });
    }
  });
});
