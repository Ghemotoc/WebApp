/**
 * Readers to writers, in a real browser (bundle IDEAS-1, part c; ideas IDEA-20261031-3, -10 and
 * -11, Robert's comments of 31 Oct 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI after every merge to main (Supabase started first).
 * What it proves:
 * - "I finished it" (idea 3): on a story on the reader's Finished shelf, "Tell the writer you
 *   finished it" sends one fixed notification and then reads "Sent", also after a reload; it
 *   isn't offered on another shelf or on one's own story; the writer's notification names the
 *   reader and the story and opens the story;
 * - sharing a whole story (idea 11): on a computer, Share copies the story page's clean link and
 *   opens "Share this story" with the chat preview (title, pen name, blurb); a 16+ story's preview
 *   shows only the title and the rating; on a phone it opens the system share sheet;
 * - the writer's card colour (idea 10): picked in the story's settings, the reader's new quote
 *   card starts in it, and the reader can still change it;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on the story page with both buttons,
 *   and on the share dialog and the settings page at 390 px.
 * Test data: adult_writer's story "Scrisoarea de la far" with one chapter, read by the teacher
 * persona. Everything is removed at the start and the end.
 */
import AxeBuilder from '@axe-core/playwright';
import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const readerId = '00000000-0000-4000-8000-000000000007';
const storySlug = 'readers-to-writers-e2e';
const chapterCode = 'farscri1';
const storyTitle = 'Scrisoarea de la far';
const blurb = 'Un paznic de far primește în fiecare iarnă aceeași scrisoare.';
const paragraph = 'Lumina farului trecea peste apă de două ori pe minut.';

/** Removes the spec's story, its thank-yous, cards and notifications. */
function cleanUp() {
  runSql(`delete from public.notifications where kind = 'story_finished' and user_id = '${writerId}';
    delete from public.quote_cards where user_id = '${readerId}';
    delete from public.rate_limit_events where user_id = '${readerId}';
    delete from public.finished_thanks where user_id = '${readerId}';
    delete from public.library_entries where user_id = '${readerId}'
      and story_id in (select id from public.stories where slug = '${storySlug}');
    delete from public.chapters where code = '${chapterCode}';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'adult_writer');`);
}

/** The story with one published chapter, on the reader's Finished shelf. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${writerId}', '${storySlug}', '${storyTitle}', '${blurb}', 'ro',
      (select id from public.categories where slug = 'fiction'), 'completed', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, '${chapterCode}', 1, 'Capitol', 'x', 10, 'published', 'Lumina',
      '${paragraph}', 10, now()
    from public.stories where slug = '${storySlug}';
    insert into public.library_entries (user_id, story_id, shelf)
    select '${readerId}', id, 'finished' from public.stories where slug = '${storySlug}';`);
}

/** How many thank-you notifications the writer has. */
function writerThanks(): string {
  return runSql(`select count(*) from public.notifications
    where kind = 'story_finished' and user_id = '${writerId}';`).trim();
}

/**
 * Opens an address as a persona in a fresh browser context.
 *
 * @returns the page
 */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
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
  await page.goto(address);
  return page;
}

/**
 * Runs axe on the page and fails on a serious or critical problem. It waits for every animation
 * to end first: the share dialog fades in, and a colour read halfway through the fade is lighter
 * than the one the reader ends up seeing (CI on #410 caught 3.91:1 mid-fade).
 */
async function expectNoSeriousProblems(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
}

/** Selects the chapter's paragraph, as a reader dragging over it would. */
async function selectParagraph(page: Page) {
  await page.evaluate(() => {
    const element = document.querySelector('[data-protected-text] p');
    if (element === null) throw new Error('No paragraph.');
    const range = document.createRange();
    range.selectNodeContents(element);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  });
}

