/**
 * In-app notifications in a real browser (story S1-E7-01; board 6.2 Notifications).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - new followers, a comment on the reader's chapter and a moderation decision reach the reader
 *   through the real triggers and the notification job (criteria 1 and 4);
 * - in night mode the bell's count is near-black on a white badge (accessibility check, 6 Nov 2026);
 * - the bell's badge counts the unread ones, the filter chips narrow the list, a decision says
 *   "Always on", and "Mark all as read" clears the badge (criteria 2 and 3);
 * - the page has no serious axe issue and no sideways scroll at 390, 768 and 1440 px, in light
 *   and night, Romanian and English (CLAUDE.md rules 9 and 21), and no doodle is drawn.
 * Test data: a throwaway account of its own (so other specs' notifications never mix in) with a
 * story and chapter, removed afterwards with everything that points at it.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { THEME_STORAGE_KEY } from '../src/lib/theme';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { makeTestClient, useSessionInBrowser } from './support/personas';
import { createTestAccount, removeTestAccount } from './support/testAccounts';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const moderatorId = '00000000-0000-4000-8000-000000000010';
const password = 'notifications secret passphrase';
const stamp = Date.now();
const account = { email: `notifications-${stamp}@example.com`, handle: `notif.${stamp}` };
const accountId = `(select id from auth.users where email = '${account.email}')`;

/** Removes everything this spec made, then the account. */
function cleanUp() {
  runSql(`delete from public.notifications where user_id = ${accountId};
    delete from public.cases where user_id = ${accountId};
    delete from public.follows_users where followed_user_id = ${accountId};
    delete from public.comments where chapter_id in (select id from public.chapters where code = 'notif101');
    delete from public.chapters where code = 'notif101';
    delete from public.stories where slug = 'notif-e2e-story';`);
  removeTestAccount(account.email);
}

/**
 * The account, its story and chapter, then what happens to it: two people follow it, teacher
 * comments (a queued job, turned into a notification by the job) and a moderator decides a case
 * about the chapter with no action.
 */
function seedNotifications() {
  createTestAccount(account.email, password, account.handle);
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating,
      first_published_at, last_chapter_published_at)
    values (${accountId}, 'notif-e2e-story', 'Clopoțelul', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'notif101', 1, 'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()
    from public.stories where slug = 'notif-e2e-story';
    insert into public.follows_users (user_id, followed_user_id) values ('${adultWriterId}', ${accountId});
    insert into public.follows_users (user_id, followed_user_id) values ('${teacherId}', ${accountId});
    with posted as (insert into public.comments (user_id, chapter_id, body)
      select '${teacherId}', id, 'Ce început frumos.' from public.chapters where code = 'notif101' returning id, chapter_id)
    insert into public.jobs (kind, payload)
    select 'comment_posted', jsonb_build_object('comment_id', id, 'chapter_id', chapter_id) from posted;
    select public.run_notification_jobs();
    insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
    select 'R-9${String(stamp).slice(-5)}', user_id, 'chapter', id, 'report', 'two_days', now() + interval '2 days'
    from public.chapters where code = 'notif101';
    update public.cases set status = 'decided', decision = 'no_action', decided_at = now(),
      decided_by_user_id = '${moderatorId}' where user_id = ${accountId};`);
}

/** A browser signed in as the throwaway account, in English. */
async function openSignedIn(browser: Browser): Promise<Page> {
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({ email: account.email, password });
  if (error !== null || data.session === null)
    throw new Error(`Could not sign in: ${error?.message}`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, data.session);
  return context.newPage();
}

test.describe('in-app notifications (S1-E7-01)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedNotifications);
  test.afterAll(cleanUp);

  test('in night mode the bell’s count is near-black on white, readable at over 7:1', async ({
    browser,
  }) => {
    // The accessibility check of 6 Nov 2026 found light text on the badge in night mode (1.5:1).
    // Since bundle G4 SHELL the count uses the theme's "on" colour: at night (NIGHT-1) white
    // (--chip-on, #f5f5f5) with near-black text (--chip-on-text, #111113), about 17:1.
    // axe can't see it: the badge is aria-hidden because the link's name already says the count.
    const page = await openSignedIn(browser);
    await page
      .context()
      .addInitScript(([key]) => localStorage.setItem(key, 'night'), [THEME_STORAGE_KEY] as const);
    await page.goto('/discover');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    const badge = page
      .getByRole('link', { name: /^Notifications, \d+ new$/ })
      .locator('span[aria-hidden=true]')
      .last();
    await expect(badge).toHaveCSS('color', 'rgb(17, 17, 19)');
    await expect(badge).toHaveCSS('background-color', 'rgb(245, 245, 245)');
    await page.context().close();
  });

  test('the bell counts what is new, the page lists it and "Mark all as read" clears it', async ({
    browser,
  }) => {
    const page = await openSignedIn(browser);
    await page.goto('/discover');
    // Step 1: the bell says three are new: the grouped followers, the comment and the decision.
    const bell = page.getByRole('link', { name: 'Notifications, 3 new' });
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByRole('heading', { level: 1, name: 'What’s new' })).toBeVisible();
    await expect(page.getByText('3 new since you last looked.')).toBeVisible();
    // Step 2: the rows, under Today.
    const today = page.getByRole('region', { name: 'Today' });
    await expect(today.getByText(/and .+ started following you\./)).toBeVisible();
    await expect(today.getByText('commented on Chapter 1 of Clopoțelul.')).toBeVisible();
    await expect(today.getByText('“Ce început frumos.”')).toBeVisible();
    await expect(today.getByText('Moderation team:')).toBeVisible();
    await expect(today.getByText('Always on')).toBeVisible();
    // Step 3: a filter narrows the list; the chosen chip says so with aria-pressed.
    const follows = page.getByRole('button', { name: /^Follows/ });
    await follows.click();
    await expect(follows).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Moderation team:')).toHaveCount(0);
    await page.getByRole('button', { name: /^All/ }).click();
    // Step 4: "Mark all as read" clears the count and the badge.
    await page.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(page.getByText('You’re all caught up.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
    await expectNoDoodles(page);
    // Step 5: the header's Settings link opens Settings › Notifications (LOOK-5; board 6.2).
    await page.getByRole('main').getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page).toHaveURL(/\/settings#notifications$/);
    await page.context().close();
  });

  for (const view of everyView(['/notifications'])) {
    test(`no serious axe issue at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The account's language wins over the browser's once the page reads it, so the view's
      // language goes on the account too; otherwise a Romanian view could switch to English.
      runSql(`update public.profiles set locale = '${view.language}' where id = ${accountId};`);
      const page = await openSignedIn(browser);
      await checkScreen(page, view);
      await page.context().close();
    });
  }
});
