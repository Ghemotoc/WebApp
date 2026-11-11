/**
 * The heads-up before sharing personal details, in a real browser (bundle MUST-1, part b;
 * IDEA-20261108-6; Settings › Privacy and the comment box, board 3.5).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an adult turns "Ask before I share contact details" on in Settings › Privacy;
 * - a comment with a phone number then stops at "This looks like personal contact details. Post
 *   anyway?"; "Change it" goes back to the box with nothing sent; "Post anyway" posts the words as
 *   written;
 * - the bio asks the same before an email address is saved;
 * - with the setting off, nothing asks;
 * - the note passes axe.
 * Test data: one published chapter on adult_writer's "Stația meteo"; teacher's setting and bio are
 * put back before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import AxeBuilder from '@axe-core/playwright';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/detls001';
const question = 'This looks like personal contact details. Post anyway?';

/** Removes this spec's chapter and puts teacher's setting, bio and language back. */
function cleanUp() {
  runSql(`delete from public.jobs where kind = 'comment_posted';
    delete from public.comments where chapter_id in (select id from public.chapters where code like 'detls%');
    delete from public.chapters where code like 'detls%';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set checks_personal_details = null, bio = '', locale = 'ro' where handle = 'teacher';`);
}

/** One published chapter to comment on. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'detls001', 1, 'Unu', 'x', 3, 'published', 'Unu',
      'Primul capitol aici.', 3, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/** Opens an address as teacher, in English, in a fresh browser context. */
async function openAsTeacher(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = 'teacher';`);
  await useSessionInBrowser(context, (await signInPersona('teacher')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('the heads-up before sharing personal details (MUST-1b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('with the setting off, a phone number posts without a question', async ({ browser }) => {
    const page = await openAsTeacher(browser, chapterAddress);
    await page.getByLabel('Add a comment').fill('Call 0722 123 456');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByRole('heading', { name: '1 comment' })).toBeVisible();
    await expect(page.getByText(question)).toHaveCount(0);
    await page.context().close();
  });

  test('an adult turns it on in Settings › Privacy', async ({ browser }) => {
    const page = await openAsTeacher(browser, '/settings#privacy');
    const box = page.getByRole('switch', { name: 'Ask before I share contact details' });
    await expect(box).not.toBeChecked();
    await box.check();
    await expect
      .poll(() =>
        runSql(
          `select checks_personal_details from public.profiles where handle = 'teacher';`,
        ).trim(),
      )
      .toBe('t');
    await page.context().close();
  });

  test('a comment with a phone number asks first; Change it, then Post anyway', async ({
    browser,
  }) => {
    const page = await openAsTeacher(browser, chapterAddress);
    const box = page.getByLabel('Add a comment');
    await box.fill('Text me on 0722 123 456');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByText(question)).toBeVisible();
    await expect(page.getByRole('heading', { name: '1 comment' })).toBeVisible();
    // Reduce motion ends every animation at once, so axe measures the colours the screen
    // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const results = await new AxeBuilder({ page })
      .include('section[aria-labelledby="comments-heading"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    );
    expect(serious).toEqual([]);
    await page.getByRole('button', { name: 'Change it' }).click();
    await expect(page.getByText(question)).toHaveCount(0);
    await expect(box).toBeFocused();
    await page.getByRole('button', { name: 'Post comment' }).click();
    await page.getByRole('button', { name: 'Post anyway' }).click();
    await expect(page.getByRole('heading', { name: '2 comments' })).toBeVisible();
    await expect(page.getByText('Text me on 0722 123 456')).toBeVisible();
    await page.context().close();
  });

  test('the bio asks before an email address is saved', async ({ browser }) => {
    const page = await openAsTeacher(browser, '/settings#profile');
    await page.getByLabel('Bio', { exact: true }).fill('Write to me at teacher.reads@example.org');
    await page.getByRole('button', { name: 'Save bio' }).click();
    await expect(page.getByText(question)).toBeVisible();
    await page.getByRole('button', { name: 'Post anyway' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await page.context().close();
  });
});
