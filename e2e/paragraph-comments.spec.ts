/**
 * Comments on one paragraph in a real browser (story S1-E6-06; board 3.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - teacher opens a paragraph's marker, comments on that paragraph only, and the marker counts
 *   it; the thread closes with Close or Escape and hands focus back; the main list says "On
 *   paragraph 2" (criterion 1); at 1280 px and wider the thread opens in the side column
 *   "Reading tools" beside the paper and takes focus, and below that it opens in the bottom sheet,
 *   a dialog that keeps focus inside (bundle CALM-5); its head is the paragraph's opening words
 *   and Close, with no title or count;
 * - the writer puts a new paragraph first: the comment follows its paragraph to number 3; the
 *   writer changes its words: the comment moves to "comments on an earlier version", which opens
 *   without a box to comment in (criterion 2);
 * - the markers and an open thread pass axe and don't scroll sideways at 390, 768 and 1440 px,
 *   light and night, Romanian and English.
 * Test data: one published chapter on adult_writer's "Stația meteo"; its comments go with it.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/parae001';

/** The chapter's three paragraphs, as first published. */
const firstBody = 'The station was quiet.\n\nThe lift stopped between floors.\n\nNobody answered.';

/** Removes this spec's chapter (its comments and jobs go with it) and the seed state. */
function cleanUp() {
  runSql(`delete from public.jobs where kind = 'comment_posted';
    delete from public.comments where chapter_id in (select id from public.chapters where code like 'parae%');
    delete from public.chapters where code like 'parae%';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'pending_check');`);
}

/** One published chapter to comment on. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'parae001', 1, 'One', 'x', 13, 'published', 'One',
      '${firstBody.replaceAll('\n', "' || chr(10) || '")}', 13, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/**
 * Publishes new words for the chapter, as the writer would.
 *
 * @param paragraphs - the chapter's paragraphs
 */
function republish(paragraphs: string[]) {
  const body = paragraphs.map((paragraph) => `'${paragraph}'`).join(' || chr(10) || chr(10) || ');
  runSql(`update public.chapters set published_body = ${body} where code = 'parae001';`);
}

/** Opens the chapter in English, as a persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(chapterAddress);
  return page;
}

/**
 * The comment marker beside one paragraph.
 *
 * @param page - the reader
 * @param block - the paragraph's number
 * @returns its button
 */
function markerOf(page: Page, block: number) {
  return page
    .locator('.tmc-paragraph-row', { has: page.locator(`p[data-block="${block}"]`) })
    .locator('.tmc-paragraph-marker');
}

/**
 * Checks the open comment box lines up with its paragraph (CALM-9, board B03): About this story
 * ends above the box, and the box starts level with the paragraph, or just under About this story
 * when that reaches lower than the paragraph's top.
 *
 * @param page - the reader
 * @param panel - the side column
 * @param block - the open paragraph's number
 */
async function expectBoxLevelWithParagraph(page: Page, panel: Locator, block: number) {
  const slot = panel.locator('[data-thread-slot]');
  const row = page.locator('.tmc-paragraph-row', { has: page.locator(`p[data-block="${block}"]`) });
  // Wait a frame for the measuring, then compare the tops.
  await expect
    .poll(async () => {
      const slotBox = await slot.boundingBox();
      const rowBox = await row.boundingBox();
      const aboveBox = await slot.locator('xpath=preceding-sibling::*[1]').boundingBox();
      if (slotBox === null || rowBox === null || aboveBox === null) return 'not drawn';
      if (aboveBox.y + aboveBox.height > slotBox.y + 1) return 'About this story overlaps';
      if (slotBox.y < rowBox.y - 1) return 'box above its paragraph';
      const aboutReachesLower = aboveBox.y + aboveBox.height > rowBox.y;
      if (!aboutReachesLower && Math.abs(slotBox.y - rowBox.y) > 1) return 'box not level';
      return 'level';
    })
    .toBe('level');
}

