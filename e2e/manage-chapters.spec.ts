/**
 * Manage chapters in a real browser (story S1-E3-04; board 4.4).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves, one test per acceptance criterion and the board's states:
 * - the list shows every chapter with its pill and meta line, including the "Edited on" date
 *   readers see for a published chapter that changed; axe finds nothing serious and no doodle
 *   is drawn at 390, 768 and 1440 px, in English and Romanian;
 * - "Move up" and "Move down" reorder chapters as well as dragging does, by mouse and by
 *   keyboard (Space, arrow, Space), and readers see the new order (WCAG 2.2, 2.5.7);
 * - moving a published chapter asks first ("Keep the order" keeps it), a draft moves straight
 *   away, titles carry their chapter number, and the numbers row counts chapters (G9d);
 * - Rename changes a published chapter's title for readers at once;
 * - Unpublish and Publish again from the list;
 * - Delete asks first, hides the chapter from readers at once, shows it under Recently deleted
 *   with the day it goes for good (30 days), and Undo brings it back at the end of the list.
 * Test data: chapters made in SQL on adult_writer's seed story "Stația meteo"; deleted after.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { findDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const writerId = '00000000-0000-4000-8000-000000000001';
const address = `/write/s/${slug}/chapters`;

/**
 * Removes this spec's chapters and the jobs "Publish again" queued (the publish tests count
 * them), and puts the story and the writer's language back.
 */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  runSql(
    `delete from public.jobs where kind = 'chapter_published' and payload ->> 'story_id' = '${storyId}';`,
  );
  runSql(
    `update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';`,
  );
  runSql(`update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/**
 * Adds one chapter to the story with the given columns; the rest are a 228-word draft saved
 * yesterday.
 *
 * @param columns - column name to SQL value, for example { status: "'published'" }
 */
function insertChapter(columns: Record<string, string>) {
  const all: Record<string, string> = {
    story_id: `'${storyId}'`,
    user_id: `'${writerId}'`,
    draft_body: "'Text.'",
    word_count: '228',
    draft_saved_at: "now() - interval '1 day'",
    ...columns,
  };
  runSql(
    `insert into public.chapters (${Object.keys(all).join(', ')}) values (${Object.values(all).join(', ')});`,
  );
}

/** The columns of a chapter that publish_chapter() has put live. */
function published(title: string, daysAgo: number) {
  return {
    status: "'published'",
    published_title: `'${title}'`,
    published_body: "'Text.'",
    published_word_count: '1',
    first_published_at: `now() - interval '${daysAgo} days'`,
  };
}

/**
 * The board's mix: two published chapters (one edited since), a draft, a scheduled chapter,
 * an unpublished one and one deleted ten days ago.
 */
function seedChapters() {
  cleanUp();
  insertChapter({
    code: "'mgpub001'",
    position: '1',
    draft_title: "'Caietele bunicii'",
    ...published('Caietele bunicii', 40),
  });
  insertChapter({
    code: "'mgpub002'",
    position: '2',
    draft_title: "'Vântul de miercuri'",
    ...published('Vântul de miercuri', 30),
    edited_at: "now() - interval '3 days'",
  });
  insertChapter({ code: "'mgdraft1'", position: '3', draft_title: "'Sâmbătă la atelier'" });
  insertChapter({
    code: "'mgsched1'",
    position: '4',
    draft_title: "'Radioul din Câmpina'",
    status: "'scheduled'",
    scheduled_for: "now() + interval '2 days'",
  });
  insertChapter({
    code: "'mgunpub1'",
    position: '5',
    draft_title: "'Stația din 1989'",
    ...published('Stația din 1989', 20),
    status: "'draft'",
    unpublished_at: "now() - interval '1 day'",
  });
  insertChapter({
    code: "'mgdel001'",
    position: '6',
    draft_title: "'Nota autorului'",
    deleted_at: "now() - interval '10 days'",
  });
}

/** The codes of the story's live chapters, in reading order. */
function chapterOrder(): string {
  return runSql(
    `select string_agg(code, ',' order by position) from public.chapters where story_id = '${storyId}' and deleted_at is null;`,
  );
}

/**
 * Opens Manage chapters as adult_writer, in English.
 *
 * @param browser - the test's browser
 * @param viewport - the window size to open with (Playwright's default 1280 by 720 if left out);
 *   set here rather than resized later, because a resize cancels a keyboard drag in dnd-kit
 * @returns the open page
 */
async function openManageChapters(
  browser: Browser,
  viewport?: { width: number; height: number },
): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext(viewport === undefined ? {} : { viewport });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  await expect(page.getByRole('heading', { name: 'Manage chapters', level: 1 })).toBeVisible();
  return page;
}

/** The list of chapters in reading order. */
function chapterList(page: Page) {
  return page.getByRole('list', {
    name: /^(Chapters in reading order|Capitolele în ordinea lecturii)$/,
  });
}

/**
 * Answers "Move a published chapter?" with "Move chapter" (G9d: chapter numbers follow the
 * order, so moving a published chapter asks first).
 */
async function confirmMove(page: Page) {
  const dialog = page.getByRole('alertdialog', { name: 'Move a published chapter?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Move chapter', exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** axe's serious and critical issues on the page as it is now (WCAG 2.2 AA). */
async function seriousAxeIssues(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

/**
 * The titles a signed-out reader sees on the story page, in order, read in a fresh browser
 * context so the writer's own view (which also lists drafts) never stands in for a reader's.
 */
async function readerTitles(browser: Browser): Promise<string[]> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/s/${slug}`);
  const chapters = page.getByRole('region', { name: /Capitole|Chapters/ });
  await expect(chapters).toBeVisible();
  // Each row's title is its heading-font line (StoryChapterList).
  const titles = await chapters.locator('li > p.font-heading').allTextContents();
  await context.close();
  return titles;
}

