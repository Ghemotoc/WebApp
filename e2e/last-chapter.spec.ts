/**
 * The last chapter in a real browser (bundle CALM-6; design handover "The last chapter";
 * Robert's decision card "A switch when publishing", 20 Nov 2026, 12:43 UTC).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the Publish panel's "This is the last chapter" switch publishes the chapter as the last;
 * - the reader then says "Chapter 1 of 1" and "That's the end of the story.", and the story page
 *   says Completed;
 * - the panel with the switch, and the reader, pass axe at 390 and 1440 px.
 * Test data: one chapter made in SQL on the seed story "Stația meteo"; deleted after, and the
 * story set back to Ongoing.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const writerId = '00000000-0000-4000-8000-000000000001';

/** Removes this spec's chapter and jobs, and puts the story and the writer back as they were. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  runSql(`delete from public.jobs where kind = 'chapter_published';`);
  runSql(`update public.stories set completion_status = 'ongoing', first_published_at = null,
    last_chapter_published_at = null where id = '${storyId}';`);
  runSql(`update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** Opens the editor on the chapter as adult_writer, in English. */
async function openEditor(browser: Browser): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(`/write/s/${slug}/c/lastch01`);
  await expect(page.getByRole('textbox', { name: 'Chapter text' })).toBeVisible();
  return page;
}

/** axe on the page as it is now, at each width, with no sideways scroll (as in publish.spec.ts). */
async function expectAccessibleAt(page: Page, widths: number[]) {
  // Reduce motion ends every animation at once, so axe measures the colours the screen settles on.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
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

test.describe('the last chapter (CALM-6)', () => {
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('publishing as the last shows "of 1" to readers and completes the story', async ({
    browser,
  }) => {
    // Step 1: one draft chapter with words in it.
    runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
      values ('${storyId}', '${writerId}', 'lastch01', 1, 'Ultima zi', 'Bunica închide caietul.', 3);`);
    const page = await openEditor(browser);
    const panel = page.getByRole('region', { name: 'Publish' });

    // Step 2: the switch, then "Publish chapter 1".
    const lastSwitch = panel.getByRole('switch', { name: 'This is the last chapter' });
    await expect(lastSwitch).toHaveAttribute('aria-checked', 'false');
    await lastSwitch.click();
    await expect(lastSwitch).toHaveAttribute('aria-checked', 'true');
    await expectAccessibleAt(page, [390, 1440]);
    await panel.getByRole('button', { name: 'Publish chapter 1' }).click();
    await expect(panel.getByText('This is the last chapter.')).toBeVisible();
    expect(runSql(`select completion_status from public.stories where id = '${storyId}'`)).toBe(
      'completed',
    );

    // Step 3: the reader says where the story ends.
    await page.goto(`/s/${slug}/lastch01`);
    await expect(page.locator('header').getByText('Chapter 1 of 1', { exact: true })).toBeVisible();
    await expect(page.getByText('That’s the end of the story.')).toBeVisible();
    await expectAccessibleAt(page, [390, 1440]);

    // Step 4: the story page says Completed.
    await page.goto(`/s/${slug}`);
    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
  });
});
