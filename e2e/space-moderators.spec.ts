/**
 * Space moderators in a real browser (bundle FORUMS-2, part b; story S1-E8-07;
 * design/boards/Space.dc.html's "Who runs it" and the settings' Moderators field).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the owner adds a member as a moderator by username with chosen powers, and "Who runs it" shows
 *   them with those powers (criterion 1);
 * - a moderator with the members power sees "Members", removes a member with a reason, is never
 *   offered to remove the owner, and can't open the log or change the settings;
 * - the owner reads the moderation log: who did what, and the reason (criterion 2);
 * - the settings with the Moderators card, the members page and the log pass axe at 390, 768 and
 *   1440 px, light and night, ro and en, and no doodle is drawn.
 * Test data: the seeded 16+ space "fantasy-writers-circle" (adult_writer owns it, teacher is a
 * member). blocker joins it here; teacher's powers, blocker's membership and the space's log are
 * put back before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The seeded 16+ space. */
const fantasyAddress = '/spaces/fantasy-writers-circle';
/** The reason this spec gives, which the log must show. */
const removalReason = 'Spam e2e';

/** Puts the space back as the seed left it: teacher a plain member, blocker out, no log. */
function cleanUp() {
  runSql(`update public.space_members set role = 'member', powers = '{}'
      where user_id = (select id from public.profiles where handle = 'teacher')
        and space_id = (select id from public.spaces where slug = 'fantasy-writers-circle');
    delete from public.space_members
      where user_id = (select id from public.profiles where handle = 'blocker')
        and space_id = (select id from public.spaces where slug = 'fantasy-writers-circle');
    delete from public.space_moderation_log
      where space_id = (select id from public.spaces where slug = 'fantasy-writers-circle');
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher');`);
}

/** Puts blocker into the space as a plain member, as approving them would. */
function addBlocker() {
  runSql(`insert into public.space_members (user_id, space_id, role, status, joined_at)
    select profiles.id, spaces.id, 'member', 'active', now()
    from public.profiles, public.spaces
    where profiles.handle = 'blocker' and spaces.slug = 'fantasy-writers-circle'
    on conflict on constraint space_members_once do nothing;`);
}

/** Opens a page as a persona in English, with motion reduced. */
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

test.describe('space moderators (FORUMS-2b, S1-E8-07)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    addBlocker();
  });
  test.afterAll(cleanUp);

  test('the owner makes a member a moderator with two powers', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `${fantasyAddress}/settings`);
    await expect(page.getByRole('heading', { level: 2, name: 'Moderators' })).toBeVisible();
    await page.getByLabel('Username').fill('@teacher');
    const choices = page.getByRole('group', { name: 'What they can do' });
    await expect(choices.getByRole('checkbox', { name: 'Threads' })).toBeChecked();
    await choices.getByRole('checkbox', { name: 'Members' }).check();
    await page.getByRole('button', { name: 'Make moderator' }).click();
    await expect(page.getByText('@teacher is now a moderator.')).toBeVisible();
    await expect(page.getByRole('group', { name: 'What teacher can do' })).toBeVisible();

    await page.goto(fantasyAddress);
    const runs = page.getByRole('region', { name: 'Who runs it' });
    await expect(runs.getByText('Moderator: threads and members')).toBeVisible();
    await page.context().close();
  });

  test('a moderator with the members power removes a member, never the owner', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', fantasyAddress);
    await expect(page.getByText('You help moderate this space.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Members', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Moderation log' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Space settings' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Members', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Lia Scrie' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Remove blocker' }).click();
    await page.getByLabel('Why remove blocker? (optional)').fill(removalReason);
    await page.getByRole('button', { name: 'Yes, remove blocker' }).click();
    await expect(page.getByText('blocker is no longer in the space.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove blocker' })).toHaveCount(0);

    await page.goto(`${fantasyAddress}/log`);
    await expect(
      page.getByText('Only the space’s owner can read its moderation log.'),
    ).toBeVisible();
    await page.context().close();
  });

  test('the owner reads who did what in the moderation log', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `${fantasyAddress}/log`);
    await expect(page.getByRole('heading', { level: 1, name: 'Moderation log' })).toBeVisible();
    await expect(page.getByText('teacher removed blocker from the space.')).toBeVisible();
    await expect(page.getByText(`Reason: “${removalReason}”`)).toBeVisible();
    await expect(
      page.getByText('Lia Scrie made teacher a moderator: threads and members.'),
    ).toBeVisible();
    await page.context().close();
  });

  test('axe: the settings, members and log pages, every view', async ({ browser }) => {
    // 36 views of three pages in one signed-in browser take longer than one test's usual 30 s.
    test.setTimeout(360_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    const addresses = ['settings', 'members', 'log'].map((part) => `${fantasyAddress}/${part}`);
    for (const view of everyView(addresses)) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view);
      await expectNoDoodles(page);
    }
    await context.close();
  });
});