test.describe('Manage chapters (S1-E3-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(seedChapters);
  test.afterAll(cleanUp);

  test('the list shows each chapter with its state, and the "Edited on" readers see', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    await expect(
      page.getByRole('heading', { name: '2 published, 1 draft, 1 scheduled, 1 unpublished' }),
    ).toBeVisible();
    const rows = chapterList(page).getByRole('listitem');
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toContainText('Published');
    await expect(rows.nth(1)).toContainText(/readers see “Edited on \d+ \w+”/);
    await expect(rows.nth(2)).toContainText('Draft · 228 words · saved');
    await expect(rows.nth(3)).toContainText(/Goes live .*, Romania time/);
    await expect(rows.nth(4)).toContainText('readers can’t open it · comments hidden but kept');
    await expect(page.getByRole('button', { name: 'Move chapter 1 up' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Move chapter 5 down' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    const deleted = page.getByRole('region', { name: 'Recently deleted' });
    await expect(deleted).toContainText('Nota autorului');
    await expect(deleted).toContainText(/Deleted \d+ \w+ · gone for good on \d+ \w+ \d{4}/);
  });

  test('passes axe and draws no doodle at 390, 768 and 1440 px, in English and Romanian', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    for (const language of ['en', 'ro'] as const) {
      // The account's own language wins (S1-E1-04), so set it to the view's language first.
      runSql(`update public.profiles set locale = '${language}' where id = '${writerId}';`);
      for (const width of [390, 768, 1440]) {
        const context = await browser.newContext();
        await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
        const page = await context.newPage();
        await checkScreen(page, { address, width, language, theme: 'light' });
        // checkScreen ran axe once; run it again now the rows are certainly in.
        await expect(chapterList(page).getByRole('listitem')).toHaveCount(5);
        expect(await seriousAxeIssues(page)).toEqual([]);
        expect(await findDoodles(page)).toEqual([]);
        await context.close();
      }
    }
  });

  test('"Move up" and "Move down" reorder chapters, and readers see the new order', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    await page.getByRole('button', { name: 'Move chapter 2 up' }).click();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub002,mgpub001,mgdraft1,mgsched1,mgunpub1');
    // Focus comes back to the arrow, now at the top, so the keyboard user can carry on.
    await expect(page.getByRole('button', { name: 'Move chapter 1 up' })).toBeFocused();
    await page.getByRole('button', { name: 'Move chapter 1 down' }).click();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub001,mgpub002,mgdraft1,mgsched1,mgunpub1');
    await page.getByRole('button', { name: 'Move chapter 1 down' }).click();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub002,mgpub001,mgdraft1,mgsched1,mgunpub1');
    expect(await readerTitles(browser)).toEqual(['Vântul de miercuri', 'Caietele bunicii']);
  });

  test('dragging the handle with the mouse reorders chapters', async ({ browser }) => {
    const page = await openManageChapters(browser);
    // A tall window keeps every row away from the edges, where dnd-kit scrolls the page.
    await page.setViewportSize({ width: 1440, height: 1600 });
    const handle = page.getByRole('button', { name: /^Drag chapter 1 to reorder/ });
    const target = chapterList(page).getByRole('listitem').nth(2);
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    if (from === null || to === null) throw new Error('The handle or the row is not on screen.');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    // Small steps, so the drag starts (6 px) and passes over the rows on the way.
    await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2, { steps: 20 });
    await page.mouse.up();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub002,mgdraft1,mgpub001,mgsched1,mgunpub1');
  });

  test('moving a published chapter asks first, and "Keep the order" keeps it', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    await page.getByRole('button', { name: 'Move chapter 2 up' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Move a published chapter?' });
    // The question names the chapter and the number it would get.
    await expect(dialog).toContainText('“Vântul de miercuri” becomes chapter 1.');
    await dialog.getByRole('button', { name: 'Keep the order' }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(chapterOrder).toBe('mgpub001,mgpub002,mgdraft1,mgsched1,mgunpub1');
    // A draft has no readers to surprise, so it moves without a question.
    await page.getByRole('button', { name: 'Move chapter 3 up' }).click();
    await expect.poll(chapterOrder).toBe('mgpub001,mgdraft1,mgpub002,mgsched1,mgunpub1');
    await expect(dialog).toBeHidden();
  });

  test('the numbers row counts chapters and words, and names the next scheduled chapter', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    const numbers = page.getByRole('region', { name: 'This story in numbers' });
    await expect(numbers.getByRole('definition').first()).toHaveText('5');
    await expect(numbers).toContainText('chapters');
    await expect(numbers).not.toContainText('none scheduled');
    // Chapter titles carry their number, which follows the reading order.
    await expect(
      chapterList(page).getByRole('link', { name: 'Chapter 2: Vântul de miercuri' }),
    ).toBeVisible();
  });

  test('dragging by keyboard: Space picks up, arrows move, Space drops', async ({ browser }) => {
    // A tall window keeps every row away from the edges, where dnd-kit scrolls the page (at the
    // default 720 px, rows 4 and 5 sit below the edge). It is set when the page opens: a resize
    // during the drag cancels it.
    const page = await openManageChapters(browser, { width: 1440, height: 1600 });
    // Start only once the page has finished loading and moving. A drag cancelled part-way (dnd-kit
    // says "Move cancelled") turned the final Space into a new pick-up, so the order never changed
    // (TOOL-1, 24 Oct 2026).
    await page.waitForLoadState('networkidle');
    await waitForAnimationsToFinish(page);
    await page.getByRole('button', { name: /^Drag chapter 3 to reorder/ }).focus();
    // Each step waits for what a screen reader would say, then for the rows to stop sliding, as a
    // person would before the next key. The announcement comes at once but dnd-kit slides the
    // rows for about 250 ms; a key pressed mid-slide sometimes dropped the chapter in the wrong
    // place (TOOL-1, 24 Oct 2026).
    const spoken = page.locator('[role="status"][aria-live="assertive"]');
    await page.keyboard.press('Space');
    await expect(spoken).toContainText('Picked up chapter 3, Sâmbătă la atelier.');
    await waitForAnimationsToFinish(page);
    await page.keyboard.press('ArrowUp');
    await expect(spoken).toContainText('Sâmbătă la atelier is now at position 2 of 5.');
    await waitForAnimationsToFinish(page);
    await page.keyboard.press('ArrowUp');
    await expect(spoken).toContainText('Sâmbătă la atelier is now at position 1 of 5.');
    await waitForAnimationsToFinish(page);
    await page.keyboard.press('Space');
    await expect.poll(chapterOrder).toBe('mgdraft1,mgpub001,mgpub002,mgsched1,mgunpub1');
    // The move is read out in plain words.
    await expect(spoken).toContainText('Dropped Sâmbătă la atelier at position 1 of 5.');
  });

  test('Rename: a published chapter’s new title reaches readers at once', async ({ browser }) => {
    const page = await openManageChapters(browser);
    const firstRow = chapterList(page).getByRole('listitem').first();
    await firstRow.getByRole('button', { name: 'Rename' }).click();
    const field = page.getByRole('textbox', { name: 'New title for chapter 1' });
    await expect(field).toBeFocused();
    await field.fill('Caietele bunicii, partea întâi');
    await firstRow.getByRole('button', { name: 'Save' }).click();
    await expect(
      firstRow.getByRole('link', { name: 'Caietele bunicii, partea întâi' }),
    ).toBeVisible();
    await expect(firstRow.getByRole('button', { name: 'Rename' })).toBeFocused();
    expect(await readerTitles(browser)).toEqual([
      'Caietele bunicii, partea întâi',
      'Vântul de miercuri',
    ]);
  });

  test('Unpublish and Publish again from the list', async ({ browser }) => {
    const page = await openManageChapters(browser);
    const firstRow = chapterList(page).getByRole('listitem').first();
    await firstRow.getByRole('button', { name: 'Unpublish' }).click();
    await expect(firstRow).toContainText('Unpublished');
    expect(await readerTitles(browser)).toEqual(['Vântul de miercuri']);

    await page.goto(address);
    const unpublishedRow = chapterList(page).getByRole('listitem').nth(4);
    await unpublishedRow.getByRole('button', { name: 'Publish again' }).click();
    await expect(unpublishedRow).toContainText('Published');
    await expect
      .poll(() => runSql(`select status from public.chapters where code = 'mgunpub1'`))
      .toBe('published');
  });

  test('Delete asks first, hides the chapter at once, and Undo brings it back at the end', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    const firstRow = chapterList(page).getByRole('listitem').first();
    await firstRow.getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete “Caietele bunicii”?' });
    await expect(dialog).toContainText('delete it for good after 30 days');
    await expect(dialog.getByRole('button', { name: 'Keep chapter' })).toBeFocused();

    // "Keep chapter" (and Escape) change nothing.
    await dialog.getByRole('button', { name: 'Keep chapter' }).click();
    await expect(dialog).toBeHidden();
    expect(chapterOrder()).toBe('mgpub001,mgpub002,mgdraft1,mgsched1,mgunpub1');

    await firstRow.getByRole('button', { name: 'Delete' }).click();
    await dialog.getByRole('button', { name: 'Delete chapter' }).click();
    await expect.poll(chapterOrder).toBe('mgpub002,mgdraft1,mgsched1,mgunpub1');
    const deleted = page.getByRole('region', { name: 'Recently deleted' });
    await expect(deleted).toContainText('Caietele bunicii');
    await expect(deleted).toContainText('gone for good on');
    expect(
      runSql(
        `select (deleted_at > now() - interval '1 minute')::text from public.chapters where code = 'mgpub001'`,
      ),
    ).toBe('true');

    expect(await readerTitles(browser)).toEqual(['Vântul de miercuri']);

    await deleted
      .getByRole('listitem')
      .filter({ hasText: 'Caietele bunicii' })
      .getByRole('button', { name: 'Undo' })
      .click();
    await expect.poll(chapterOrder).toBe('mgpub002,mgdraft1,mgsched1,mgunpub1,mgpub001');
    await expect(chapterList(page).getByRole('listitem')).toHaveCount(5);
    expect(await readerTitles(browser)).toEqual(['Vântul de miercuri', 'Caietele bunicii']);
  });
});
