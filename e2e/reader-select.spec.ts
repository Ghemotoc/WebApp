/**
 * Comments on chosen words in a real browser (READER-SELECT; boards B12, B13 and B14; Robert's
 * picks of 24 Nov 2026: "Select any text, then Comment", and option A, one panel per stanza).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a reader selects two lines of a stanza with the mouse; a Comment pill appears above them;
 *   pressing it opens the stanza's panel at those words ("Commenting on …", "Comment on this
 *   part") and the comment posts on them;
 * - the words are then underlined, and the margin count is the stanza's total; the part has a
 *   button for keyboards and screen readers ("1 comment on: …") that opens the panel at its
 *   group, tinted, under the whole stanza's comments;
 * - Choose lines ticks lines with the keyboard and posts on them; "Whole stanza instead" goes
 *   back to the whole stanza;
 * - over 1,000 characters the pill turns grey and reads "Select less to comment";
 * - the pill goes when the selection goes, and the chapter's title gets none;
 * - on a touch screen the bar at the foot shows the words and a Comment button;
 * - the open panel at a part passes axe and doesn't scroll sideways at 390, 768 and 1440 px,
 *   by day and at night.
 * Test data: one published poem on adult_writer's "Stația meteo"; its comments go with it.
 */
import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test';

import { THEME_STORAGE_KEY } from '../src/lib/theme';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
const code = 'rsel0001';
const chapterAddress = `/s/statia-meteo-seed01/${code}`;

/** A long line for stanza 3, over the 1,000 characters a comment's words may have. */
const longLine = 'and the rain went on over the whole sleeping town '.repeat(22).trim();

/** The poem: three stanzas, lines on their own lines (MUST-2). */
const poem = [
  'My grandmother wakes before the kettle does\nand lets the radio talk to itself',
  'She cuts the bread against her chest,\nthe knife coming towards her heart\nthe way her mother taught her,\nand nobody ever bleeds.',
  longLine,
].join('\n\n');

/** Removes this spec's chapter (its comments go with it). */
function cleanUp() {
  runSql(`delete from public.comments where chapter_id in (select id from public.chapters where code like 'rsel%');
    delete from public.chapters where code like 'rsel%';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';`);
}

/** One published poem to comment on. */
function seedPoem() {
  cleanUp();
  const body = `'${poem.replaceAll('\n', "' || chr(10) || '")}'`;
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at,
      is_poem)
    values ('${storyId}', '${adultWriterId}', '${code}', 1, 'The kitchen at six', 'x', 60, 'published',
      'The kitchen at six', ${body}, 60, now(), true);
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/**
 * Opens the poem in English, as a persona, in a fresh browser context.
 *
 * @param browser - the test's browser
 * @param persona - who reads
 * @param options - the context's screen, touch and so on
 * @param theme - day or night
 * @returns the reader's page
 */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  options: BrowserContextOptions = {},
  theme: 'light' | 'night' = 'light',
): Promise<Page> {
  const context = await browser.newContext(options);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(
    ([languageKey, themeKey, themeValue]) => {
      localStorage.setItem(languageKey, 'en');
      localStorage.setItem(themeKey, themeValue);
    },
    [LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY, theme] as const,
  );
  const page = await context.newPage();
  await page.goto(chapterAddress);
  await expect(page.locator('p[data-block="2"]')).toBeVisible();
  // The markers come with the counts; the Comment button needs them too.
  await expect(page.locator('.tmc-paragraph-marker').first()).toBeAttached();
  return page;
}

/**
 * Selects lines of a stanza as a mouse would, then lets the mouse go.
 *
 * @param page - the reader
 * @param block - the stanza
 * @param first - the first line, from 0
 * @param last - the last line
 */
async function selectLines(page: Page, block: number, first: number, last: number) {
  await page.evaluate(
    ([stanza, from, to]) => {
      const lines = document.querySelectorAll(`p[data-block="${stanza}"] .tmc-poem-line`);
      const start = lines[from]?.firstChild;
      const end = lines[to]?.firstChild;
      if (!start || !end) throw new Error('line not found');
      const range = document.createRange();
      range.setStart(start, 0);
      range.setEnd(end, end.textContent?.length ?? 0);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    },
    [block, first, last] as const,
  );
}

/**
 * The comment marker beside one stanza.
 *
 * @param page - the reader
 * @param block - the stanza's number
 * @returns its button
 */
function markerOf(page: Page, block: number) {
  return page
    .locator('.tmc-paragraph-row', { has: page.locator(`p[data-block="${block}"]`) })
    .locator('.tmc-paragraph-marker');
}

