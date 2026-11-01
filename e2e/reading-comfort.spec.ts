/**
 * Reading place and comfort, in a real browser (bundle IDEAS-1, part a; ideas IDEA-20261031-4,
 * 6, 7 and 8, Robert's picks of 31 Oct 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI after every merge to main (Supabase started first).
 * What it proves:
 * - "You are here" (idea 4): the story page marks the chapter the reader stopped in with
 *   "You are here, 42%" in words, and the mark opens that chapter at the saved place;
 * - Atkinson Hyperlegible (idea 6): picking it changes the chapter at once, and the font comes
 *   from our own site;
 * - Night by the clock (idea 7): the reader sets both times themselves (the fields start empty),
 *   a chapter opened inside them shows in Night and outside them in the usual theme, and a theme
 *   picked by hand wins until the next chapter without changing the usual theme;
 * - the reading ruler (idea 8): a band follows the line under the pointer and moves with the
 *   arrow keys, and it is hidden from screen readers;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on the open panel and on the story
 *   page with "You are here", and nothing scrolls sideways.
 * Test data: adult_writer's story "Ceasul din turn" with two long chapters; the editor persona
 * reads it (no other reader spec reads as editor). Everything is removed at the start and the end.
 */
import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const readerId = '00000000-0000-4000-8000-000000000012';
const storySlug = 'reading-comfort-e2e';
const firstChapter = `/s/${storySlug}/confort1`;
const secondChapter = `/s/${storySlug}/confort2`;

/** Twenty long paragraphs, so a chapter is taller than the window. */
const longText = Array.from(
  { length: 20 },
  (_, index) =>
    `Paragraful ${index + 1}. Ceasul din turn bătea rar, iar orașul asculta fiecare lovitură ca pe o poveste spusă încet, cu multe pauze și cu ș și ț la locul lor.`,
).join('\\n\\n');

/** Removes the spec's story, the reader's place and settings. */
function cleanUp() {
  runSql(`delete from public.reading_settings where user_id = '${readerId}';
    delete from public.reading_positions where user_id = '${readerId}';
    delete from public.library_entries where user_id = '${readerId}';
    delete from public.chapters where code in ('confort1', 'confort2');
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle = 'editor';`);
}

/** The story with two published chapters. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}', 'Ceasul din turn', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, code, position, 'Capitol', 'x', 600, 'published', chapter_title, E'${longText}', 600, now()
    from public.stories,
      (values ('confort1', 1, 'Prima oră'), ('confort2', 2, 'A doua oră')) as made (code, position, chapter_title)
    where slug = '${storySlug}';`);
}

/** A place 42% through chapter 2, as if saved earlier on another device. */
function savePlace() {
  runSql(`delete from public.reading_positions where user_id = '${readerId}';
    insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
    select '${readerId}', chapters.story_id, chapters.id, 42, 'phone'
    from public.chapters where code = 'confort2';`);
}

/** Saves the reader's settings straight in the database, as the panel would. */
function saveSettings(values: string) {
  runSql(`insert into public.reading_settings (user_id, theme, night_by_clock, night_from, night_until)
    values ('${readerId}', ${values})
    on conflict (user_id) do update set theme = excluded.theme, night_by_clock = excluded.night_by_clock,
      night_from = excluded.night_from, night_until = excluded.night_until;`);
}

/**
 * Opens an address as the reader in a fresh browser (another device).
 *
 * @param options.at - the device's clock, as a time in Romania ("23:30"), or the real time
 * @returns the page
 */
