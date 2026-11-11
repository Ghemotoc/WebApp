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
 * - "Schedule for later" in Romania time shows "Scheduled for …"; "Cancel schedule" undoes it; a
 *   time in the past is refused; when its time comes (the job, run here directly) it is published;
 * - the panel's states and the story page's chapter list pass axe at 390 and 1440 px.
 * Test data: chapters made in SQL on the seed story "Stația meteo"; deleted after.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

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

/** Opens the editor on a chapter as adult_writer, in English. */
async function openEditor(browser: Browser, code: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(`/write/s/${slug}/c/${code}`);
  await expect(page.getByRole('textbox', { name: 'Chapter text' })).toBeVisible();
  return page;
}

/** The Publish panel. */
function publishPanel(page: Page) {
  return page.getByRole('region', { name: 'Publish' });
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

    await publishPanel(page).getByRole('button', { name: 'Preview' }).click();
    const preview = page.getByRole('dialog', { name: 'Preview' });
    await expect(preview.getByRole('heading', { name: 'Caietele bunicii' })).toBeVisible();
    await expect(preview.locator('strong')).toHaveText('notează');
    await preview.getByRole('button', { name: 'Close' }).click();

    await publishPanel(page).getByRole('button', { name: 'Publish chapter', exact: true }).click();
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
    const chapters = visitor.getByRole('region', { name: /Capitole|Chapters/ });
    await expect(chapters.getByText('Caietele bunicii')).toBeVisible();
    await expectAccessibleAt(visitor, [390, 1440]);
  });

  test('edits reach readers only after "Update chapter", with an Edited date', async ({
    browser,
    page: visitor,
  }) => {
    const page = await openEditor(browser, 'publish1');
    await page.getByRole('textbox', { name: 'Chapter title' }).fill('Caietele bunicii (2)');
    await page.getByRole('textbox', { name: 'Chapter text' }).click();
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      /Saved at \d/,
    );

    await visitor.goto(`/s/${slug}`);
    await expect(visitor.getByText('Caietele bunicii', { exact: true })).toBeVisible();

    await publishPanel(page).getByRole('button', { name: 'Update chapter' }).click();
    await expect
      .poll(() => runSql(`select published_title from public.chapters where code = 'publish1'`))
      .toBe('Caietele bunicii (2)');
    await visitor.reload();
    await expect(visitor.getByText('Caietele bunicii (2)', { exact: true })).toBeVisible();
    await expect(visitor.getByText(/Modificat|Edited/)).toBeVisible();
  });

  test('Unpublish takes the chapter, and the story, away from readers', async ({
    browser,
    page: visitor,
  }) => {
    const page = await openEditor(browser, 'publish1');
    await publishPanel(page).getByRole('button', { name: 'Unpublish chapter' }).click();
    await expect(
      publishPanel(page).getByRole('button', { name: 'Publish chapter', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('navigation').getByText('Draft', { exact: true })).toBeVisible();
    await visitor.goto(`/s/${slug}`);
    await expect(
      visitor.getByRole('heading', { name: /nu este disponibilă|isn’t available/ }),
    ).toBeVisible();
  });

  test('Schedule in Romania time, cancel, refuse the past, and publish when the time comes', async ({
    browser,
  }) => {
    const page = await openEditor(browser, 'publish1');
    const panel = publishPanel(page);
    await panel.getByRole('radio', { name: 'Schedule for later' }).check();
    await expect(
      panel.getByText('Romania time (Europe/Bucharest).', { exact: false }),
    ).toBeVisible();

    // A date in the past is refused.
    await panel.getByLabel('Date').fill('2020-01-01');
    await panel.getByRole('button', { name: 'Schedule chapter' }).click();
    await expect(panel.getByRole('alert')).toHaveText(
      'Pick a date and time in the future, at most a year ahead.',
    );

    // Tomorrow-ish: 1 January next year at 09:30 Romania time (UTC+2 in winter).
    const nextYear = new Date().getUTCFullYear() + 1;
    await panel.getByLabel('Date').fill(`${nextYear}-01-01`);
    await panel.getByLabel('Time').fill('09:30');
    await panel.getByRole('button', { name: 'Schedule chapter' }).click();
    await expect(
      panel.getByText(/^Scheduled for .*1 January.*09:30, Romania time\.$/),
    ).toBeVisible();
    expect(
      runSql(
        `select to_char(scheduled_for at time zone 'UTC', 'YYYY-MM-DD HH24:MI') from public.chapters where code = 'publish1'`,
      ),
    ).toBe(`${nextYear}-01-01 07:30`);
    await expectAccessibleAt(page, [390, 1440]);

    await panel.getByRole('button', { name: 'Cancel schedule' }).click();
    await expect(panel.getByRole('button', { name: 'Publish chapter', exact: true })).toBeVisible();

    // Schedule again, then let its time come and run the every-minute job.
    await panel.getByRole('radio', { name: 'Schedule for later' }).check();
    await panel.getByRole('button', { name: 'Schedule chapter' }).click();
    await expect(panel.getByText(/^Scheduled for /)).toBeVisible();
    runSql(
      `update public.chapters set scheduled_for = now() - interval '1 second' where code = 'publish1';`,
    );
    expect(runSql('select public.publish_due_chapters()')).toBe('1');
    await page.reload();
    await expect(publishPanel(page).getByText(/^Published /)).toBeVisible();
  });
});
