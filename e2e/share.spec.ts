/**
 * Sharing a chapter and the quote-share card, in a real browser (stories S1-E4-05 and S1-E4-07;
 * board 3.6 Share).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - on a computer, Share copies the chapter's link and opens "Share this chapter"; on a phone it
 *   opens the system share sheet instead (S1-E4-05, first criterion);
 * - the link is the chapter's address with no query string: no sharer ID, no tracking code
 *   (second criterion);
 * - each share adds one to the chapter's daily total (third criterion);
 * - selecting up to 280 characters offers "Share quote", which makes a card with the passage and
 *   alt text written for the reader; a longer selection is told to shorten (S1-E4-07, first and
 *   fifth criteria); the palette colours can be picked (fourth criterion);
 * - a second card from the same chapter shows the "One quote card per chapter" pop-up (second);
 * - the writer's Quote cards switch in story settings hides "Share quote" (third);
 * - both dialogs pass axe at 390 px in ro and en and fit at 320 px.
 * Test data: adult_writer's story "Turnul cu ceas" with one chapter; blocked reads it (no other
 *   reader spec signs in as blocked). All removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const readerId = '00000000-0000-4000-8000-000000000016';
const storySlug = 'share-e2e';
const chapterCode = 'impart01';
const chapterPath = `/s/${storySlug}/${chapterCode}`;
const shortParagraph = 'Ceasul din turn bătea de treisprezece ori în fiecare joi.';
const longParagraph = `${'Nimeni din oraș nu știa cine urca scările turnului noaptea. '.repeat(6)}Până într-o zi.`;

/** Removes the spec's story, its shares, cards and the reader's rate-limit events. */
function cleanUp() {
  runSql(`delete from public.quote_cards where user_id = '${readerId}';
    delete from public.rate_limit_events where user_id = '${readerId}';
    delete from public.chapters where code = '${chapterCode}';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle in ('blocked', 'adult_writer');`);
}

/** The story with one published chapter: a short paragraph and one over 280 characters. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}', 'Turnul cu ceas', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, '${chapterCode}', 1, 'Capitol', 'x', 80, 'published', 'Treisprezece',
      '${shortParagraph}\n\n${longParagraph}', 80, now()
    from public.stories where slug = '${storySlug}';`);
}

/** Today's share total for the chapter. */
function sharesToday(): string {
  return runSql(`select coalesce(sum(total), 0) from public.chapter_shares
    where chapter_id = (select id from public.chapters where code = '${chapterCode}');`).trim();
}

/** Opens a page as a persona in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  path: string,
  options: { language?: 'en' | 'ro'; context?: BrowserContextOptions } = {},
): Promise<Page> {
  const language = options.language ?? 'en';
  runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
  const context = await browser.newContext(options.context);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Opens the chapter as the reader, once it has asked whether quote cards are allowed. */
async function openChapter(browser: Browser, options: Parameters<typeof openAs>[3] = {}) {
  const page = await openAs(browser, 'blocked', chapterPath, {
    ...options,
    context: { permissions: ['clipboard-read', 'clipboard-write'], ...options.context },
  });
  await expect(page.getByRole('heading', { level: 1, name: 'Treisprezece' })).toBeVisible();
  return page;
}

/** Selects one paragraph of the chapter text, as a reader dragging over it would. */
async function selectParagraph(page: Page, index: number) {
  await page.evaluate((paragraphIndex) => {
    const paragraph = document.querySelectorAll('[data-protected-text] p')[paragraphIndex];
    if (paragraph === undefined) throw new Error('No such paragraph.');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }, index);
}

/** Runs axe and checks nothing scrolls sideways at 320 px. */
async function checkAccessible(page: Page) {
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
}