async function openAs(browser: Browser, address: string, options: { at?: string } = {}) {
  runSql(`update public.profiles set locale = 'en' where handle = 'editor';`);
  const contextOptions: BrowserContextOptions = { timezoneId: 'Europe/Bucharest' };
  const context = await browser.newContext(contextOptions);
  await useSessionInBrowser(context, (await signInPersona('editor')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  // The device's clock at a time in Romania today (1 Nov is winter time, UTC+2).
  if (options.at !== undefined) {
    await page.clock.setFixedTime(new Date(`2026-11-01T${options.at}:00+02:00`));
  }
  // On a chapter, wait for the reader's saved settings, so a change made in the panel isn't then
  // replaced by the copy arriving from the database. The story page doesn't read them.
  const isChapter = address !== `/s/${storySlug}`;
  const settingsRead = isChapter
    ? page.waitForResponse((response) => response.url().includes('/rest/v1/reading_settings'))
    : Promise.resolve();
  await page.goto(address);
  await settingsRead;
  return page;
}

/** The chapter's page box, which carries the theme. */
function pageBox(page: Page) {
  return page.getByTestId('chapter-page');
}

test.describe('reading place and comfort (IDEAS-1 part a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('"You are here" marks the chapter the reader stopped in and goes back to the place', async ({
    browser,
  }) => {
    // Step 1: a place 42% through chapter 2, saved earlier on another device.
    savePlace();
    const page = await openAs(browser, `/s/${storySlug}`);
    // Step 2: the mark sits beside chapter 2, in words, and only there.
    const mark = page.getByRole('link', { name: /You are here, 42% through chapter 2/ });
    await expect(mark).toBeVisible();
    await expect(mark).toHaveText('You are here, 42%');
    await expect(page.getByText(/You are here/)).toHaveCount(1);
    // Step 3: it opens chapter 2 at the place, not the top, and the address loses "#resume".
    await mark.click();
    await expect(page.getByRole('heading', { level: 1, name: 'A doua oră' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
    await expect(page).toHaveURL(new RegExp(`${secondChapter}$`));
    await expect(page.getByRole('button', { name: 'Go back there' })).toHaveCount(0);
  });

  test('Atkinson Hyperlegible changes the chapter at once, served from our own site', async ({
    browser,
  }) => {
    const page = await openAs(browser, firstChapter);
    const fontFiles: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('atkinson-hyperlegible')) fontFiles.push(request.url());
    });
    await page.getByRole('button', { name: 'Reading settings' }).click();
    await page.getByRole('radio', { name: 'Atkinson Hyperlegible' }).click();
    const text = page.locator('.tmc-chapter-text--reader');
    await expect
      .poll(() => text.evaluate((element) => getComputedStyle(element).fontFamily))
      .toContain('Atkinson Hyperlegible');
    await expect
      .poll(() => page.evaluate(() => document.fonts.check('19px "Atkinson Hyperlegible"')))
      .toBe(true);
    expect(fontFiles.length).toBeGreaterThan(0);
    for (const file of fontFiles) expect(new URL(file).origin).toBe(new URL(page.url()).origin);
    await expect
      .poll(() =>
        runSql(`select font from public.reading_settings where user_id = '${readerId}';`).trim(),
      )
      .toBe('atkinson_hyperlegible');
  });

  test('the reader sets Night by the clock themselves, with no preset hours', async ({
    browser,
  }) => {
    // Saved earlier: Atkinson Hyperlegible, so the panel shows when the saved copy has arrived.
    saveSettings(`'light', false, null, null`);
    runSql(
      `update public.reading_settings set font = 'atkinson_hyperlegible' where user_id = '${readerId}';`,
    );
    const page = await openAs(browser, firstChapter);
    await page.getByRole('button', { name: 'Reading settings' }).click();
    await expect(page.getByRole('radio', { name: 'Atkinson Hyperlegible' })).toBeChecked();
    // click(), then wait: the box is drawn from the cached settings, which update a moment later.
    await page.getByLabel('Night by the clock').click();
    await expect(page.getByLabel('Night by the clock')).toBeChecked();
    // The fields start empty: nothing is chosen for the reader.
    await expect(page.getByLabel('From')).toHaveValue('');
    await expect(page.getByLabel('Until')).toHaveValue('');
    await expect(page.getByText('Pick both times. Nothing changes until you do.')).toBeVisible();
    await page.getByLabel('From').fill('22:30');
    await page.getByLabel('Until').fill('06:00');
    await expect
      .poll(() =>
        runSql(`select night_by_clock::text || ' ' || coalesce(night_from::text, '') || ' ' ||
          coalesce(night_until::text, '') from public.reading_settings where user_id = '${readerId}';`).trim(),
      )
      .toBe('true 22:30:00 06:00:00');
  });

  test('inside the hours a chapter opens in Night, outside them in the usual theme', async ({
    browser,
  }) => {
    saveSettings(`'sepia', true, '22:30', '06:00'`);
    const late = await openAs(browser, firstChapter, { at: '23:30' });
    await expect(pageBox(late)).toHaveAttribute('data-theme', 'night');
    const midday = await openAs(browser, firstChapter, { at: '12:00' });
    await expect(pageBox(midday)).not.toHaveAttribute('data-theme', 'night');
    await expect(pageBox(midday)).toHaveClass(/tmc-reading-page--sepia/);
  });

  test('a theme picked by hand wins until the next chapter and leaves the usual theme alone', async ({
    browser,
  }) => {
    saveSettings(`'sepia', true, '22:30', '06:00'`);
    const page = await openAs(browser, firstChapter, { at: '23:30' });
    await page.getByRole('button', { name: 'Reading settings' }).click();
    await page.getByRole('radio', { name: 'Light', exact: true }).click();
    await expect(pageBox(page)).not.toHaveAttribute('data-theme', 'night');
    await expect(pageBox(page)).not.toHaveClass(/tmc-reading-page--sepia/);
    // The usual theme is still Sepia.
    expect(
      runSql(`select theme from public.reading_settings where user_id = '${readerId}';`).trim(),
    ).toBe('sepia');
    // The next chapter opens in Night again.
    await page.keyboard.press('Escape');
    await page
      .getByRole('link', { name: /Next chapter/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'A doua oră' })).toBeVisible();
    await expect(pageBox(page)).toHaveAttribute('data-theme', 'night');
  });

  test('the reading ruler follows the pointer and the arrow keys, and screen readers never meet it', async ({
    browser,
  }) => {
    saveSettings(`'light', false, null, null`);
    runSql(
      `update public.reading_settings set reading_ruler = true where user_id = '${readerId}';`,
    );
    const page = await openAs(browser, firstChapter);
    const paragraph = page.locator('.tmc-chapter-text--reader p').nth(2);
    await paragraph.hover();
    const ruler = page.getByTestId('reading-ruler');
    await expect(ruler).toBeVisible();
    await expect(ruler).toHaveAttribute('aria-hidden', 'true');
    // About one line tall, not a paragraph.
    const height = (await ruler.boundingBox())?.height ?? 0;
    expect(height).toBeGreaterThan(20);
    expect(height).toBeLessThan(60);
    // Down moves it one line lower in the chapter (the page may scroll to keep it in view, so
    // the band's place is measured inside the chapter, not the window).
    const placeInChapter = () => ruler.evaluate((element) => (element as HTMLElement).offsetTop);
    const before = await placeInChapter();
    await page.mouse.move(5, 5);
    await page.locator('body').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(placeInChapter).toBeGreaterThan(before);
    // It adds nothing a screen reader reads: the article's accessible text has no ruler in it.
    const snapshot = await page.locator('article').ariaSnapshot();
    expect(snapshot).not.toContain('ruler');
  });

  for (const view of everyView([firstChapter])) {
    test(`axe: the open panel at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'editor';`);
      saveSettings(`'light', true, '22:30', '06:00'`);
      await useSessionInBrowser(page.context(), (await signInPersona('editor')).session);
      await checkScreen(page, view, async (opened) => {
        const button = view.language === 'ro' ? 'Setări de citire' : 'Reading settings';
        await opened.getByRole('button', { name: button }).click();
        await expect(opened.locator('#reading-night-from')).toBeVisible();
      });
    });
  }

  for (const view of everyView([`/s/${storySlug}`])) {
    test(`axe: the story page with "You are here" at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'editor';`);
      savePlace();
      await useSessionInBrowser(page.context(), (await signInPersona('editor')).session);
      await checkScreen(page, view);
      await expect(page.locator('a[href$="#resume"]')).toBeVisible();
    });
  }
});
