/**
 * The reader's reading settings, in a real browser (story S1-E4-02; board 3.5 Reader).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the panel offers Paper (White, Sepia, Grey, Black), the typeface (with OpenDyslexic), text
 *   size, and line spacing and line width under More options, and each change shows on the text
 *   at once (first criterion; BOOKS B04, user story 2.4);
 * - the settings are saved to the account: a fresh browser (another device) opens the chapter
 *   with them (second criterion);
 * - with the device set to larger text, the default size follows it until the reader picks one,
 *   and "Use my device's size" brings it back (third criterion);
 * - Escape closes the panel and puts focus back on its button;
 * - time left sits in the chapter bar by default; "On the page" puts back the floating pill and
 *   takes the minutes out of the bar, and the choice is saved (CALM-5, handover Step 4, points 11
 *   and 12); Reading settings and a paragraph's comments are never open together;
 * - the open panel passes axe at 390 px in ro and en, on Black paper, and fits at 320 px.
 * Test data: adult_writer's story "Ploaia de joi" with one chapter; pending_check reads it
 *   (no other spec reads as pending_check in the reader). All removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const readerId = '00000000-0000-4000-8000-000000000005';
const storySlug = 'reading-settings-e2e';
const chapterPath = `/s/${storySlug}/setari01`;

/** Removes the spec's story and the reader's settings. */
function cleanUp() {
  runSql(`delete from public.reading_settings where user_id = '${readerId}';
    delete from public.chapters where code = 'setari01';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle = 'pending_check';`);
}

/** The story with one published chapter. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}', 'Ploaia de joi', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'setari01', 1, 'Capitol', 'x', 40, 'published', 'Capitolul unu',
      'Primul paragraf al capitolului.\n\nAl doilea paragraf, cu ceva mai multe cuvinte.', 40, now()
    from public.stories where slug = '${storySlug}';`);
}

/** Options for a fresh browser: the language and, for the third criterion, the device's text size. */
interface OpenOptions {
  language?: 'en' | 'ro';
  signedIn?: boolean;
  rootFontSize?: number;
}

/** Opens the chapter in a fresh browser context (a new device). */
async function openChapter(browser: Browser, options: OpenOptions = {}): Promise<Page> {
  const { language = 'en', signedIn = true, rootFontSize } = options;
  const context = await browser.newContext();
  if (signedIn) {
    runSql(`update public.profiles set locale = '${language}' where handle = 'pending_check';`);
    await useSessionInBrowser(context, (await signInPersona('pending_check')).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  // A device set to larger text raises the root font size, as browsers do (S1-E4-02).
  if (rootFontSize !== undefined) {
    await context.addInitScript((size) => {
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.fontSize = `${size}px`;
      });
    }, rootFontSize);
  }
  const page = await context.newPage();
  await page.goto(chapterPath);
  await expect(page.getByRole('heading', { level: 1, name: 'Capitolul unu' })).toBeVisible();
  return page;
}

/** The chapter text's computed style. */
function textStyle(page: Page, property: 'fontSize' | 'fontFamily' | 'lineHeight') {
  return page
    .locator('.tmc-chapter-text--reader')
    .evaluate((element, name) => getComputedStyle(element)[name], property);
}

