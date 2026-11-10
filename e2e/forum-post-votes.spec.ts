/**
 * Votes on forum posts in a real browser (bundle GAPS-16, part c; stories S1-E8-02 and S1-E6-04;
 * board 5.2, the vote chip under every post and "How votes work").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a member upvotes someone else's post: the chip is pressed, shows a tick and counts 1, and
 *   stays so after a reload;
 * - Downvote privately swaps the vote: the count goes back to 0, the round button is pressed and
 *   "Only moderators see downvotes." shows; pressed again, the vote is gone;
 * - the post's author and a visitor see the count but no buttons, and never a downvote number;
 * - the side column explains how votes work;
 * - the thread page with the vote chip passes axe at 390 and 1440 px, light and night.
 * Test data: one thread teacher starts in the database, removed before and after (its votes go
 * with it).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The thread this spec starts; its title marks its rows for clean-up. */
const threadTitle = 'Votes on posts e2e votes';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the thread (its posts and votes go with it) and puts the languages back. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e votes';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher');`);
}

/** Starts the thread as teacher. */
function startThread() {
  runSql(`with forum as (select id from public.forums where slug = 'first-chapters'),
    thread as (
      insert into public.forum_threads (user_id, forum_id, title, last_post_number)
      select '${teacherId}', forum.id, '${threadTitle}', 1 from forum returning id)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select '${teacherId}', thread.id, 1, 'Which opening works best?' from thread;`);
}

/** The thread's address. */
function threadAddress(): string {
  const number = runSql(
    `select thread_number from public.forum_threads where title = '${threadTitle}';`,
  ).trim();
  return `/forums/first-chapters/${number}`;
}

/** Opens the thread as a persona (or a visitor) in English. */
async function openAs(browser: Browser, persona: SignInPersonaName | null): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(threadAddress());
  return page;
}

test.describe('votes on forum posts (GAPS-16c)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    startThread();
  });
  test.afterAll(cleanUp);

  test('a member upvotes, swaps to a private downvote and takes it back', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer');
    const upvote = page.getByRole('button', { name: /^0 upvotes\. Upvote post 1$/ });
    await upvote.click();
    const upvoted = page.getByRole('button', { name: '1 upvote. Upvote post 1' });
    await expect(upvoted).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(upvoted).toHaveAttribute('aria-pressed', 'true');
    // The private downvote swaps the vote; only the voter sees that they downvoted.
    const downvote = page.getByRole('button', { name: 'Downvote post 1 privately' });
    await downvote.click();
    await expect(downvote).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '0 upvotes. Upvote post 1' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByText('Only moderators see downvotes.')).toBeVisible();
    await downvote.click();
    await expect(downvote).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('Only moderators see downvotes.')).toBeHidden();
    // Leave one upvote for the next test.
    await page.getByRole('button', { name: '0 upvotes. Upvote post 1' }).click();
    await expect(upvoted).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'How votes work' })).toBeVisible();
    await page.context().close();
  });

  test('the author and a visitor see the count but no buttons', async ({ browser }) => {
    for (const persona of ['teacher', null] as const) {
      const page = await openAs(browser, persona);
      await expect(page.getByText('1 upvote', { exact: true })).toBeAttached();
      await expect(page.getByRole('button', { name: /Upvote post 1/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Downvote post 1/ })).toHaveCount(0);
      await expect(page.getByText(/downvotes?\b/i).filter({ hasText: /\d/ })).toHaveCount(0);
      await page.context().close();
    }
  });

  for (const view of [
    { width: 390, theme: 'night' },
    { width: 1440, theme: 'light' },
  ] as const) {
    test(`axe: the thread page at ${view.width} px, ${view.theme}`, async ({ browser }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, address: threadAddress(), language: 'en' });
      await context.close();
    });
  }
});