test.describe('comments on chosen words (READER-SELECT)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedPoem);
  test.afterAll(cleanUp);

  test('teacher selects two lines, presses Comment and posts on them', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', { viewport: { width: 1440, height: 900 } });
    await selectLines(page, 2, 1, 2);
    const pill = page.locator('.tmc-select-pill');
    await expect(pill).toHaveText('Comment');
    await pill.click();
    // The stanza's panel opens at the words; the field says so and takes the focus.
    const panel = page.locator('[data-paragraph-thread]');
    await expect(
      panel.getByText(/^Commenting on “the knife coming towards her heart/),
    ).toBeVisible();
    const field = panel.getByRole('textbox', { name: 'Comment on this part' });
    await expect(field).toBeFocused();
    await field.fill('That knife line stops me every time.');
    await panel.getByRole('button', { name: 'Post comment' }).click();
    // The comment sits in its part's group, headed by the words.
    const group = panel.getByRole('group', { name: /^Comments on: the knife coming/ });
    await expect(group).toContainText('That knife line stops me every time.');
    await expect(
      group.getByRole('button', {
        name: 'Show these words in the text: the knife coming towards her heart / the way her mother taught her,',
      }),
    ).toBeVisible();
    await page.context().close();
  });

  test('the words are underlined, and the part button opens the panel at its group', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'pending_check', { viewport: { width: 1440, height: 900 } });
    // The margin count is the stanza's total; the part has no count of its own (board B13).
    await expect(markerOf(page, 2)).toHaveAccessibleName('1 comment on this paragraph');
    await expect.poll(() => page.evaluate(() => CSS.highlights.get('tmc-part')?.size ?? 0)).toBe(1);
    const partButton = page.getByRole('button', {
      name: /^1 comment on: the knife coming towards her heart \/ the…$/,
    });
    await partButton.focus();
    await expect(partButton).toBeVisible();
    await page.keyboard.press('Enter');
    const group = page.locator('.tmc-comment-group');
    await expect(group).toHaveClass(/tmc-comment-group--active/);
    await expect(page.getByRole('textbox', { name: 'Comment on this part' })).toBeVisible();
    // Whole stanza instead: the field is the stanza's again.
    await page.getByRole('button', { name: 'Whole stanza instead' }).click();
    await expect(page.getByRole('button', { name: 'Choose lines' })).toBeVisible();
    await page.context().close();
  });

  test('Choose lines ticks lines with the keyboard and posts on them', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', { viewport: { width: 1440, height: 900 } });
    await markerOf(page, 1).click();
    await page.getByRole('button', { name: 'Choose lines' }).click();
    const picker = page.getByRole('group', { name: 'Choose the lines' });
    await expect(picker.getByRole('checkbox')).toHaveCount(2);
    await picker.getByRole('checkbox', { name: 'and lets the radio talk to itself' }).focus();
    await page.keyboard.press('Space');
    await expect(
      page.getByText("Tab to a stanza's count, Enter, then Choose lines. Space ticks a line."),
    ).toBeVisible();
    // The stanza's panel holds this form; the chapter's own comment box can be on the page too (a
    // short chapter's comments load at once), so the click stays inside the panel.
    const panel = page.locator('[data-paragraph-thread]');
    const field = panel.getByRole('textbox', { name: 'Comment on these lines' });
    await field.fill('The radio talking to itself is perfect.');
    await panel.getByRole('button', { name: 'Post comment' }).click();
    await expect(
      page.getByRole('group', { name: 'Comments on: and lets the radio talk to itself' }),
    ).toContainText('The radio talking to itself is perfect.');
    await page.context().close();
  });

  test('over 1,000 characters the pill reads "Select less to comment"', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', { viewport: { width: 1440, height: 900 } });
    await selectLines(page, 3, 0, 0);
    const pill = page.locator('.tmc-select-pill');
    await expect(pill).toHaveText('Select less to comment');
    await expect(pill).toHaveAttribute('aria-disabled', 'true');
    // Pressing it does nothing (Playwright won't click an aria-disabled button, so send the click).
    await pill.dispatchEvent('click');
    await expect(page.locator('[data-paragraph-thread]')).toHaveCount(0);
    await page.context().close();
  });

  test('the pill goes when the selection goes, and never shows for the title', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', { viewport: { width: 1440, height: 900 } });
    const pill = page.locator('.tmc-select-pill');
    // Step 1: words in a stanza, then a click elsewhere clears the selection and the pill.
    await selectLines(page, 1, 0, 0);
    await expect(pill).toBeVisible();
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await expect(pill).toHaveCount(0);
    // Step 2: the chapter's title isn't the writer's text to comment on, so no pill.
    await page.evaluate(() => {
      const title = document.querySelector('h1');
      if (title === null) throw new Error('title not found');
      window.getSelection()?.selectAllChildren(title);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    await expect(pill).toHaveCount(0);
    await page.context().close();
  });

  test('on a phone the bar at the foot shows the words and Comment', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await page.evaluate(() => {
      const lines = document.querySelectorAll('p[data-block="2"] .tmc-poem-line');
      const range = document.createRange();
      range.selectNodeContents(lines[1] as Node);
      window.getSelection()?.addRange(range);
    });
    const bar = page.getByRole('region', { name: 'Comment on the chosen words' });
    await expect(bar).toContainText('“the knife coming towards her heart”');
    await bar.getByRole('button', { name: 'Comment' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Comment on this part' })).toBeVisible();
    await page.context().close();
  });

  for (const width of [390, 768, 1440]) {
    for (const theme of ['light', 'night'] as const) {
      test(`a panel open at a part passes axe at ${width} px, ${theme}`, async ({ browser }) => {
        const page = await openAs(
          browser,
          'pending_check',
          { viewport: { width, height: 900 } },
          theme,
        );
        const partButton = page.getByRole('button', { name: /^1 comment on: the knife/ });
        await partButton.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.tmc-comment-group--active')).toBeVisible();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const seriousIssues = results.violations.filter(
          (violation) => violation.impact === 'serious' || violation.impact === 'critical',
        );
        expect(seriousIssues).toEqual([]);
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(pageWidth).toBeLessThanOrEqual(width);
        await page.screenshot({
          path: `test-results/reader-select-${String(width)}-${theme}.png`,
          fullPage: false,
        });
        await page.context().close();
      });
    }
  }
});
