/**
 * Spaces people create in a real browser (bundle FORUMS-2, part a; story S1-E8-06;
 * design/boards/Space.dc.html).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a member creates a space: the name is checked as they type (a taken name says so, a free one
 *   says it is available), and the new space opens with its rules (criteria 1 and 2);
 * - someone outside a space that approves each request asks to join, sees "Take back request"
 *   and can't start a thread yet; the owner approves them from "Requests to join"; then they
 *   start a thread in the space, whose breadcrumb goes back through the space (criteria 3 and 4);
 * - a visitor reads a 16+ space, is asked to log in to join, and can't find an under-16 space
 *   whose readers are members only (criterion 5); the forum index shows the Spaces card;
 * - /spaces, a space and the create form pass axe at 390, 768 and 1440 px, light and night, ro
 *   and en, and no doodle touches text or a control.
 * Test data: the seeded spaces (supabase/seed.sql, FORUMS-2a); the space and thread this spec
 * makes and blocker's membership are removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The seeded 16+ space: adult_writer owns it, members post and the owner approves each request. */
const fantasyAddress = '/spaces/fantasy-writers-circle';

/** The space and the thread this spec makes; their names mark them for clean-up. */
const newSpaceName = 'Short sci-fi club e2e';
const threadTitle = 'Maps that lie: share yours e2e';

/** Removes what this spec makes and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e';
    delete from public.forums where space_id in (select id from public.spaces where name like '%e2e');
    delete from public.space_members where space_id in (select id from public.spaces where name like '%e2e');
    delete from public.spaces where name like '%e2e';
    delete from public.space_members
      where user_id = (select id from public.profiles where handle = 'blocker')
        and space_id = (select id from public.spaces where slug = 'fantasy-writers-circle');
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'blocker');`);
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

test.describe('spaces people create (FORUMS-2a, S1-E8-06)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a member creates a space with a name nobody else has', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/spaces/new');
    await expect(page.getByRole('heading', { level: 1, name: 'Create a space' })).toBeVisible();
    const name = page.getByLabel('Name', { exact: true });
    await name.fill('Fantasy writers’ circle');
    await expect(page.getByText('Another space has this name. Try another.')).toBeVisible();
    await name.fill(newSpaceName);
    await expect(page.getByText('This name is available.')).toBeVisible();
    await page.getByLabel('Description').fill('Short science fiction under 5,000 words.');
    await page.getByLabel('Rules (optional)').fill('Stories under 5,000 words only.\nBe kind.');
    await page.getByRole('button', { name: 'Create space' }).click();
    await expect(page).toHaveURL(/\/spaces\/short-sci-fi-club-e2e$/);
    await expect(page.getByRole('heading', { level: 1, name: newSpaceName })).toBeVisible();
    await expect(page.getByText('Be kind.')).toBeVisible();
    await expect(page.getByText('You run this space.')).toBeVisible();
    await page.context().close();
  });

  test('someone outside asks to join and can’t post yet', async ({ browser }) => {
    const page = await openAs(browser, 'blocker', fantasyAddress);
    await expect(page.getByText('The owner approves new members.')).toBeVisible();
    await expect(page.getByText(/Only members can post here/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start a thread' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Join space' }).click();
    await expect(page.getByRole('button', { name: 'Take back request' })).toBeVisible();
    await expect(page.getByText(/will see your request/)).toBeVisible();
    await page.context().close();
  });

  test('the owner approves the request', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', fantasyAddress);
    const requests = page.getByRole('region', { name: 'Requests to join' });
    await requests.getByRole('button', { name: /^Approve / }).click();
    await expect(requests.getByText(/is in\./)).toBeVisible();
    await page.context().close();
  });

  test('the new member starts a thread in the space', async ({ browser }) => {
    const page = await openAs(browser, 'blocker', fantasyAddress);
    await expect(page.getByText('You’re a member of this space.')).toBeVisible();
    await page.getByRole('link', { name: 'Start a thread' }).click();
    await expect(page).toHaveURL(/\/spaces\/fantasy-writers-circle\/new$/);
    await page.getByLabel('Title').fill(threadTitle);
    await page.getByLabel('Your post').fill('Mine has a river that runs uphill.');
    await page.getByRole('button', { name: 'Post the thread' }).click();
    await expect(page).toHaveURL(/\/forums\/space-fantasy-writers-circle\/\d+/);
    const breadcrumb = page.getByRole('navigation', { name: 'Where you are' });
    await expect(breadcrumb.getByRole('link', { name: 'Fantasy writers’ circle' })).toBeVisible();
    await page.context().close();
  });

  test('a visitor reads a 16+ space but not a members-only under-16 one', async ({ browser }) => {
    const page = await openAs(browser, null, fantasyAddress);
    await expect(page.getByRole('link', { name: 'Log in to join' })).toBeVisible();
    await expect(page.getByText(threadTitle)).toBeVisible();
    await page.goto('/spaces/young-poets');
    await expect(page.getByRole('heading', { name: 'This space isn’t here' })).toBeVisible();
    await page.goto('/forums');
    const card = page.getByRole('region', { name: 'Spaces' });
    await expect(card.getByRole('link', { name: 'Fantasy writers’ circle' })).toBeVisible();
    await expect(card.getByRole('link', { name: /^See / })).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView(['/spaces', fantasyAddress, '/spaces/new'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
      await expectNoDoodleOverlap(page);
    });
  }

  test('axe: the create form for a signed-in member, every view', async ({ browser }) => {
    // 24 views of two pages in one signed-in browser take longer than one test's usual 30 s.
    test.setTimeout(240_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    for (const view of everyView(['/spaces/new', `${fantasyAddress}/settings`])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view);
      await expectNoDoodleOverlap(page);
    }
    await context.close();
  });
});
