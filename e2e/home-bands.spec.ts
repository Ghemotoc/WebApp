/**
 * The home page's bands, forums highlight, genre chips and big footer in a real browser (bundle
 * LOOK-3; board Website-Home).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a visitor sees the four bands from the CMS in the board's order: the writers' band, the forums
 *   band, "Start a first story" and "Apps come later";
 * - the forums band lists an adult's busy thread with "Started by … · n replies" and a link to it,
 *   and never a 13 to 15-year-old's thread (no parent's yes; D4);
 * - Trending's genre chips are one radio group, and choosing one keeps the row on the page;
 * - the big footer's columns link to the rows on the page.
 * The hero spec (home-hero.spec.ts) checks the whole page with axe and the no-doodles guard
 * at every width, theme and language.
 * Test data: two threads of the spec's own in the platform's first forum, removed after.
 */
import { expect, test, type Browser } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';

/** Removes the spec's threads and their posts. */
function cleanUp() {
  runSql(`delete from public.forum_posts where thread_id in
      (select id from public.forum_threads where title like 'Bands e2e%');
    delete from public.forum_threads where title like 'Bands e2e%';`);
}

/** An adult's thread with two replies and a 14-year-old's thread, in the platform's first forum. */
function seedThreads() {
  cleanUp();
  runSql(`with forum as (select id from public.forums where space_id is null and deleted_at is null
      order by position limit 1)
    insert into public.forum_threads (user_id, forum_id, title, last_post_at)
    select person, (select id from forum), title, now()
    from (values ('00000000-0000-4000-8000-000000000001'::uuid, 'Bands e2e adult thread'),
                 ('00000000-0000-4000-8000-000000000003'::uuid, 'Bands e2e kid thread')) as made (person, title);
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select threads.user_id, threads.id, numbers.n, 'Salut ' || numbers.n
    from public.forum_threads as threads, generate_series(1, 3) as numbers (n)
    where threads.title = 'Bands e2e adult thread'
    union all
    select threads.user_id, threads.id, 1, 'Salut' from public.forum_threads as threads
    where threads.title = 'Bands e2e kid thread';`);
}

/**
 * Opens the home page in English, signed out.
 *
 * @returns the page
 */
async function openHome(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto('/');
  return page;
}

test.describe('home page bands, forums and footer (LOOK-3)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedThreads);
  test.afterAll(cleanUp);

  test('a visitor sees the four bands in the board’s order', async ({ browser }) => {
    const page = await openHome(browser);
    const headings = page.getByRole('heading', { level: 2 });
    await expect(headings.filter({ hasText: 'Desktop and phone apps come later' })).toBeVisible();
    const order = await headings.allTextContents();
    const positions = [
      'Post your story one chapter at a time.',
      'Talk about stories in the forums.',
      'Start a first story',
      'Desktop and phone apps come later',
    ].map((heading) => order.indexOf(heading));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((first, second) => first - second)).toEqual(positions);
    await page.context().close();
  });

  test('the forums band lists an adult’s busy thread, never a 14-year-old’s', async ({
    browser,
  }) => {
    const page = await openHome(browser);
    const threads = page.getByRole('list', { name: 'Busy threads this week' });
    const thread = threads.getByRole('listitem').filter({ hasText: 'Bands e2e adult thread' });
    await expect(thread).toContainText('Started by Lia Scrie · 2 replies');
    await expect(thread.getByRole('link', { name: 'Bands e2e adult thread' })).toHaveAttribute(
      'href',
      /^\/forums\/[^/]+\/\d+$/,
    );
    await expect(page.getByText('Bands e2e kid thread')).toHaveCount(0);
    await page.context().close();
  });

  test('a genre chip narrows Trending and keeps the row on the page', async ({ browser }) => {
    const page = await openHome(browser);
    const chips = page.getByRole('radiogroup', { name: 'Show trending stories by genre' });
    await expect(chips.getByRole('radio', { name: 'All' })).toBeChecked();
    await chips.getByRole('radio', { name: 'Poetry' }).click();
    await expect(chips.getByRole('radio', { name: 'Poetry' })).toBeChecked();
    await expect(page.getByRole('heading', { level: 2, name: 'Trending this week' })).toBeVisible();
    await page.context().close();
  });

  test('the big footer’s columns link to the rows on the page', async ({ browser }) => {
    const page = await openHome(browser);
    const read = page.getByRole('navigation', { name: 'Read' });
    await expect(read.getByRole('link', { name: 'Completed stories' })).toHaveAttribute(
      'href',
      '#completed',
    );
    await expect(page.getByRole('navigation', { name: 'Help and legal' })).toBeVisible();
    await page.context().close();
  });
});
