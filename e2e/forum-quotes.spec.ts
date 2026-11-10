/**
 * Quoting in forum threads and the quick reply box in a real browser (bundle FORUMS-1, part c;
 * story S1-E8-03; board 5.2 Forum thread).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - "Quote" on a post takes the reader to the reply box with that post quoted and linked; the
 *   posted reply shows the quote with a link back to the original (criterion 1);
 * - "Add to quotes" on several posts quotes them all in thread order, whatever order they were
 *   picked in; "Remove quotes" clears them (criterion 2);
 * - the quick reply box posts without leaving the page (criterion 3);
 * - a quote of a post its author deleted shows the marker, never the words;
 * - a signed-out visitor sees no quote buttons; the thread page with quotes picked passes axe at
 *   390, 768 and 1440 px, light and night, ro and en.
 * Test data: the thread this spec starts, removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The thread this spec starts; its title marks its rows for clean-up. */
const threadTitle = 'Quoting a good opening e2e quotes';

/** Removes the thread this spec starts and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e quotes';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher');`);
}

/** Opens a page as a persona (or a visitor) in English, with motion reduced. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    // The profile's language wins over the browser's, so set it first.
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/** The address of this spec's thread, read from the database. */
function threadAddress(): string {
  const number = runSql(
    `select thread_number from public.forum_threads where title = '${threadTitle}' and deleted_at is null;`,
  ).trim();
  return `/forums/first-chapters/${number}`;
}

/** One post's card on the thread page. */
function postCard(page: Page, number: number) {
  return page.locator(`#post-${number}`);
}

/** The reply box. */
function replyBox(page: Page) {
  return page.getByRole('textbox', { name: 'Reply' });
}

/** Starts the thread as adult_writer through the screens, with a reply by teacher as #2. */
async function startThread(browser: Browser) {
  const writer = await openAs(browser, 'adult_writer', '/forums/first-chapters/new');
  await writer.getByLabel('Title').fill(threadTitle);
  await writer.getByLabel('Post').fill('Open on the **choir** counting heads.');
  await writer.getByRole('button', { name: 'Post the thread' }).click();
  await expect(writer.getByRole('heading', { level: 1, name: threadTitle })).toBeVisible();
  await writer.context().close();
  const teacher = await openAs(browser, 'teacher', threadAddress());
  await replyBox(teacher).fill('One singer too many tells us something is wrong.');
  await teacher.getByRole('button', { name: 'Post reply' }).click();
  await expect(postCard(teacher, 2)).toBeVisible();
  await teacher.context().close();
}

test.describe('forum quotes and the quick reply (FORUMS-1c, S1-E8-03)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('Quote takes the reader to the reply box, and the reply links back', async ({ browser }) => {
    await startThread(browser);
    const page = await openAs(browser, 'adult_writer', threadAddress());
    await postCard(page, 2).getByRole('button', { name: 'Quote post 2' }).click();
    await expect(replyBox(page)).toBeFocused();
    const picked = page.getByRole('group', { name: 'The posts you’re quoting' });
    await expect(picked.getByText('1 post quoted')).toBeVisible();
    await expect(picked.getByText('One singer too many', { exact: false })).toBeVisible();
    // The quick reply box posts without leaving the page (criterion 3).
    await page.evaluate(() => {
      (window as unknown as { stayed: boolean }).stayed = true;
    });
    await replyBox(page).fill('Yes, that line is the hook.');
    await page.getByRole('button', { name: 'Post reply' }).click();
    const reply = postCard(page, 3);
    await expect(reply.locator('blockquote')).toContainText('One singer too many');
    await expect(reply.locator('blockquote').getByRole('link', { name: '#2' })).toHaveAttribute(
      'href',
      /\?post=2$/,
    );
    expect(await page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(
      true,
    );
    await expect(page.getByRole('group', { name: 'The posts you’re quoting' })).toHaveCount(0);
    await page.context().close();
  });

  test('Add to quotes quotes several posts in thread order; Remove quotes clears them', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', threadAddress());
    await postCard(page, 3).getByRole('button', { name: 'Add to quotes: post 3' }).click();
    await postCard(page, 1).getByRole('button', { name: 'Add to quotes: post 1' }).click();
    await expect(
      postCard(page, 1).getByRole('button', { name: 'Added to quotes: post 1' }),
    ).toHaveAttribute('aria-pressed', 'true');
    const picked = page.getByRole('group', { name: 'The posts you’re quoting' });
    await expect(picked.getByText('2 posts quoted')).toBeVisible();
    await picked.getByRole('button', { name: 'Remove quotes' }).click();
    await expect(picked).toHaveCount(0);
    // Pick them again, out of order, and post: the reply quotes #1 then #3.
    await postCard(page, 3).getByRole('button', { name: 'Add to quotes: post 3' }).click();
    await postCard(page, 1).getByRole('button', { name: 'Add to quotes: post 1' }).click();
    await replyBox(page).fill('Both of these, together.');
    await page.getByRole('button', { name: 'Post reply' }).click();
    const quotes = postCard(page, 4).locator('blockquote > p:first-child');
    await expect(quotes).toHaveCount(2);
    await expect(quotes.nth(0)).toContainText('#1');
    await expect(quotes.nth(1)).toContainText('#3');
    await page.context().close();
  });

  test('a quote of a deleted post shows the marker, not the words', async ({ browser }) => {
    const teacher = await openAs(browser, 'teacher', threadAddress());
    await postCard(teacher, 2).getByRole('button', { name: 'Delete post 2' }).click();
    await teacher.getByRole('button', { name: 'Delete the post' }).click();
    await expect(postCard(teacher, 2).getByText('Post deleted')).toBeVisible();
    await expect(postCard(teacher, 3).locator('blockquote')).toContainText(
      'This post was deleted.',
    );
    await expect(postCard(teacher, 3)).not.toContainText('One singer too many');
    await teacher.context().close();
  });

  test('a signed-out visitor sees no quote buttons', async ({ browser }) => {
    const page = await openAs(browser, null, threadAddress());
    await expect(postCard(page, 1)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Quote post/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Add to quotes/ })).toHaveCount(0);
    await page.context().close();
  });

  test('axe: the thread page with a post picked, every view', async ({ page }) => {
    // Every view times one page with a pick: longer than the default 30 s.
    test.setTimeout(180_000);
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    for (const view of everyView([threadAddress()])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view, async () => {
        await postCard(page, 1)
          .getByRole('button')
          .filter({ hasText: /^(Add to quotes|Adaugă la citate)$/ })
          .click();
      });
    }
  });
});