test.describe('share a chapter and the quote card (S1-E4-05, S1-E4-07)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('on a computer, Share copies a clean link, opens the dialog and counts the share', async ({
    browser,
  }) => {
    const page = await openChapter(browser);
    const button = page.getByRole('button', { name: 'Share chapter 1' });
    await button.click();
    const dialog = page.getByRole('dialog', { name: 'Share this chapter' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('status')).toHaveText('Link copied.');
    const link = await dialog.getByLabel('Link').inputValue();
    expect(link).toMatch(new RegExp(`/s/${storySlug}/${chapterCode}$`));
    expect(new URL(link).search).toBe('');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
    await expect(dialog).toContainText('doesn’t include your name or any tracking code');
    await expect.poll(sharesToday).toBe('1');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('on a phone, Share opens the system share sheet with the same link', async ({ browser }) => {
    const page = await openAs(browser, 'blocked', chapterPath, {
      context: { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } },
    });
    await page.evaluate(() => {
      // A stand-in for the phone's share sheet, which a test browser doesn't have.
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: ShareData) => {
          (window as unknown as { sharedUrl: string }).sharedUrl = data.url ?? '';
          return Promise.resolve();
        },
      });
    });
    await page.getByRole('button', { name: 'Share chapter 1' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { sharedUrl?: string }).sharedUrl))
      .toMatch(new RegExp(`/s/${storySlug}/${chapterCode}$`));
    await expect(page.getByRole('dialog', { name: 'Share this chapter' })).toHaveCount(0);
    await expect.poll(sharesToday).toBe('2');
  });

  test('a selected passage becomes a quote card, once per chapter', async ({ browser }) => {
    const page = await openChapter(browser);
    await selectParagraph(page, 0);
    await page.getByRole('button', { name: 'Share quote' }).click();
    const dialog = page.getByRole('dialog', { name: 'Your quote card' });
    await expect(dialog).toContainText(`${Array.from(shortParagraph).length} of 280 characters`);
    await expect(dialog.getByLabel('Alt text for the image')).toHaveValue(
      `A quote card from Turnul cu ceas by Lia Scrie: “${shortParagraph}”`,
    );
    await expect(dialog.getByRole('img')).toHaveAccessibleName(/^A quote card from Turnul cu ceas/);
    await dialog.getByRole('button', { name: 'Gold' }).click();
    await expect(dialog.getByRole('button', { name: 'Gold' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(dialog.getByRole('button', { name: 'Purple' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Save image' }).click();
    expect((await download).suggestedFilename()).toBe('quote-card.png');
    await expect(dialog.getByRole('status')).toHaveText('Image saved.');
    expect(
      runSql(`select count(*) from public.quote_cards where user_id = '${readerId}';`).trim(),
    ).toBe('1');
    await expect.poll(sharesToday).toBe('3');
    await page.keyboard.press('Escape');
    // A second card from the same chapter: the limit pop-up (Q17).
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Treisprezece' })).toBeVisible();
    await selectParagraph(page, 0);
    await page.getByRole('button', { name: 'Share quote' }).click();
    const limit = page.getByRole('alertdialog', { name: 'One quote card per chapter' });
    await expect(limit).toContainText('can’t be shared bit by bit');
    await limit.getByRole('button', { name: 'Copy the link instead' }).click();
    await expect(limit.getByRole('status')).toHaveText('Link copied.');
  });

  test('a passage over 280 characters is told to shorten', async ({ browser }) => {
    const page = await openChapter(browser);
    await selectParagraph(page, 1);
    await expect(page.getByText('Select 280 characters or fewer to share a quote.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share quote' })).toHaveCount(0);
  });

  test('axe: the share dialog and the quote card at 390 px in ro and en', async ({ browser }) => {
    runSql(`delete from public.quote_cards where user_id = '${readerId}';`);
    for (const language of ['ro', 'en'] as const) {
      const page = await openChapter(browser, {
        language,
        context: { viewport: { width: 390, height: 900 } },
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page
        .getByRole('button', {
          name: language === 'ro' ? 'Distribuie capitolul 1' : 'Share chapter 1',
        })
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await checkAccessible(page);
      await page.keyboard.press('Escape');
      await page.setViewportSize({ width: 390, height: 900 });
      await selectParagraph(page, 0);
      await page
        .getByRole('button', { name: language === 'ro' ? 'Distribuie citatul' : 'Share quote' })
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await checkAccessible(page);
      await page.context().close();
    }
  });

  test('the writer switches quote cards off, and Share quote no longer appears', async ({
    browser,
  }) => {
    const writer = await openAs(browser, 'adult_writer', `/write/s/${storySlug}/settings`);
    const quoteSwitch = writer.getByRole('switch', { name: 'Quote cards' });
    await expect(quoteSwitch).toHaveAttribute('aria-checked', 'true');
    await quoteSwitch.click();
    await expect(quoteSwitch).toHaveAttribute('aria-checked', 'false');
    await writer.getByRole('button', { name: 'Save changes' }).click();
    await expect(writer.getByText('Saved.')).toBeVisible();
    expect(
      runSql(`select quote_cards_enabled from public.stories where slug = '${storySlug}';`).trim(),
    ).toBe('f');
    // The reader: once the page has asked (network idle) and two frames have passed after the
    // selection (the bar reads it on the next frame), no Share quote appears.
    const page = await openChapter(browser);
    await page.waitForLoadState('networkidle');
    await selectParagraph(page, 0);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect(page.getByRole('button', { name: 'Share quote' })).toHaveCount(0);
    // Sharing the link still works.
    await expect(page.getByRole('button', { name: 'Share chapter 1' })).toBeVisible();
  });
});
