/**
 * The private reading streak, in a real browser (bundle IDEAS-1, part b; idea IDEA-20261031-13,
 * Robert's comments of 31 Oct 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI after every merge to main (Supabase started first).
 * What it proves:
 * - it is off until the reader turns it on in the Library, and then counts a minute of active
 *   reading in a chapter, showing the days this week and today's minutes (criteria 1 and 2);
 * - the reader picks any target and an optional reminder time, and the note shows "n of m
 *   minutes today" (criterion 2);
 * - an under-18 can't pick a reminder in quiet hours, 22:00 to 07:00 (criterion 3, Q50);
 * - the reminder notification reads "Your library: a few minutes of reading today?" and opens
 *   the Library's note (criterion 3);
 * - turning it off deletes the target, the reminder and the minutes (criterion 4);
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on the Library with the note on.
 * Test data: the editor and teen_17 personas, and adult_writer's story "Ceasul de nisip" with one
 * chapter. Everything is removed at the start and the end.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const editorId = '00000000-0000-4000-8000-000000000012';
const teenId = '00000000-0000-4000-8000-000000000002';
const storySlug = 'reading-streak-e2e';

/** Twenty paragraphs, so the chapter can be scrolled. */
const longText = Array.from(
  { length: 20 },
  (_, index) =>
    `Paragraful ${index + 1}. Nisipul curgea încet, iar fiecare minut își avea locul lui.`,
).join('\\n\\n');

/** Removes the spec's story, streaks and reminders. */
function cleanUp() {
  runSql(`delete from public.reading_minutes where user_id in ('${editorId}', '${teenId}');
    delete from public.reading_habits where user_id in ('${editorId}', '${teenId}');
    delete from public.notifications where kind = 'reading_reminder' and user_id = '${editorId}';
    delete from public.chapters where code = 'nisipun1';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle = 'editor';`);
}

/** The story with one published chapter. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}', 'Ceasul de nisip', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'nisipun1', 1, 'Capitol', 'x', 300, 'published', 'Primul minut', E'${longText}', 300, now()
    from public.stories where slug = '${storySlug}';`);
}

/** The editor's streak, as a SQL answer: "target reminders time minutes". */
function editorStreak(): string {
  return runSql(`select coalesce(habit.daily_target_minutes::text, '-') || ' ' || habit.reminders_on
      || ' ' || coalesce(to_char(habit.reminder_time, 'HH24:MI'), '-') || ' '
      || coalesce((select sum(minutes)::text from public.reading_minutes where user_id = '${editorId}'), '0')
    from public.reading_habits as habit where habit.user_id = '${editorId}';`).trim();
}

/**
 * Opens an address as a persona, in English, on a device in Romania.
 *
 * @returns the page
 */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
  const context = await browser.newContext({ timezoneId: 'Europe/Bucharest' });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('the private reading streak (IDEAS-1 part b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    seedStory();
    runSql(`update public.profiles set locale = 'en' where id in ('${editorId}', '${teenId}');`);
  });
  test.afterAll(cleanUp);

  test('it is off until the reader turns it on, then counts a minute of reading', async ({
    browser,
  }) => {
    // Step 1: off at first, with nothing counted.
    const library = await openAs(browser, 'editor', '/library');
    const note = library.getByRole('region', { name: 'Reading days' });
    await expect(note.getByRole('button', { name: 'Turn it on' })).toBeVisible();
    expect(editorStreak()).toBe('');
    await note.getByRole('button', { name: 'Turn it on' }).click();
    await expect(
      note.getByText('No reading counted yet this week.', { exact: false }),
    ).toBeVisible();
    // Step 2: a minute of active reading in a chapter (the page's clock is moved on a minute).
    const chapter = await openAs(browser, 'editor', `/s/${storySlug}/nisipun1`);
    await chapter.clock.install();
    await expect(chapter.getByRole('heading', { level: 1, name: 'Primul minut' })).toBeVisible();
    await chapter.mouse.wheel(0, 300);
    const counted = chapter.waitForResponse((response) =>
      response.url().includes('add_reading_minute'),
    );
    await chapter.clock.runFor(61_000);
    await counted;
    // Step 3: the Library shows it.
    await library.reload();
    await expect(note.getByText('You read on 1 day this week.')).toBeVisible();
    await expect(note.getByText('1 minute today')).toBeVisible();
    expect(editorStreak()).toBe('- false - 1');
  });

  test('the reader picks any target and a reminder time', async ({ browser }) => {
    const page = await openAs(browser, 'editor', '/library#reading-days');
    const note = page.getByRole('region', { name: 'Reading days' });
    await note.getByLabel('Daily target, in minutes').fill('17');
    await note.getByLabel('Remind me if I haven’t reached it').check();
    await note.getByLabel('Time', { exact: true }).fill('20:15');
    await note.getByRole('button', { name: 'Save' }).click();
    await expect(note.getByText('Saved.')).toBeVisible();
    await expect(note.getByText('1 of 17 minutes today')).toBeVisible();
    await expect(note.getByRole('progressbar', { name: 'Minutes read today' })).toBeVisible();
    expect(editorStreak()).toBe('17 true 20:15 1');
  });

  test('the reminder reads gently and opens the Library’s note', async ({ browser }) => {
    runSql(
      `insert into public.notifications (user_id, kind) values ('${editorId}', 'reading_reminder');`,
    );
    const page = await openAs(browser, 'editor', '/notifications');
    await expect(page.getByText('a few minutes of reading today?')).toBeVisible();
    await page.getByRole('link', { name: 'Open the library' }).first().click();
    await expect(page).toHaveURL(/\/library#reading-days$/);
    await expect(page.getByRole('region', { name: 'Reading days' })).toBeVisible();
  });

  test('an under-18 can’t pick a reminder in quiet hours', async ({ browser }) => {
    const page = await openAs(browser, 'teen_17', '/library');
    const note = page.getByRole('region', { name: 'Reading days' });
    await note.getByRole('button', { name: 'Turn it on' }).click();
    await note.getByLabel('Daily target, in minutes').fill('10');
    await note.getByLabel('Remind me if I haven’t reached it').check();
    await expect(note.getByText('Not between 22:00 and 07:00', { exact: false })).toBeVisible();
    await note.getByLabel('Time', { exact: true }).fill('22:30');
    await note.getByRole('button', { name: 'Save' }).click();
    await expect(note.getByRole('alert')).toContainText('Pick a time between 07:00 and 22:00');
    expect(
      runSql(`select reminders_on from public.reading_habits where user_id = '${teenId}';`).trim(),
    ).toBe('f');
  });

  for (const view of everyView(['/library#reading-days'])) {
    test(`axe: the Library with the note on at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'editor';`);
      await useSessionInBrowser(page.context(), (await signInPersona('editor')).session);
      await checkScreen(page, view);
      await expect(page.locator('#reading-target')).toBeVisible();
    });
  }

  test('turning it off deletes the target, the reminder and the minutes', async ({ browser }) => {
    const page = await openAs(browser, 'editor', '/library#reading-days');
    const note = page.getByRole('region', { name: 'Reading days' });
    await note.getByRole('button', { name: 'Turn off and delete the minutes' }).click();
    await expect(note.getByText('This deletes your target, your reminder')).toBeVisible();
    await note.getByRole('button', { name: 'Yes, turn it off' }).click();
    await expect(note.getByRole('button', { name: 'Turn it on' })).toBeVisible();
    expect(editorStreak()).toBe('');
    expect(
      runSql(`select count(*) from public.reading_minutes where user_id = '${editorId}';`).trim(),
    ).toBe('0');
  });
});
