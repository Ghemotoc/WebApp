/**
 * Bringing archived stories back, end to end (bundle ARCHIVE-1).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves (Robert, 11 Nov 2026, 19:47 to 19:52 UTC):
 * - an account with no archive for its email sees no Archived stories panel;
 * - an account whose email has an archive sees the panel in Settings › Download data, which
 *   never says which stories wait;
 * - a wrong answer says so and how many tries are left; the right year of birth and a story's
 *   title bring the story back as a private draft, shown on the writing page;
 * - break test: an empty form is refused in the browser, and after three wrong tries the button
 *   is off, also after the page is opened again;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, and no sideways scroll.
 * The archive itself (what it holds, who can read it, the nightly jobs) is proved by database
 * tests 371 and 372.
 * Test data: an archive row made from a story of the spec's own, filed under adult_writer's
 * email as if an older account of theirs had closed; removed at the start and the end.
 */
import { expect, test } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** adult_writer (the account that comes back) and failed_check (who writes the story first). */
const writerId = '00000000-0000-4000-8000-000000000001';
const formerId = '00000000-0000-4000-8000-000000000006';
const storySlug = 'story-archive-e2e';
const storyTitle = 'The Lighthouse Keeper’s Ledger';

/** Removes the archive, the story and the wrong tries the spec made. */
function clearArchive() {
  runSql(`
    delete from public.story_archives where title = '${storyTitle}';
    delete from public.chapters where code = 'archi2e1';
    delete from public.stories where slug = '${storySlug}';
    delete from public.rate_limit_events where action = 'story_archive_wrong_try';`);
}

/** Files one story in the archive under adult_writer's email, as a closed account would leave it. */
function archiveOneStory() {
  runSql(`
    insert into public.stories (user_id, slug, title, language_code, category_id, rating)
    values ('${formerId}', '${storySlug}', '${storyTitle}', 'en',
      (select id from public.categories where slug = 'fiction'), 'all_ages');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
    values ((select id from public.stories where slug = '${storySlug}'),
      '${formerId}', 'archi2e1', 1, 'First light', 'The lamp was lit.', 4, 'draft');
    insert into public.story_archives (user_id, email_hash, birth_year, pen_name, handle, title,
      story, delete_after)
    select '${formerId}',
      public.hash_email((select email from auth.users where id = '${writerId}')),
      1990, 'Old Keeper', 'old_keeper', '${storyTitle}',
      public.archived_story_document(stories.id), now() + interval '5 years'
    from public.stories where slug = '${storySlug}';
    delete from public.chapters where code = 'archi2e1';
    delete from public.stories where slug = '${storySlug}';`);
}

test.describe('Archived stories', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => clearArchive());
  test.afterAll(() => clearArchive());

  test('an account with nothing in the archive sees no panel', async ({ page }) => {
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    await page.goto('/settings#download-my-data');
    await expect(page.locator('#download-my-data')).toBeVisible();
    await expect(page.locator('#archived-stories')).toHaveCount(0);
  });

  for (const view of everyView(['/settings#archived-stories'])) {
    test(`axe: the panel at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      clearArchive();
      archiveOneStory();
      runSql(`update public.profiles set locale = '${view.language}' where id = '${writerId}';`);
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view, async (screen) => {
        await expect(screen.locator('#archived-stories')).toBeVisible();
        // The panel never names the stories that wait.
        await expect(screen.locator('#archived-stories')).not.toContainText(storyTitle);
      });
    });
  }

  test('a wrong answer is refused, the right one brings the story back as a private draft', async ({
    browser,
  }) => {
    clearArchive();
    archiveOneStory();
    runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/settings#archived-stories');
    const panel = page.locator('#archived-stories');
    await expect(panel.getByRole('heading', { name: 'Archived stories' })).toBeVisible();
    // Step 1 (break test): an empty form is stopped in the browser, with a line per field.
    await panel.getByRole('button', { name: 'Bring stories back' }).click();
    await expect(panel.getByText('Enter the year as four digits.')).toBeVisible();
    await expect(panel.getByText('Enter a pen name, a username or a story’s title.')).toBeVisible();
    // Step 2: the wrong year of birth.
    await panel.getByLabel('Year of birth').fill('1991');
    await panel.getByLabel('Pen name, username or a story’s title').fill('Old Keeper');
    await panel.getByRole('button', { name: 'Bring stories back' }).click();
    await expect(panel.getByText('These details don’t match. 2 tries left today.')).toBeVisible();
    // Step 3: the right year and the story's title.
    await panel.getByLabel('Year of birth').fill('1990');
    await panel.getByLabel('Pen name, username or a story’s title').fill(storyTitle);
    await panel.getByRole('button', { name: 'Bring stories back' }).click();
    await expect(panel.getByText('1 story is back as a private draft.')).toBeVisible();
    // Step 4: it is adult_writer's now, private, and out of the archive.
    expect(
      runSql(
        `select user_id || ' ' || visibility from public.stories where slug = '${storySlug}';`,
      ).trim(),
    ).toBe(`${writerId} private`);
    expect(
      runSql(`select count(*) from public.story_archives where title = '${storyTitle}';`).trim(),
    ).toBe('0');
    // Step 5: the link opens the writing page, where the story is.
    await panel.getByRole('link', { name: 'See the stories' }).click();
    await expect(page.getByText(storyTitle).first()).toBeVisible();
    await context.close();
  });

  test('three wrong tries switch the button off, also after opening the page again (break test)', async ({
    browser,
  }) => {
    clearArchive();
    archiveOneStory();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/settings#archived-stories');
    const panel = page.locator('#archived-stories');
    const button = panel.getByRole('button', { name: 'Bring stories back' });
    await panel.getByLabel('Year of birth').fill('1990');
    // Three wrong names, one after the other.
    for (const [guess, answer] of [
      ['Wrong One', '2 tries left today.'],
      ['Wrong Two', '1 try left today.'],
      ['Wrong Three', 'The form is locked until tomorrow.'],
    ] as const) {
      await panel.getByLabel('Pen name, username or a story’s title').fill(guess);
      await button.click();
      await expect(panel.getByText(answer)).toBeVisible();
    }
    await expect(button).toBeDisabled();
    // Opening the page again doesn't give more tries.
    await page.reload();
    await expect(panel.getByText('Too many wrong tries. Try again tomorrow.')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Bring stories back' })).toBeDisabled();
    // The story is still in the archive.
    expect(
      runSql(`select count(*) from public.story_archives where title = '${storyTitle}';`).trim(),
    ).toBe('1');
    await context.close();
  });
});
