/**
 * The formatting buttons above a forum reply, in a real browser (bundle GAPS-16, part b; story
 * S1-E8-02; board 5.2, "Formatting").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - Bold wraps the selected words in "**" and keeps them selected, so typing goes on;
 * - Ctrl+B in the box does the same, and the posted reply shows the words in bold;
 * - Add a link wraps the words and selects "https://" to type over;
 * - Quote and List mark the line;
 * - the toolbar is one Tab stop and the arrow keys move along it;
 * - the thread page with the toolbar passes axe at 390 px, night, and 1440 px, light.
 * Test data: one thread teacher starts in the database, removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const threadTitle = 'Formatting buttons e2e format';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the thread and puts the language back. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e format';
    update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
}

/** Starts the thread as teacher. */
function startThread() {
  runSql(`with forum as (select id from public.forums where slug = 'first-chapters'),
    thread as (
      insert into public.forum_threads (user_id, forum_id, title, last_post_number)
      select '${teacherId}', forum.id, '${threadTitle}', 1 from forum returning id)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select '${teacherId}', thread.id, 1, 'Try the buttons.' from thread;`);
}

/** The thread's address. */
function threadAddress(): string {
  const number = runSql(
    `select thread_number from public.forum_threads where title = '${threadTitle}';`,
  ).trim();
  return `/forums/first-chapters/${number}`;
}

/** Opens the thread as adult_writer, in English. */
async function openThread(browser: Browser): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(threadAddress());
  return page;
}

/** What the reply box holds and what is selected in it. */
async function boxState(page: Page) {
  return page.getByRole('textbox', { name: 'Reply' }).evaluate((element) => {
    const box = element as HTMLTextAreaElement;
    return {
      text: box.value,
      selected: box.value.slice(box.selectionStart, box.selectionEnd),
      isFocused: document.activeElement === box,
    };
  });
}

/** Types words into the box and selects some of them. */
async function typeAndSelect(page: Page, words: string, from: number, to: number) {
  const box = page.getByRole('textbox', { name: 'Reply' });
  await box.fill(words);
  await box.evaluate(
    (element, range) => (element as HTMLTextAreaElement).setSelectionRange(range.from, range.to),
    { from, to },
  );
}

test.describe('the formatting buttons above a reply (GAPS-16b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    startThread();
  });
  test.afterAll(cleanUp);

  test('Bold wraps the words, keeps them selected and posts in bold', async ({ browser }) => {
    const page = await openThread(browser);
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
    await typeAndSelect(page, 'a big idea', 2, 5);
    await toolbar.getByRole('button', { name: 'Bold' }).click();
    expect(await boxState(page)).toEqual({
      text: 'a **big** idea',
      selected: 'big',
      isFocused: true,
    });
    // Ctrl+B again takes the bold off, then on again.
    await page.keyboard.press('Control+b');
    expect((await boxState(page)).text).toBe('a big idea');
    await page.keyboard.press('Control+b');
    await page.getByRole('button', { name: 'Post reply' }).click();
    await expect(page.locator('article strong', { hasText: 'big' })).toBeVisible();
    await page.context().close();
  });

  test('a link selects the address, and Quote and List mark the line', async ({ browser }) => {
    const page = await openThread(browser);
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
    await typeAndSelect(page, 'see here', 4, 8);
    await toolbar.getByRole('button', { name: 'Add a link' }).click();
    expect(await boxState(page)).toMatchObject({
      text: 'see [here](https://)',
      selected: 'https://',
    });
    await typeAndSelect(page, 'one line', 0, 0);
    await toolbar.getByRole('button', { name: 'Quote' }).click();
    expect((await boxState(page)).text).toBe('> one line');
    await toolbar.getByRole('button', { name: 'List' }).click();
    expect((await boxState(page)).text).toBe('- > one line');
    await page.context().close();
  });

  test('the toolbar is one Tab stop and the arrow keys move along it', async ({ browser }) => {
    const page = await openThread(browser);
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
    await toolbar.getByRole('button', { name: 'Bold' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(toolbar.getByRole('button', { name: 'Italic' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(toolbar.getByRole('button', { name: 'List' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(toolbar.getByRole('button', { name: 'Bold' })).toBeFocused();
    // Tab leaves the toolbar for the box in one press.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: 'Reply' })).toBeFocused();
    await page.context().close();
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