test.describe('comments on a paragraph (S1-E6-06)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('teacher comments on paragraph 2 only, and the marker counts it', async ({ browser }) => {
    const page = await openAs(browser, 'teacher');
    const marker = markerOf(page, 2);
    await expect(marker).toHaveAccessibleName('Comment on this paragraph');
    await marker.click();
    await expect(marker).toHaveAttribute('aria-expanded', 'true');
    // At 1280 px (Desktop Chrome) the thread opens in the side column and takes focus (CALM-5).
    const panel = page.getByRole('complementary', { name: 'Reading tools' });
    const thread = panel.getByRole('region', { name: 'Comments on paragraph 2' });
    await expect(thread).toContainText('No comments on this paragraph yet');
    // Its head: the paragraph's opening words, no title or count.
    await expect(thread.locator('blockquote')).toHaveText('The lift stopped between floors.');
    await expect(thread).toBeFocused();
    // B03 (CALM-9): About this story sits above the box, and the box never starts above its
    // paragraph; it starts level with it unless About this story reaches lower.
    await expectBoxLevelWithParagraph(page, panel, 2);
    await thread
      .getByRole('textbox', { name: 'Comment on this paragraph' })
      .fill('That lift scared me.');
    await thread.getByRole('button', { name: 'Post comment' }).click();
    await expect(thread.getByRole('article', { name: 'teacher' })).toContainText('That lift');
    await expect(marker).toHaveAccessibleName('1 comment on this paragraph');
    // The other paragraphs have none, and the main list says where the comment is.
    await expect(markerOf(page, 1)).toHaveAccessibleName('Comment on this paragraph');
    await expect(page.locator('#comments-heading')).toHaveText('1 comment');
    await expect(page.getByText('On paragraph 2', { exact: true })).toBeVisible();
    // Close and Escape shut the thread and give focus back to the marker.
    await thread.getByRole('button', { name: 'Close' }).click();
    await expect(thread).toBeHidden();
    await expect(marker).toBeFocused();
    await marker.press('Enter');
    await page
      .getByRole('region', { name: 'Comments on paragraph 2' })
      .getByRole('textbox')
      .focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('region', { name: 'Comments on paragraph 2' })).toBeHidden();
    await expect(marker).toBeFocused();
    await page.context().close();
  });

  test('on a wide screen the marker sits in the right margin, clear of the text and the side column', async ({
    browser,
  }) => {
    // Robert, 24 Nov 2026: the comment mark goes on the right of the paragraph, not the left.
    const page = await openAs(browser, 'teacher');
    for (const width of [1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const marker = markerOf(page, 2);
      await expect(marker).toBeVisible();
      const markerBox = await marker.boundingBox();
      const textBox = await page.locator('p[data-block="2"]').boundingBox();
      expect(markerBox, `${width} px`).not.toBeNull();
      expect(textBox, `${width} px`).not.toBeNull();
      if (markerBox === null || textBox === null) continue;
      // Right of the text, and still on the screen.
      expect(markerBox.x, `${width} px`).toBeGreaterThanOrEqual(textBox.x + textBox.width);
      expect(markerBox.x + markerBox.width, `${width} px`).toBeLessThanOrEqual(width);
      // The side column (from 1280 px) starts to the right of the marker.
      const side = page.getByRole('complementary', { name: 'Reading tools' });
      if (width >= 1280) {
        await expect(side).toBeVisible();
        const sideBox = await side.boundingBox();
        expect(sideBox).not.toBeNull();
        if (sideBox !== null) {
          expect(markerBox.x + markerBox.width, `${width} px`).toBeLessThanOrEqual(sideBox.x);
        }
      }
    }
    await page.context().close();
  });

  test('below 1280 px the thread opens in the bottom sheet, with no side column', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher');
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(page.getByTestId('reader-side-column')).toHaveCount(0);
    const marker = markerOf(page, 1);
    await marker.click();
    // The sheet is a modal dialog holding the thread; focus moves inside it.
    const sheet = page.getByRole('dialog', { name: 'Comments on this paragraph' });
    const thread = sheet.getByRole('region', { name: 'Comments on paragraph 1' });
    await expect(thread).toContainText('No comments on this paragraph yet');
    await expect(thread).toBeFocused();
    // Close gives focus back to the marker.
    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(sheet).toHaveCount(0);
    await expect(marker).toBeFocused();
    await page.context().close();
  });

  test('a moved paragraph keeps its comments; a changed one sends them to an earlier version', async ({
    browser,
  }) => {
    // A new paragraph first: the lift paragraph is now number 3, and its comment follows it.
    republish([
      'A new opening line.',
      'The station was quiet.',
      'The lift stopped between floors.',
      'Nobody answered.',
    ]);
    const page = await openAs(browser, 'teacher');
    await expect(markerOf(page, 3)).toHaveAccessibleName('1 comment on this paragraph');
    await expect(markerOf(page, 2)).toHaveAccessibleName('Comment on this paragraph');
    await page.context().close();

    // The writer changes the lift paragraph's words: the comment goes to an earlier version.
    republish([
      'A new opening line.',
      'The station was quiet.',
      'The stairs went on forever.',
      'Nobody answered.',
    ]);
    const after = await openAs(browser, 'teacher');
    await expect(markerOf(after, 3)).toHaveAccessibleName('Comment on this paragraph');
    const earlier = after.getByRole('button', {
      name: '1 comment on an earlier version of this chapter',
    });
    await earlier.click();
    const thread = after.getByRole('region', { name: 'Comments on an earlier version' });
    await expect(thread.getByRole('article', { name: 'teacher' })).toContainText('That lift');
    await expect(thread.getByRole('textbox')).toHaveCount(0);
    await expect(after.getByText('On an earlier version', { exact: true })).toBeVisible();
    await after.context().close();
    republish(firstBody.split('\n\n'));
  });

  for (const view of everyView([chapterAddress])) {
    test(`the markers and a thread pass axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // A persona no other spec switches the language of, set to this view's language.
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'pending_check';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('pending_check')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      // Open paragraph 2's thread, then check again: axe, and nothing scrolling sideways.
      const marker = markerOf(page, 2);
      await marker.click();
      await expect(page.locator('[data-paragraph-thread]')).toBeVisible();
      await expect(page.locator('[data-paragraph-thread] article').first()).toBeVisible();
      // Reduce motion ends every animation at once, so axe measures the colours the screen
      // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const seriousIssues = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(seriousIssues).toEqual([]);
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(view.width);
      await context.close();
    });
  }
});
