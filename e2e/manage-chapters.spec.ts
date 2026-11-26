/**
 * A story's Chapters page in a real browser (story S1-E3-04; board D03, user story 5.3).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves, one test per acceptance criterion and the board's states:
 * - the list shows every chapter with its meta line (the state in bold first), including the
 *   "Edited on" date readers see for a published chapter that changed; axe finds nothing serious
 *   and no doodle is drawn at 390, 768 and 1440 px, in English and Romanian;
 * - Earlier and Later reorder chapters as well as dragging a row does, readers see the new
 *   order (WCAG 2.2, 2.5.7), and on phones Earlier and Later sit in More (story 5.3);
 * - moving a published chapter asks "Change the order readers see?" ("Keep the order" keeps it),
 *   a draft moves straight away, titles carry their chapter number, and the four numbers count
 *   chapters by state, the words out and the status with the marked last chapter (board D03);
 * - a long story opens on its newest six chapters with "Show chapters 1 to N";
 * - More holds Preview, Schedule, Copy link and Delete, with the addresses the editor reads;
 * - a chapter whose number changed says where it was ("moved here from chapter 2" for the one
 *   the writer moved, "was chapter 1" for the one that made room), after an arrow and after a
 *   drag, in Romanian too, and a chapter put back shows no note (GAPS-11);
 * - Rename (in More) changes a published chapter's title for readers at once;
 * - Unpublish and Publish again from More;
 * - Delete asks first, hides the chapter from readers at once, shows it under Recently deleted
 *   with the days left (30), and Restore brings it back at the end of the list.
 * Test data: chapters made in SQL on adult_writer's seed story "Stația meteo"; deleted after.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

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
 * @param viewport - the window size to open with (Playwright's default 1280 by 720 if left out)
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
  await expect(page.getByRole('heading', { name: 'Chapters', level: 1 })).toBeVisible();
  return page;
}

/** The list of chapters in reading order. */
function chapterList(page: Page) {
  return page.getByRole('list', {
    name: /^(Chapters in reading order|Capitolele în ordinea lecturii)$/,
  });
}

/** The chapter rows themselves (each row's meta line is a list of its own inside it). */
function chapterRows(page: Page) {
  return chapterList(page).locator(':scope > li');
}

/** A row's or a deleted row's meta line, read with its middots ("Draft · saved 23 Oct"). */
async function metaLine(row: Locator): Promise<string> {
  return (await row.locator('.meta-line > li').allTextContents()).join(' · ');
}

/** Opens a chapter's "…" menu and picks one of its items. */
async function pickFromMore(page: Page, number: number, item: string) {
  await page.getByRole('button', { name: `More for chapter ${number}` }).click();
  await page.getByRole('menuitem', { name: item, exact: true }).click();
}

/**
 * Answers "Change the order readers see?" with "Move it" (G9d, board D03: chapter numbers follow
 * the order, so moving a published chapter asks first).
 */
async function confirmMove(page: Page) {
  const dialog = page.getByRole('alertdialog', { name: 'Change the order readers see?' });
  await expect(dialog).toBeVisible();
  // Right after a mouse drag, dnd-kit swallows the next click on the page for a moment (it stops
  // the click a drag would otherwise fire), and on a slow CI machine our click can land in that
  // moment. So press again while the question is still open: one press that counts closes it.
  await expect(async () => {
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'Move it', exact: true }).click();
    }
    await expect(dialog).toBeHidden({ timeout: 1_500 });
  }).toPass({ timeout: 10_000 });
}

