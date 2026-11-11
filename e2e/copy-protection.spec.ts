/**
 * Right-click and copy off for chapters on the web (story S1-E4-06a; decided 16 Oct 2026, Q35;
 * wording Q9).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - selecting chapter text and pressing Ctrl+C leaves the clipboard as it was; right-click on
 *   the text opens no menu; the chapter title and the rest of the page still copy;
 * - readers can still select the text, and it is still in the accessibility tree for screen
 *   readers (only the copy is stopped, never the reading);
 * - the notice under the chapter says copying is made harder and screenshots still work, with
 *   the writer's pen name; axe finds nothing serious with it at 390 and 1440 px;
 * - a writer reaching Publish reads that signed-in readers read in the browser until the apps
 *   exist, that copying is made harder and that screenshots still work.
 * Test data: one published and one draft chapter on adult_writer's seed story; removed after.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/copyoff1';

/** The personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teacher: '00000000-0000-4000-8000-000000000007',
};

/** Removes this spec's chapters and puts the personas' language back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  const ids = Object.values(personaIds).map((id) => `'${id}'`);
  runSql(`update public.profiles set locale = 'ro' where id in (${ids.join(', ')});`);
}

/** A published chapter to read and a draft to publish. */
function seedChapters() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values
      ('${storyId}', '${personaIds.adult_writer}', 'copyoff1', 1, 'Caietele bunicii', 'x', 8,
        'published', 'Caietele bunicii', 'Bunica mea notează vremea în fiecare dimineață.', 8, now()),
      ('${storyId}', '${personaIds.adult_writer}', 'copyoff2', 2, 'Vântul de miercuri',
        'Vântul se întoarce.', 3, 'draft', null, null, null, null);`);
}

/** Opens a page in English as a persona, allowed to use the clipboard. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, path: string) {
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona] ?? ''}';`);
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Selects all the text of the first element matching a selector, as a reader's drag would. */
async function selectTextOf(page: Page, selector: string) {
  await page.evaluate((target) => {
    const element = document.querySelector(target);
    if (element === null) throw new Error(`Nothing matches ${target}`);
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, selector);
}

/** What the clipboard holds now. */
function clipboardText(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

test.describe('copy protection on the web (S1-E4-06a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(seedChapters);
  test.afterAll(cleanUp);

  test('the chapter text doesn’t copy or open a menu; the title and the page still copy', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'teacher', chapterAddress);
    const paragraph = page.locator('.tmc-chapter-text p').first();
    await expect(paragraph).toBeVisible();
    await page.evaluate(() => navigator.clipboard.writeText('before'));

    // Ctrl+C on selected chapter text: the clipboard keeps what it had.
    await selectTextOf(page, '.tmc-chapter-text p');
    expect(await page.evaluate(() => window.getSelection()?.toString())).toContain('Bunica');
    await page.keyboard.press('Control+C');
    expect(await clipboardText(page)).toBe('before');

    // Right-click on the text: the browser's menu is stopped.
    const menuStopped = await paragraph.evaluate((element) => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(menuStopped).toBe(true);

    // The title is outside the protected text: it copies as usual.
    await selectTextOf(page, 'h1');
    await page.keyboard.press('Control+C');
    expect(await clipboardText(page)).toBe('Caietele bunicii');
  });

  test('the text stays readable by screen readers, with the honest notice', async ({ browser }) => {
    const page = await openAsPersona(browser, 'teacher', chapterAddress);
    await expect(page.locator('article')).toMatchAriaSnapshot(
      '- paragraph: Bunica mea notează vremea în fiecare dimineață.',
    );
    await expect(
      page.getByText(
        'On the web, right-click and copying are turned off for chapters. That makes copying harder, but it can’t stop screenshots. Lia Scrie keeps all the rights to this story.',
      ),
    ).toBeVisible();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
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
    }
  });

  test('a writer reaching Publish is told readers are on the web and screenshots still work', async ({
    browser,
  }) => {
    const page = await openAsPersona(
      browser,
      'adult_writer',
      '/write/s/statia-meteo-seed01/c/copyoff2',
    );
    await expect(
      page
        .getByRole('region', { name: 'Publish' })
        .getByText(
          'Signed-in readers can read this chapter in the browser until the apps exist. Copying is made harder; screenshots still work on the web.',
        ),
    ).toBeVisible();
  });
});