test.describe('reading settings (S1-E4-02)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('every setting changes the text at once and follows the reader to another device', async ({
    browser,
  }) => {
    const page = await openChapter(browser);
    await page.getByRole('button', { name: 'Reading settings' }).click();
    const panel = page.getByRole('region', { name: 'Reading settings' });
    await panel.locator('label', { hasText: 'OpenDyslexic' }).click();
    await expect.poll(() => textStyle(page, 'fontFamily')).toContain('OpenDyslexic');
    await panel.getByLabel('Text size').fill('24');
    await expect.poll(() => textStyle(page, 'fontSize')).toBe('24px');
    // Line spacing and line width sit under More options (board B04-ReaderSettings).
    await panel.getByText('More options').click();
    await panel.getByRole('radio', { name: 'Wide' }).first().click();
    await expect.poll(() => textStyle(page, 'lineHeight')).toBe('48px');
    await panel.getByRole('radio', { name: 'Narrow' }).click();
    await expect(page.locator('article')).toHaveCSS('max-width', '560px');
    await panel.locator('label', { hasText: 'Grey' }).click();
    await expect(page.locator('.tmc-reading-page--grey')).toHaveCSS(
      'background-color',
      'rgb(237, 237, 237)',
    );
    // Saved once the changes stop.
    await expect
      .poll(() =>
        runSql(`select font || ' ' || text_size || ' ' || line_spacing || ' ' || line_width || ' ' || paper
          from public.reading_settings where user_id = '${readerId}';`).trim(),
      )
      .toBe('dyslexia_friendly 24 wide narrow grey');
    await page.context().close();
    // Another device opens the chapter with the same settings.
    const again = await openChapter(browser);
    await expect.poll(() => textStyle(again, 'fontSize')).toBe('24px');
    await expect(again.locator('.tmc-reading-page--grey')).toBeVisible();
  });

  test("the default size follows the device's larger text until the reader picks one", async ({
    browser,
  }) => {
    runSql(`delete from public.reading_settings where user_id = '${readerId}';`);
    const page = await openChapter(browser, { rootFontSize: 20 });
    await expect.poll(() => textStyle(page, 'fontSize')).toBe('25px');
    await page.getByRole('button', { name: 'Reading settings' }).click();
    const panel = page.getByRole('region', { name: 'Reading settings' });
    await expect(panel).toContainText('25 px, from the device');
    await panel.getByLabel('Text size').fill('16');
    await expect.poll(() => textStyle(page, 'fontSize')).toBe('16px');
    await panel.getByRole('button', { name: 'Use the device’s size' }).click();
    await expect.poll(() => textStyle(page, 'fontSize')).toBe('25px');
  });

  test('Escape closes the panel and focus goes back to its button', async ({ browser }) => {
    const page = await openChapter(browser);
    const button = page.getByRole('button', { name: 'Reading settings' });
    await button.click();
    await expect(page.getByRole('heading', { name: 'Reading settings' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('region', { name: 'Reading settings' })).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('time left shows in the bar until the reader puts it on the page', async ({ browser }) => {
    runSql(`delete from public.reading_settings where user_id = '${readerId}';`);
    const page = await openChapter(browser);
    await page.setViewportSize({ width: 1280, height: 400 });
    // Step 1: the default, in the bar, and no floating pill.
    const barMeta = page.getByTestId('chapter-bar-meta');
    await expect(barMeta).toHaveText('Chapter 1 · 1 min left');
    await expect(page.getByTestId('reading-time-left')).toHaveCount(0);
    // Step 2: On the page: the pill comes back and the bar keeps only the place.
    await page.getByRole('button', { name: 'Reading settings' }).click();
    const panel = page.getByRole('region', { name: 'Reading settings' });
    await panel.locator('label', { hasText: 'On the page' }).click();
    await expect(barMeta).toHaveText('Chapter 1');
    await expect(page.getByTestId('reading-time-left')).toHaveText('1 min left');
    await expect
      .poll(() =>
        runSql(
          `select time_left from public.reading_settings where user_id = '${readerId}';`,
        ).trim(),
      )
      .toBe('page');
    // Step 3: a paragraph's comments close Reading settings (never both open).
    await page.locator('.tmc-paragraph-marker').first().click();
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Reading settings' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await page.context().close();
  });

  for (const language of ['ro', 'en'] as const) {
    test(`axe: the open panel on Black paper at 390 px, ${language}, fitting at 320 px`, async ({
      browser,
    }) => {
      runSql(`insert into public.reading_settings (user_id, paper) values ('${readerId}', 'black')
        on conflict (user_id) do update set paper = 'black';`);
      const page = await openChapter(browser, { language });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 390, height: 900 });
      const buttonName = language === 'ro' ? 'Setări de citire' : 'Reading settings';
      await page.getByRole('button', { name: buttonName }).click();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious).toEqual([]);
      await page.setViewportSize({ width: 320, height: 900 });
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(320);
    });
  }
});
