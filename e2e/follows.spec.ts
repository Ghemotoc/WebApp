/**
 * Following writers and stories in a real browser (story S1-E6-05; boards 6.1 and 3.4).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - teacher follows adult_writer on the profile: the button turns to "Following" (pressed, with
 *   a tick) and the follower count goes from 1 to 2; unfollowing takes it back (first criterion);
 * - teacher follows the story from the story page, and unfollows it;
 * - the count is public, the list isn't: a visitor sees "only Lia Scrie sees who" and a
 *   log-in link instead of Follow; adult_writer opens "See who follows you" on their own profile
 *   and sees teen_17 (second criterion, Q50);
 * - a read-only account (kid_14_ok) is told it can't follow yet;
 * - a blocked pair: blocker's profile of blocked shows no Follow button (the database test 144
 *   proves the silent failure itself).
 * Test data: one published chapter on adult_writer's "Stația meteo"; teacher's follows; removed
 * after.
 */
import { expect, test, type Browser } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const storyId = '00000000-0000-4000-9000-000000000001';

/** Removes this spec's chapter and follows, and puts the seed state back. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'follw%';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    delete from public.follows_users where user_id = '${teacherId}';
    delete from public.follows_stories where user_id = '${teacherId}';
    update public.profiles set locale = 'ro'
      where handle in ('adult_writer', 'teacher', 'kid_14_ok', 'blocker');`);
}

/** One published chapter, so the story and its writer have something to follow. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'follwa01', 1, 'Unu', 'x', 3, 'published', 'Unu',
      'Primul capitol aici.', 3, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/** Opens a page in English, as a persona or as a visitor, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName | null, path: string) {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('follows (S1-E6-05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('teacher follows and unfollows adult_writer; the count follows', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/u/adult_writer');
    // The followers number: the <dd> beside the label that says who sees the list.
    const followerCount = page.locator('dl > div', { hasText: 'sees who' }).locator('dd');
    await expect(followerCount).toHaveText('1');
    const follow = page.getByRole('button', { name: 'Follow Lia Scrie' });
    await expect(follow).toHaveAttribute('aria-pressed', 'false');
    await follow.click();
    const following = page.getByRole('button', { name: 'Following Lia Scrie' });
    await expect(following).toHaveAttribute('aria-pressed', 'true');
    await expect(followerCount).toHaveText('2');
    await following.click();
    await expect(page.getByRole('button', { name: 'Follow Lia Scrie' })).toBeVisible();
    await expect(followerCount).toHaveText('1');
    await page.context().close();
  });

  test('teacher follows and unfollows the story from its page', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/s/statia-meteo-seed01');
    await page.getByRole('button', { name: 'Follow story Stația meteo' }).click();
    const following = page.getByRole('button', { name: 'Following story Stația meteo' });
    await expect(following).toHaveAttribute('aria-pressed', 'true');
    expect(
      runSql(`select count(*) from public.follows_stories where user_id = '${teacherId}'`),
    ).toBe('1');
    await following.click();
    await expect(page.getByRole('button', { name: 'Follow story Stația meteo' })).toBeVisible();
    await page.context().close();
  });

  test('a visitor sees the count and a log-in link, never the list', async ({ browser }) => {
    const page = await openAs(browser, null, '/u/adult_writer');
    await expect(page.locator('dl')).toContainText('only Lia Scrie sees who');
    await expect(page.getByRole('link', { name: 'Log in to follow' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'See who follows you' })).toHaveCount(0);
    await page.context().close();
  });

  test('adult_writer sees who follows them on their own profile', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/u/adult_writer');
    await page.getByRole('button', { name: 'See who follows you' }).click();
    const dialog = page.getByRole('dialog', { name: 'Followers' });
    await expect(dialog.getByRole('link', { name: 'teen_17' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.context().close();
  });

  test('a read-only account is told it can’t follow yet', async ({ browser }) => {
    const page = await openAs(browser, 'kid_14_ok', '/u/adult_writer');
    await page.getByRole('button', { name: 'Follow Lia Scrie' }).click();
    await expect(page.getByRole('alert')).toHaveText('This account can’t follow anyone yet.');
    await page.context().close();
  });

  test('blocker’s view of blocked has no Follow button', async ({ browser }) => {
    const page = await openAs(browser, 'blocker', '/u/blocked');
    await expect(page.getByRole('heading', { name: 'You block @blocked' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Follow/ })).toHaveCount(0);
    await page.context().close();
  });
});