test.describe('readers to writers (IDEAS-1 part c)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('a reader who finished the story tells the writer, once', async ({ browser }) => {
    // Step 1: the button, with what it sends.
    const page = await openAs(browser, 'teacher', `/s/${storySlug}`);
    const button = page.getByRole('button', { name: 'Tell the writer you finished it' });
    await expect(button).toBeVisible();
    await expect(button).toHaveAccessibleDescription(/No message, just thanks/);
    // Step 2: it goes once and the button reads "Sent", also after a reload.
    await button.click();
    await expect(page.getByRole('status').filter({ hasText: 'Sent. The writer' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Sent' })).toBeDisabled();
    expect(writerThanks()).toBe('1');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sent' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Tell the writer you finished it' })).toHaveCount(
      0,
    );
    expect(writerThanks()).toBe('1');
  });

  test('the writer’s notification names the reader and opens the story', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/notifications');
    await expect(
      page.getByText(`finished ${storyTitle} and says thank you for writing it.`),
    ).toBeVisible();
    await expect(page.getByText('teacher', { exact: true }).first()).toBeVisible();
    await page.getByRole('link', { name: 'Open the story' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/s/${storySlug}$`));
    // The writer's own story offers no thank-you.
    await expect(page.getByRole('heading', { level: 1, name: storyTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tell the writer you finished it' })).toHaveCount(
      0,
    );
  });

  test('it isn’t offered on another shelf', async ({ browser }) => {
    runSql(`update public.library_entries set shelf = 'reading' where user_id = '${readerId}'
      and story_id = (select id from public.stories where slug = '${storySlug}');`);
    const page = await openAs(browser, 'teacher', `/s/${storySlug}`);
    await expect(page.locator(`#library-shelf-${storySlug}`)).toHaveValue('reading');
    await expect(page.getByRole('button', { name: 'Sent' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tell the writer you finished it' })).toHaveCount(
      0,
    );
    runSql(`update public.library_entries set shelf = 'finished' where user_id = '${readerId}'
      and story_id = (select id from public.stories where slug = '${storySlug}');`);
  });

  test('on a computer, Share copies the story’s clean link and shows its chat preview', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', `/s/${storySlug}`, {
      context: { permissions: ['clipboard-read', 'clipboard-write'] },
    });
    const button = page.getByRole('button', { name: `Share the story ${storyTitle}` });
    await button.click();
    const dialog = page.getByRole('dialog', { name: 'Share this story' });
    await expect(dialog.getByRole('status')).toHaveText('Link copied.');
    const link = await dialog.getByLabel('Link').inputValue();
    expect(link).toMatch(new RegExp(`/s/${storySlug}$`));
    expect(new URL(link).search).toBe('');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
    await expect(dialog).toContainText('doesn’t include your name or any tracking code');
    await expect(dialog).toContainText(`${storyTitle} · by Lia Scrie`);
    await expect(dialog).toContainText(blurb);
    await expectNoSeriousProblems(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('a 16+ story’s preview shows only its title and rating', async ({ browser }) => {
    runSql(`update public.stories set rating = '16_plus' where slug = '${storySlug}';`);
    const page = await openAs(browser, 'teacher', `/s/${storySlug}`, {
      context: { permissions: ['clipboard-read', 'clipboard-write'] },
    });
    await page.getByRole('button', { name: `Share the story ${storyTitle}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Share this story' });
    await expect(dialog).toContainText('the preview shows only its title and rating');
    await expect(dialog).toContainText('16+');
    await expect(dialog).not.toContainText(blurb);
    await expect(dialog).not.toContainText('Lia Scrie');
    runSql(`update public.stories set rating = 'all_ages' where slug = '${storySlug}';`);
  });

  test('on a phone, Share opens the system share sheet with the story’s link', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', `/s/${storySlug}`, {
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
    await page.getByRole('button', { name: `Share the story ${storyTitle}` }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { sharedUrl?: string }).sharedUrl))
      .toMatch(new RegExp(`/s/${storySlug}$`));
    await expect(page.getByRole('dialog', { name: 'Share this story' })).toHaveCount(0);
  });

  test('the writer’s card colour starts the reader’s quote card, which they can still change', async ({
    browser,
  }) => {
    // Step 1: the writer picks Sage in the story's settings.
    const settings = await openAs(browser, 'adult_writer', `/write/s/${storySlug}/settings`);
    const colour = settings.getByLabel('Colour for quote and picture cards');
    await expect(colour).toHaveValue('default');
    await colour.selectOption('sage');
    await settings.getByRole('button', { name: 'Save changes' }).click();
    await expect(settings.getByText('Saved.')).toBeVisible();
    expect(
      runSql(`select card_colour from public.stories where slug = '${storySlug}';`).trim(),
    ).toBe('sage');
    await settings.setViewportSize({ width: 390, height: 900 });
    await expectNoSeriousProblems(settings);
    // Step 2: the reader's quote card starts in Sage.
    const page = await openAs(browser, 'teacher', `/s/${storySlug}/${chapterCode}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Lumina' })).toBeVisible();
    await selectParagraph(page);
    await page.getByRole('button', { name: 'Share quote' }).click();
    const dialog = page.getByRole('dialog', { name: 'Your quote card' });
    await expect(dialog.getByRole('button', { name: 'Sage' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(dialog.getByRole('button', { name: 'Purple' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // Step 3: the reader can still pick another colour.
    await dialog.getByRole('button', { name: 'Gold' }).click();
    await expect(dialog.getByRole('button', { name: 'Gold' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(dialog.getByRole('button', { name: 'Sage' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  for (const view of everyView([`/s/${storySlug}`])) {
    test(`axe: the story page with Share and Sent at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      await useSessionInBrowser(page.context(), (await signInPersona('teacher')).session);
      await checkScreen(page, view);
    });
  }
});
