/**
 * Publishing, updating, unpublishing and scheduling chapters in a real browser (story S1-E3-03).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - Preview shows the chapter as readers will see it; "Publish chapter" puts it live: the pill
 *   says Published, a signed-out visitor gets the story page with the chapter in the list, and a
 *   chapter_published job is queued (nothing is sent: S1-E7-01);
 * - edits after publishing save as a draft; readers see them only after "Update chapter", with an
 *   "Edited" date (Q10);
 * - "Unpublish chapter" takes it away from readers (the story is private again);
 * - the dialog (board D06) names the chapter and has "Tell followers", on by default;
 * - "When to publish" › Later takes the time on the writer's own clock (a browser in Stockholm here;
 *   CALM-8b, Robert, 20 Nov 2026, 18:19 UTC) and shows "Scheduled for …, local time.";
 *   "Cancel schedule" undoes it; a time in the past is refused; when its time comes (the job, run here directly) it is published;
 * - the panel's states and the story page's chapter list pass axe at 390 and 1440 px.
 * Test data: chapters made in SQL on the seed story "Stația meteo"; deleted after.
 */
import AxeBuilder from '@axe-core/playwright';
import { type Browser, type Locator, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';
import { editorSaveStatus, openPublishSheet } from './support/chapterEditor';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const writerId = '00000000-0000-4000-8000-000000000001';

/** Removes this spec's chapters and jobs and puts the writer's language back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  runSql(`delete from public.jobs where kind = 'chapter_published';`);
  runSql(
    `update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';`,
  );
  runSql(`update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** A draft chapter with a title and some text, as the editor would leave it. */
function makeDraft(code: string) {
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
    values ('${storyId}', '${writerId}', '${code}', 1, 'Caietele bunicii',
      'Bunica mea **notează** vremea în fiecare dimineață.', 7);`);
}

/**
 * Opens the editor on a chapter as adult_writer, in English, with the Publish sheet open unless
 * the test types in the text first (the sheet is modal).
 */
async function openEditor(
  browser: Browser,
  code: string,
  options: { timezoneId?: string; withSheet?: boolean } = {},
): Promise<Page> {
  const { timezoneId, withSheet = true } = options;
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  // A browser in a given time zone, when the test needs one (scheduling is on the writer's clock).
  const context = await browser.newContext({ timezoneId });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(`/write/s/${slug}/c/${code}`);
  await expect(page.getByRole('textbox', { name: 'Chapter text' })).toBeVisible();
  if (withSheet) await openPublishSheet(page);
  return page;
}

/** The Publish panel: a sheet the editor's bar opens since board D05 (user story 5.5). */
function publishPanel(page: Page) {
  return page.getByRole('dialog', { name: 'Publish chapter', exact: true });
}

/** "When to publish" › Later: the segment's radio is hidden, so the click goes to its words. */
async function pickLater(panel: Locator) {
  await panel
    .getByRole('group', { name: 'When to publish' })
    .getByText('Later', { exact: true })
    .click();
}

/** axe on the page as it is now, at two widths. */
async function expectAccessibleAt(page: Page, widths: number[]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    // Measure from the top of the page. After a resize the browser keeps whatever was on screen
    // in view (scroll anchoring), so the scroll position would depend on the width before; at some
    // positions the floating Back button sits over a control by design, which says nothing about
    // the layout (GLASS-3: the glass boxes changed which element the browser anchors to).
    await page.evaluate(() => window.scrollTo(0, 0));
    // axe measures colours as they are, so let every entrance animation finish first.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== 'running'),
    );
    // Reduce motion ends every animation at once, so axe measures the colours the screen
    // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
}

test.describe('publish, update, unpublish and schedule (S1-E3-03)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('Preview, then Publish: readers get the story with the chapter, and a job is queued', async ({
    browser,
    page: visitor,
  }) => {
    makeDraft('publish1');
    const page = await openEditor(browser, 'publish1');
    await expectAccessibleAt(page, [390, 1440]);

    // Board D06: the dialog names the chapter and says how many followers hear.
    await expect(publishPanel(page).getByText(/^Chapter \d+ · Caietele bunicii$/)).toBeVisible();
    const tellSwitch = publishPanel(page).getByRole('switch', { name: 'Tell followers' });
    await expect(tellSwitch).toBeChecked();
    // The number comes from the database (chapter_followers_to_tell()), read through the API.
    await expect(tellSwitch).toHaveAccessibleDescription(
      /^(\d[\d,]* followers? gets? a notification when it goes out\.|No followers yet, so nobody gets a notification\.)$/,
    );
    // From 1024 px Preview is in the editor's bar, not the dialog (board D06).
    await page.keyboard.press('Escape');
    await page
      .getByRole('navigation', { name: 'Chapter editor' })
      .getByRole('button', { name: 'Preview', exact: true })
      .filter({ visible: true })
      .click();
    const preview = page.getByRole('dialog', { name: 'Preview' });
    await expect(preview.getByRole('heading', { name: 'Caietele bunicii' })).toBeVisible();
    await expect(preview.locator('strong')).toHaveText('notează');
    await preview.getByRole('button', { name: 'Close' }).click();
    await openPublishSheet(page);

    await publishPanel(page)
      .getByRole('button', { name: /^Publish chapter \d+$/ })
      .click();
    await expect(publishPanel(page).getByText(/^Published /)).toBeVisible();
    await expect(
      page.getByRole('navigation').getByText('Published', { exact: true }),
    ).toBeVisible();
    await expect(
      publishPanel(page).getByRole('button', { name: 'Unpublish chapter' }),
    ).toBeEnabled();
    expect(runSql(`select count(*) from public.jobs where kind = 'chapter_published'`)).toBe('1');
    await expectAccessibleAt(page, [390, 1440]);

    await visitor.goto(`/s/${slug}`);
    const chapters = visitor.getByRole('region', { name: /capitol|chapter/i });
    await expect(chapters.getByText('Caietele bunicii')).toBeVisible();
    await expectAccessibleAt(visitor, [390, 1440]);
  });

  test('edits reach readers only after "Update chapter", with an Edited date', async ({
    browser,
    page: visitor,
  }) => {
    const page = await openEditor(browser, 'publish1', { withSheet: false });
    await page.getByRole('textbox', { name: 'Chapter title' }).fill('Caietele bunicii (2)');
    await page.getByRole('textbox', { name: 'Chapter text' }).click();
    await expect(editorSaveStatus(page)).toHaveText(/Saved at \d/);

    await visitor.goto(`/s/${slug}`);
    // The story page's chapter list numbers each title ("1. Caietele bunicii", board B01), so the
    // check reads the title in that list: the published title, not the saved draft's.
    const chapterTitle = visitor
      .getByRole('region', { name: /capitol|chapter/i })
      .locator('[data-chapter-title]');
    await expect(chapterTitle).toHaveText(/^\d+\. Caietele bunicii$/);

    await openPublishSheet(page);
    await publishPanel(page).getByRole('button', { name: 'Update chapter' }).click();
    await expect
      .poll(() => runSql(`select published_title from public.chapters where code = 'publish1'`))
      .toBe('Caietele bunicii (2)');
    await visitor.reload();
    await expect(chapterTitle).toHaveText(/^\d+\. Caietele bunicii \(2\)$/);
    await expect(visitor.getByText(/Modificat|Edited/)).toBeVisible();
  });

  test('Unpublish takes the chapter, and the story, away from readers', async ({
    browser,
    page: visitor,
  }) => {
    const page = await openEditor(browser, 'publish1');
    await publishPanel(page).getByRole('button', { name: 'Unpublish chapter' }).click();
    await expect(
      publishPanel(page).getByRole('button', { name: /^Publish chapter \d+$/ }),
    ).toBeVisible();
    await expect(page.getByRole('navigation').getByText('Draft', { exact: true })).toBeVisible();
    await visitor.goto(`/s/${slug}`);
    await expect(
      visitor.getByRole('heading', { name: /nu este disponibilă|isn’t available/ }),
    ).toBeVisible();
  });

  test('Schedule on the writer’s own clock, cancel, refuse the past, and publish when the time comes', async ({
    browser,
  }) => {
    const page = await openEditor(browser, 'publish1', { timezoneId: 'Europe/Stockholm' });
    const panel = publishPanel(page);
    await pickLater(panel);
    await expect(panel.getByText('It goes live within 5 minutes of this time.')).toBeVisible();

    // A date in the past is refused.
    await panel.getByLabel('Day', { exact: true }).fill('2020-01-01');
    await panel.getByRole('button', { name: 'Schedule chapter' }).click();
    await expect(panel.getByRole('alert')).toHaveText(
      'Pick a date and time in the future, at most a year ahead.',
    );

    // 1 January next year at 09:30 on the writer's clock in Stockholm (UTC+1 in winter).
    const nextYear = new Date().getUTCFullYear() + 1;
    await panel.getByLabel('Day', { exact: true }).fill(`${nextYear}-01-01`);
    await panel.getByLabel('Time, your local time').fill('09:30');
    await panel.getByRole('button', { name: 'Schedule chapter' }).click();
    await expect(panel.getByText(/^Scheduled for .*1 January.*09:30, local time\.$/)).toBeVisible();
    expect(
      runSql(
        `select to_char(scheduled_for at time zone 'UTC', 'YYYY-MM-DD HH24:MI') from public.chapters where code = 'publish1'`,
      ),
    ).toBe(`${nextYear}-01-01 08:30`);
    await expectAccessibleAt(page, [390, 1440]);

    await panel.getByRole('button', { name: 'Cancel schedule' }).click();
    await expect(panel.getByRole('button', { name: /^Publish chapter \d+$/ })).toBeVisible();

    // Schedule again, then let its time come and run the every-minute job.
    await pickLater(panel);
    await panel.getByRole('button', { name: 'Schedule chapter' }).click();
    await expect(panel.getByText(/^Scheduled for /)).toBeVisible();
    runSql(
      `update public.chapters set scheduled_for = now() - interval '1 second' where code = 'publish1';`,
    );
    expect(runSql('select public.publish_due_chapters()')).toBe('1');
    await page.reload();
    await openPublishSheet(page);
    await expect(publishPanel(page).getByText(/^Published /)).toBeVisible();
  });
});
