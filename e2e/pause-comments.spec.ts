/**
 * Pausing new comments for a while, in a real browser (bundle CALM-8; IDEA-20261109-8; story
 * S1-E6-01; the handover "Build: handover for the simplified design", Step 5).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the writer turns the pause on in story settings, picks 3 days and saves, and the story keeps
 *   the end 72 hours later;
 * - a reader sees "New comments are paused until …" instead of the comment box, under the chapter
 *   and in a paragraph's thread, and no "Resume now";
 * - the story page says the pause in its comments line, in the reader's own time zone: a reader
 *   in New York and one in Honolulu each see the end on their own clock (CALM-8b);
 * - the writer's "Resume now" opens comments again and puts focus in the comment box;
 * - when a pause ends on its own (end_comment_pauses()), the writer gets the in-app note;
 * - the screens pass axe at 390, 768 and 1440 px.
 * Test data: one published chapter on adult_writer's "Stația meteo" with one paragraph comment by
 * teacher; all put back before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
const storySlug = 'statia-meteo-seed01';
const chapterCode = 'pausq001';
const chapterAddress = `/s/${storySlug}/${chapterCode}`;
const pausedLine = /New comments are paused until [^.]+\./;

/** Removes this spec's chapter, comments and notes, and ends any pause. */
function cleanUp() {
  runSql(`delete from public.jobs where kind = 'comment_posted';
    delete from public.notifications where user_id = '${adultWriterId}' and kind = 'comments_resumed';
    delete from public.comments where chapter_id in (select id from public.chapters where code = '${chapterCode}');
    delete from public.chapters where code = '${chapterCode}';
    update public.stories set comments_paused_until = null, first_published_at = null,
      last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'adult_writer');`);
}

/** One published chapter of two paragraphs, and a paragraph comment by teacher on the first. */
async function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', '${chapterCode}', 1, 'Unu', 'x', 8, 'published', 'Unu',
      'Primul paragraf aici.\n\nAl doilea paragraf aici.', 8, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
    where id = '${storyId}';`);
  const { client } = await signInPersona('teacher');
  const { error } = await client.rpc('post_paragraph_comment', {
    story_slug: storySlug,
    chapter_code: chapterCode,
    block_number: 1,
    body: 'Un gând despre primul paragraf.',
  });
  if (error !== null) throw new Error(`Could not seed the paragraph comment: ${error.message}`);
}

/**
 * Opens an address in English, as a persona, in a fresh browser context.
 * @param timeZone the browser's own time zone (an IANA name); left out, the machine's zone
 */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  timeZone?: string,
): Promise<Page> {
  // The browser's time zone stands in for where the reader is (CALM-8b).
  const context = await browser.newContext(timeZone === undefined ? {} : { timezoneId: timeZone });
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/**
 * The saved pause end as a reader in one time zone should read it: the same wording the app uses
 * ("Saturday 21 November, 17:40"), worked out here in Node with that zone named.
 * @param timeZone an IANA zone name, for example 'America/New_York'
 */
function pauseEndOnTheClockOf(timeZone: string): string {
  const savedEnd = runSql(`select to_char(comments_paused_until at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS"Z"') from public.stories where id = '${storyId}';`).trim();
  const instant = new Date(savedEnd);
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(instant);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
  return `${day}, ${time}`;
}

/** Hours from now until the story's saved pause ends, rounded. */
function hoursOfPauseLeft(): number {
  const hours = runSql(`select round(extract(epoch from comments_paused_until - now()) / 3600)
    from public.stories where id = '${storyId}';`);
  return Number(hours.trim());
}

test.describe('pause new comments for a while (CALM-8)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('the writer pauses new comments for 3 days from story settings', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `/write/s/${storySlug}/settings`);
    const pauseSwitch = page.getByRole('switch', { name: 'Pause new comments' });
    await expect(pauseSwitch).toHaveAttribute('aria-checked', 'false');
    await pauseSwitch.click();
    await expect(pauseSwitch).toHaveAttribute('aria-checked', 'true');
    // The segment's label lies over its radio, as on every segmented control, so the label is clicked.
    await page.locator('label', { hasText: '3 days' }).click();
    await expect(page.getByRole('radio', { name: '3 days' })).toBeChecked();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect.poll(hoursOfPauseLeft).toBe(72);
    await page.context().close();
  });

  test('a reader sees the pause instead of the comment box, with no Resume now', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', chapterAddress);
    await expect(page.getByText(pausedLine).first()).toBeVisible();
    await expect(page.getByLabel('Add a comment')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Resume now' })).toHaveCount(0);
    // The paragraph with a comment still opens its thread, which says the pause too.
    await page.getByRole('button', { name: '1 comment on this paragraph' }).click();
    const thread = page.locator('#paragraph-thread-1');
    await expect(thread.getByText(pausedLine)).toBeVisible();
    await expect(thread.getByText('Un gând despre primul paragraf.')).toBeVisible();
    // The paragraph with no comments shows no "Comment on this paragraph" during a pause.
    await expect(
      page.getByRole('button', { name: 'Comment on this paragraph', exact: true }),
    ).toHaveCount(0);
    await page.context().close();
  });

  test('the story page says comments are paused', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/s/${storySlug}`);
    await expect(page.getByText(/Paused until .+, \d\d:\d\d/).first()).toBeVisible();
    await page.context().close();
  });

  // Robert, design canvas comment, 20 Nov 2026, 17:49 UTC: the time adapts to the viewer's own
  // local time. New York and Honolulu are 5 hours apart, so the two readers see different clocks.
  for (const timeZone of ['America/New_York', 'Pacific/Honolulu']) {
    test(`a reader in ${timeZone} sees the end on their own clock`, async ({ browser }) => {
      const page = await openAs(browser, 'teacher', `/s/${storySlug}`, timeZone);
      const expected = `Paused until ${pauseEndOnTheClockOf(timeZone)}`;
      await expect(page.getByText(expected, { exact: true }).first()).toBeVisible();
      await page.context().close();
    });
  }

  for (const view of [
    { width: 390, theme: 'night', language: 'ro' },
    { width: 768, theme: 'light', language: 'en' },
    { width: 1440, theme: 'light', language: 'ro' },
  ] as const) {
    test(`axe: the paused chapter at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, address: chapterAddress });
      await context.close();
    });
  }

  test('axe: story settings with the pause on, at 390 px, night', async ({ browser }) => {
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    await checkScreen(page, {
      width: 390,
      theme: 'night',
      language: 'en',
      address: `/write/s/${storySlug}/settings`,
    });
    await context.close();
  });

  test('the writer resumes now and focus lands in the comment box', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', chapterAddress);
    const resume = page.getByRole('button', { name: 'Resume now' }).first();
    await resume.focus();
    await page.keyboard.press('Enter');
    const box = page.getByLabel('Add a comment');
    await expect(box).toBeVisible();
    await expect(box).toBeFocused();
    await expect(page.getByText(pausedLine)).toHaveCount(0);
    expect(
      runSql(
        `select comments_paused_until is null from public.stories where id = '${storyId}';`,
      ).trim(),
    ).toBe('t');
    await page.context().close();
  });

  test('a pause that ends on its own leaves the writer a note', async ({ browser }) => {
    runSql(`update public.stories set comments_paused_until = now() - interval '1 minute'
      where id = '${storyId}';
      select public.end_comment_pauses();`);
    const page = await openAs(browser, 'adult_writer', '/notifications');
    await expect(page.getByText(/Story: new comments are open again on “.+”\./)).toBeVisible();
    await page.context().close();
  });
});
