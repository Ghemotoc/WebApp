/**
 * Bundle BOOKS-7 (Together and spaces, boards F04 and F06) in a real browser.
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - F06, the Spaces page: a reader asks to join a space from "More spaces", the button says it is
 *   pressed ("Asked"), pressing it again takes the request back, and "Sort spaces" changes the
 *   line under the heading (user story 7.6);
 * - F04, New thread at /forums/new: "Post the thread" stays pressable and says what is missing
 *   beside the field, the forum first, then the title (design books item 9; user story 7.4).
 * The space's moderators, blocks and log are in space-moderators.spec.ts.
 * Test data: the seeded 16+ space "fantasy-writers-circle"; pending_check's request is taken out before
 * and after.
 */
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Takes pending_check's request to join the seeded space out, as the seed left it. */
function cleanUp() {
  runSql(`delete from public.space_members
      where user_id = (select id from public.profiles where handle = 'pending_check')
        and space_id = (select id from public.spaces where slug = 'fantasy-writers-circle');
    update public.profiles set locale = 'ro' where handle in ('pending_check', 'adult_writer');`);
}

/** Opens a page as a persona in English. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  // The profile's language wins over the browser's, so set it first.
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Together and spaces (BOOKS-7)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a reader asks to join from More spaces, takes it back, and sorts the list', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'pending_check', '/spaces');
    const more = page.getByRole('region', { name: 'More spaces' });
    await more.getByRole('button', { name: 'Ask to join Fantasy writers’ circle' }).click();
    const asked = more.getByRole('button', {
      name: 'Asked to join Fantasy writers’ circle. Press to take back the request.',
    });
    await expect(asked).toHaveAttribute('aria-pressed', 'true');
    await asked.click();
    await expect(
      more.getByRole('button', { name: 'Ask to join Fantasy writers’ circle' }),
    ).toBeVisible();
    await more.getByLabel('Sort spaces').selectOption({ label: 'Most members' });
    await expect(
      more.getByText('Spaces for members 16 and over, the most members first'),
    ).toBeVisible();
    await page.context().close();
  });

  test('New thread says what is missing beside the field: the forum, then the title', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/forums/new');
    const post = page.getByRole('button', { name: 'Post the thread' });
    await expect(post).toBeEnabled();
    await post.click();
    await expect(page.getByText('Pick a forum.')).toBeVisible();
    await expect(page.getByLabel('Forum')).toBeFocused();
    await page.getByLabel('Forum').selectOption({ index: 1 });
    await post.click();
    await expect(page.getByText('Add a title.')).toBeVisible();
    await page.context().close();
  });
});