/** axe's serious and critical issues on the page as it is now (WCAG 2.2 AA). */
async function seriousAxeIssues(page: Page) {
  // Reduce motion ends every animation at once, so axe measures the colours the screen
  // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  const chapters = page.getByRole('region', { name: /capitol|chapter/i });
  await expect(chapters).toBeVisible();
  // Each row's title is its heading-font line (StoryChapterList).
  // Each title carries its number ("1. Dimineața", board B01); the order is what these checks
  // compare, so the number is taken off here and checked on its own where it matters.
  const titles = (await chapters.locator('[data-chapter-title]').allTextContents()).map((title) =>
    title.replace(/^\d+\. /, ''),
  );
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
    const rows = chapterRows(page);
    await expect(rows).toHaveCount(5);
    expect(await metaLine(rows.nth(0))).toMatch(/^Published · \d+ \w+ · 228 words$/);
    // The state is the bold first fact (MetaLine), so the word, not a colour, says it.
    await expect(rows.nth(0).locator('.meta-line > li').first()).toHaveClass(/font-semibold/);
    expect(await metaLine(rows.nth(1))).toMatch(/readers see “Edited on \d+ \w+”/);
    expect(await metaLine(rows.nth(2))).toMatch(/^Draft · saved \d+ \w+ · 228 words$/);
    expect(await metaLine(rows.nth(3))).toMatch(
      /^Scheduled · goes live .*, local time · 228 words$/,
    );
    expect(await metaLine(rows.nth(4))).toContain(
      'readers can’t open it · comments hidden but kept',
    );
    await expect(page.getByRole('button', { name: 'Move chapter 1 earlier' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Move chapter 5 later' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    const deleted = page.getByRole('region', { name: 'Recently deleted' });
    await expect(deleted).toContainText('6. Nota autorului');
    expect(await metaLine(deleted.locator(':scope li').first())).toMatch(
      /^Deleted \d+ \w+ · 20 days left$/,
    );
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
        await expect(chapterRows(page)).toHaveCount(5);
        expect(await seriousAxeIssues(page)).toEqual([]);
        expect(await findDoodles(page)).toEqual([]);
        await context.close();
      }
    }
  });

  test('Earlier and Later reorder chapters, and readers see the new order', async ({ browser }) => {
    const page = await openManageChapters(browser);
    await page.getByRole('button', { name: 'Move chapter 2 earlier' }).click();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub002,mgpub001,mgdraft1,mgsched1,mgunpub1');
    // Focus comes back to the arrow, now at the top, so the keyboard user can carry on.
    await expect(page.getByRole('button', { name: 'Move chapter 1 earlier' })).toBeFocused();
    await page.getByRole('button', { name: 'Move chapter 1 later' }).click();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub001,mgpub002,mgdraft1,mgsched1,mgunpub1');
    await page.getByRole('button', { name: 'Move chapter 1 later' }).click();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub002,mgpub001,mgdraft1,mgsched1,mgunpub1');
    expect(await readerTitles(browser)).toEqual(['Vântul de miercuri', 'Caietele bunicii']);
    // The numbers follow the new order: the chapter moved up is now chapter 1.
    const reader = await browser.newPage();
    await reader.goto(`/s/${slug}`);
    await expect(reader.locator('[data-chapter-title]').first()).toHaveText(
      '1. Vântul de miercuri',
    );
    await reader.context().close();
  });

  test('dragging a row by its title with the mouse reorders chapters', async ({ browser }) => {
    const page = await openManageChapters(browser);
    // A tall window keeps every row away from the edges, where dnd-kit scrolls the page.
    await page.setViewportSize({ width: 1440, height: 1600 });
    // The board has no handle: the row's title and meta line are what a person drags.
    const handle = chapterRows(page)
      .nth(0)
      .getByRole('link', { name: /^Chapter 1:/ });
    const target = chapterRows(page).nth(2);
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    if (from === null || to === null) throw new Error('The title or the row is not on screen.');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    // Small steps, so the drag starts (6 px) and passes over the rows on the way.
    await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2, { steps: 20 });
    await page.mouse.up();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub002,mgdraft1,mgpub001,mgsched1,mgunpub1');
  });

  test('a moved chapter says where it was, and a chapter put back says nothing', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    const rows = chapterRows(page);
    await expect(page.getByText(/was chapter|moved here from chapter/)).toHaveCount(0);
    // An arrow: the chapter the writer moved and the one that made room each get a note.
    await page.getByRole('button', { name: 'Move chapter 4 earlier' }).click();
    await expect.poll(chapterOrder).toBe('mgpub001,mgpub002,mgsched1,mgdraft1,mgunpub1');
    await expect(rows.nth(2)).toContainText('moved here from chapter 4');
    await expect(rows.nth(3)).toContainText('was chapter 3');
    await expect(page.getByText(/was chapter|moved here from chapter/)).toHaveCount(2);
    // A drag from the top to third place: the dragged chapter says where it came from.
    await page.setViewportSize({ width: 1440, height: 1600 });
    const handle = rows.nth(0).getByRole('link', { name: /^Chapter 1:/ });
    const from = await handle.boundingBox();
    const to = await rows.nth(2).boundingBox();
    if (from === null || to === null) throw new Error('The title or the row is not on screen.');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2, { steps: 20 });
    await page.mouse.up();
    await confirmMove(page);
    await expect.poll(chapterOrder).toBe('mgpub002,mgsched1,mgpub001,mgdraft1,mgunpub1');
    await expect(rows.nth(2)).toContainText('moved here from chapter 1');
    await expect(rows.nth(0)).toContainText('was chapter 2');
    // The scheduled chapter went from 4 to 3 by the arrow, then to 2 by the drag: it still
    // says the number it started the week with.
    await expect(rows.nth(1)).toContainText('moved here from chapter 4');
    // The same notes in Romanian, at phone width, with nothing for axe to flag.
    runSql(`update public.profiles set locale = 'ro' where id = '${writerId}';`);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.reload();
    await expect(rows.nth(2)).toContainText('mutat aici de la capitolul 1');
    await expect(rows.nth(0)).toContainText('a fost capitolul 2');
    // The page fades in after a reload; axe reads colours, so it waits for that to end.
    await waitForAnimationsToFinish(page);
    expect(await seriousAxeIssues(page)).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // Back in the first order, by the database's own functions: every note goes.
    runSql(
      `select set_config('request.jwt.claims', '{"sub": "${writerId}", "role": "authenticated"}', true); select public.set_chapter_order('${slug}', array['mgpub001','mgpub002','mgdraft1','mgsched1','mgunpub1']);`,
    );
    await page.reload();
    await expect(rows).toHaveCount(5);
    await expect(page.getByText(/a fost capitolul|mutat aici de la capitolul/)).toHaveCount(0);
  });

  test('moving a published chapter asks first, and "Keep the order" keeps it', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    await page.getByRole('button', { name: 'Move chapter 2 earlier' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Change the order readers see?' });
    // The question names the chapter and the number it would get.
    await expect(dialog).toContainText('“Vântul de miercuri” becomes chapter 1.');
    await dialog.getByRole('button', { name: 'Keep the order' }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(chapterOrder).toBe('mgpub001,mgpub002,mgdraft1,mgsched1,mgunpub1');
    // A draft has no readers to surprise, so it moves without a question.
    await page.getByRole('button', { name: 'Move chapter 3 earlier' }).click();
    await expect.poll(chapterOrder).toBe('mgpub001,mgdraft1,mgpub002,mgsched1,mgunpub1');
    await expect(dialog).toBeHidden();
  });

  test('the four numbers count chapters by state, the words out and the last chapter', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    const numbers = page.getByRole('region', { name: 'This story in numbers' });
    await expect(numbers.getByRole('definition').first()).toHaveText('5');
    await expect(numbers).toContainText('2 out, 1 draft, 1 scheduled, 1 unpublished');
    await expect(numbers).toContainText('2 chapters out');
    await expect(numbers).toContainText('All time');
    await expect(numbers).toContainText('No last chapter yet');
    // Marking chapter 2 as the last one names it under Status and on its row (CALM-6).
    runSql(`update public.chapters set is_last = true where code = 'mgpub002';`);
    await page.reload();
    await expect(numbers).toContainText('Chapter 2 is the last');
    expect(await metaLine(chapterRows(page).nth(1))).toContain('the last chapter');
    // Chapter titles carry their number, which follows the reading order.
    await expect(
      chapterList(page).getByRole('link', { name: 'Chapter 2: Vântul de miercuri' }),
    ).toBeVisible();
  });

  test('on a phone, Earlier and Later sit in More and move the chapter', async ({ browser }) => {
    const page = await openManageChapters(browser, { width: 390, height: 900 });
    // Under 600 px the round arrows are hidden (story 5.3); More holds them instead.
    await expect(page.getByRole('button', { name: 'Move chapter 3 earlier' })).toBeHidden();
    await pickFromMore(page, 3, 'Earlier');
    await expect.poll(chapterOrder).toBe('mgpub001,mgdraft1,mgpub002,mgsched1,mgunpub1');
    // Chapter 1 has nowhere earlier to go, so its More offers only Later.
    await page.getByRole('button', { name: 'More for chapter 1' }).click();
    await expect(page.getByRole('menuitem', { name: 'Earlier', exact: true })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Later', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('More opens Preview and Schedule in the editor, and Copy link says it worked', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // Preview and Schedule are links to the editor, which reads ?preview and ?publish=later.
    await page.getByRole('button', { name: 'More for chapter 3' }).click();
    await expect(page.getByRole('menuitem', { name: 'Preview', exact: true })).toHaveAttribute(
      'href',
      `/write/s/${slug}/c/mgdraft1?preview`,
    );
    await expect(page.getByRole('menuitem', { name: 'Schedule', exact: true })).toHaveAttribute(
      'href',
      `/write/s/${slug}/c/mgdraft1?publish=later`,
    );
    await page.keyboard.press('Escape');
    // A scheduled chapter's item says what it does to a chapter that already has a time.
    await page.getByRole('button', { name: 'More for chapter 4' }).click();
    await expect(
      page.getByRole('menuitem', { name: 'Change the schedule', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    // Copy link is only for a chapter readers can open.
    await pickFromMore(page, 1, 'Copy link');
    await expect(chapterRows(page).nth(0).getByRole('status')).toHaveText(
      'Link to chapter 1 copied.',
    );
  });

  test('a long story opens on its newest six chapters, and shows the rest on request', async ({
    browser,
  }) => {
    for (let position = 7; position <= 12; position += 1) {
      insertChapter({
        code: `'mglong${String(position).padStart(2, '0')}'`,
        position: String(position),
        draft_title: `'Capitolul ${position}'`,
      });
    }
    const page = await openManageChapters(browser);
    await expect(chapterRows(page)).toHaveCount(6);
    await expect(chapterRows(page).nth(0)).toContainText('Chapter 6: Capitolul 7');
    await page.getByRole('button', { name: 'Show chapters 1 to 5' }).click();
    await expect(chapterRows(page)).toHaveCount(11);
    await expect(page.getByRole('button', { name: /^Show chapters/ })).toHaveCount(0);
  });

  test('Rename: a published chapter’s new title reaches readers at once', async ({ browser }) => {
    const page = await openManageChapters(browser);
    const firstRow = chapterRows(page).first();
    await pickFromMore(page, 1, 'Rename');
    const field = page.getByRole('textbox', { name: 'New title for chapter 1' });
    await expect(field).toBeFocused();
    await field.fill('Caietele bunicii, partea întâi');
    await firstRow.getByRole('button', { name: 'Save' }).click();
    await expect(
      firstRow.getByRole('link', { name: 'Caietele bunicii, partea întâi' }),
    ).toBeVisible();
    // Focus goes back to "…", where Rename was.
    await expect(page.getByRole('button', { name: 'More for chapter 1' })).toBeFocused();
    expect(await readerTitles(browser)).toEqual([
      'Caietele bunicii, partea întâi',
      'Vântul de miercuri',
    ]);
  });

  test('Unpublish and Publish again from the list', async ({ browser }) => {
    const page = await openManageChapters(browser);
    const firstRow = chapterRows(page).first();
    await pickFromMore(page, 1, 'Unpublish');
    await expect(firstRow).toContainText('Unpublished');
    expect(await readerTitles(browser)).toEqual(['Vântul de miercuri']);

    await page.goto(address);
    const unpublishedRow = chapterRows(page).nth(4);
    await pickFromMore(page, 5, 'Publish again');
    await expect(unpublishedRow).toContainText('Published');
    await expect
      .poll(() => runSql(`select status from public.chapters where code = 'mgunpub1'`))
      .toBe('published');
  });

  test('Delete asks first, hides the chapter at once, and Restore brings it back at the end', async ({
    browser,
  }) => {
    const page = await openManageChapters(browser);
    await pickFromMore(page, 1, 'Delete');
    const dialog = page.getByRole('alertdialog', { name: 'Delete “Caietele bunicii”?' });
    await expect(dialog).toContainText('delete it for good after 30 days');
    await expect(dialog.getByRole('button', { name: 'Keep chapter' })).toBeFocused();

    // "Keep chapter" (and Escape) change nothing.
    await dialog.getByRole('button', { name: 'Keep chapter' }).click();
    await expect(dialog).toBeHidden();
    expect(chapterOrder()).toBe('mgpub001,mgpub002,mgdraft1,mgsched1,mgunpub1');

    await pickFromMore(page, 1, 'Delete');
    await dialog.getByRole('button', { name: 'Delete chapter' }).click();
    await expect.poll(chapterOrder).toBe('mgpub002,mgdraft1,mgsched1,mgunpub1');
    const deleted = page.getByRole('region', { name: 'Recently deleted' });
    await expect(deleted).toContainText('Caietele bunicii');
    await expect(deleted).toContainText('30 days left');
    expect(
      runSql(
        `select (deleted_at > now() - interval '1 minute')::text from public.chapters where code = 'mgpub001'`,
      ),
    ).toBe('true');

    expect(await readerTitles(browser)).toEqual(['Vântul de miercuri']);

    await deleted.getByRole('button', { name: 'Restore “Caietele bunicii”' }).click();
    await expect.poll(chapterOrder).toBe('mgpub002,mgdraft1,mgsched1,mgunpub1,mgpub001');
    await expect(chapterRows(page)).toHaveCount(5);
    expect(await readerTitles(browser)).toEqual(['Vântul de miercuri', 'Caietele bunicii']);
  });
});
