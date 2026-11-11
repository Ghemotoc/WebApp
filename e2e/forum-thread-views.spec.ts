/**
 * A forum thread's view total in a real browser (bundle GAPS-16, part d; story S1-E8-02; board
 * 5.2, "Views" under "This thread").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a visitor's first visit adds one to Views, and reloading in the same tab doesn't add more;
 * - a second tab counts once more; the starter's own visit never counts;
 * - the database keeps a total only.
 * Test data: one thread teacher starts in the database, removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The thread this spec starts; its title marks its rows for clean-up. */
const threadTitle = 'How many read this e2e views';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the thread (its total goes with it) and puts the language back. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e views';
    update public.profiles set locale = 'ro' where handle = 'teacher';`);
}

/** Starts the thread as teacher. */
function startThread() {
  runSql(`with forum as (select id from public.forums where slug = 'first-chapters'),
    thread as (
      insert into public.forum_threads (user_id, forum_id, title, last_post_number)
      select '${teacherId}', forum.id, '${threadTitle}', 1 from forum returning id)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select '${teacherId}', thread.id, 1, 'Count me.' from thread;`);
}

/** The thread's address. */
function threadAddress(): string {
  const number = runSql(
    `select thread_number from public.forum_threads where title = '${threadTitle}';`,
  ).trim();
  return `/forums/first-chapters/${number}`;
}

/** The total the database holds now. */
function storedTotal(): number {
  const total = runSql(`select coalesce((select views.total from public.forum_thread_views as views
    join public.forum_threads on forum_threads.id = views.thread_id
    where forum_threads.title = '${threadTitle}'), 0);`).trim();
  return Number(total);
}

/** Opens the thread in a new tab as a persona (or a visitor), in English. */
async function openAs(browser: Browser, persona: SignInPersonaName | null): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(threadAddress());
  await expect(page.getByRole('heading', { name: threadTitle, level: 1 })).toBeVisible();
  return page;
}

/** The value beside "Views" in the side column. */
function viewsValue(page: Page) {
  return page.locator('dl > div', { has: page.getByText('Views', { exact: true }) }).locator('dd');
}

test.describe('the view total of a forum thread (GAPS-16d)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    startThread();
  });
  test.afterAll(cleanUp);

  test("a visit counts once per tab, and the starter's never", async ({ browser }) => {
    const visitor = await openAs(browser, null);
    await expect.poll(storedTotal).toBe(1);
    await visitor.reload();
    await expect(viewsValue(visitor)).toHaveText('1');
    await visitor.reload();
    await expect(viewsValue(visitor)).toHaveText('1');
    expect(storedTotal()).toBe(1);
    await visitor.context().close();

    const secondTab = await openAs(browser, null);
    await expect.poll(storedTotal).toBe(2);
    await secondTab.context().close();

    const starter = await openAs(browser, 'teacher');
    await expect(viewsValue(starter)).toHaveText('2');
    expect(storedTotal()).toBe(2);
    await starter.context().close();
  });
});
