/**
 * Space banner pictures, join notifications and the search filter by space in a real browser
 * (bundle FORUMS-2, part c; stories S1-E8-06 and S1-E8-10; design/boards/Space.dc.html).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - someone asks to join a space that approves each request; its owner is told in Notifications,
 *   and the row opens the space at "Requests to join"; once let in, the person is told they are in;
 * - the owner uploads a banner picture on the space's settings; it passes the (stub) check and
 *   shows across the top of the space; "Use the colour instead" brings the colour back and the
 *   file is deleted;
 * - the forum search's filter lists spaces ("Space: <name>") and keeps the space chosen;
 * - the settings page with the Banner picture card passes axe at 390, 768 and 1440 px, light and
 *   night, ro and en, and no doodle touches text or a control.
 * Test data: a 16+ space "Banner club e2e" made here, owned by teacher; blocker asks to join. Both
 * are removed before and after, with the notifications and pictures they made.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** This spec's space and its addresses. */
const spaceId = 'e2e2c000-0000-4000-a000-000000000001';
const spaceName = 'Banner club e2e';
const spaceAddress = '/spaces/banner-club-e2e';

/** A 1 by 1 pixel PNG, enough for the stub check. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Removes the space, its notifications and pictures, and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`
    update public.feature_flags set is_enabled = false where key = 'picture_uploads';
    delete from public.notifications where space_id = '${spaceId}';
    delete from public.space_moderation_log where space_id = '${spaceId}';
    delete from public.space_members where space_id = '${spaceId}';
    delete from public.forums where space_id = '${spaceId}';
    delete from public.spaces where id = '${spaceId}';
    delete from public.picture_checks where kind = 'space_banner';
    delete from public.rate_limit_events where user_id = '00000000-0000-4000-8000-000000000007';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'blocker');`);
}

/** Makes the space as create_space() would: the row, its hidden forum and its owner. */
function makeSpace() {
  runSql(`
    insert into public.spaces (id, user_id, slug, name, name_key, description, rules, age_group,
      readers, posting, joining, banner)
    values ('${spaceId}', '00000000-0000-4000-8000-000000000007', 'banner-club-e2e', '${spaceName}',
      public.space_name_key('${spaceName}'), 'Pictures at the top.', 'Be kind.', '16_plus',
      'everybody', 'members', 'approve', 'gold');
    insert into public.forums (slug, space_id) values ('space-banner-club-e2e', '${spaceId}');
    select public.write_space_forum_names('${spaceId}', '${spaceName}');
    insert into public.space_members (user_id, space_id, role, status, joined_at)
    values ('00000000-0000-4000-8000-000000000007', '${spaceId}', 'owner', 'active', now());`);
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

test.describe('space banners and join notifications (FORUMS-2c)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    makeSpace();
  });
  test.afterAll(cleanUp);

  test('a request reaches the owner, and being let in reaches the person', async ({ browser }) => {
    const asker = await openAs(browser, 'blocker', spaceAddress);
    await asker.getByRole('button', { name: 'Join space' }).click();
    await expect(asker.getByRole('button', { name: 'Take back request' })).toBeVisible();

    const owner = await openAs(browser, 'teacher', '/notifications');
    const requestRow = owner
      .getByRole('listitem')
      .filter({ hasText: `asked to join ${spaceName}.` });
    await expect(requestRow.getByText('See the requests')).toBeVisible();
    await requestRow.getByRole('link').click();
    await expect(owner).toHaveURL(new RegExp(`${spaceAddress}#join-requests$`));
    const requests = owner.getByRole('region', { name: 'Requests to join' });
    await requests.getByRole('button', { name: /^Approve / }).click();
    await owner.context().close();

    await asker.goto('/notifications');
    await expect(asker.getByText(`you’re in ${spaceName}. You can now post there.`)).toBeVisible();
    await asker.context().close();
  });

  test('the owner adds a banner picture, then goes back to the colour', async ({ browser }) => {
    // The local server signs check results with PICTURE_CHECK_SECRET (playwright.config.ts); the
    // database checks them against the same value in its Vault. Never a real secret.
    runSql(`update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret')
      where not exists (select 1 from vault.secrets where name = 'picture_check_secret');`);
    const page = await openAs(browser, 'teacher', `${spaceAddress}/settings`);
    const card = page.getByRole('region', { name: 'Banner picture' });
    await expect(card.getByText('Your space uses its colour.')).toBeVisible();
    await card.getByLabel('Choose a banner picture').setInputFiles({
      name: 'banner.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    await expect(card.getByText('Your picture passed the check.')).toBeVisible();
    await expect(card.getByText('Your banner picture is up.')).toBeVisible();

    await page.goto(spaceAddress);
    await expect(page.getByTestId('space-banner-picture')).toHaveCount(1);

    await page.goto(`${spaceAddress}/settings`);
    await card.getByRole('button', { name: 'Use the colour instead' }).click();
    await expect(card.getByText('Your space uses its colour.')).toBeVisible();
    // The replaced picture's file is gone from Storage too.
    await expect
      .poll(() => runSql(`select count(*) from storage.objects where bucket_id = 'space-banners'`))
      .toBe('0');
    await page.goto(spaceAddress);
    await expect(page.getByTestId('space-banner-band')).toBeVisible();
    await expect(page.getByTestId('space-banner-picture')).toHaveCount(0);
    await page.context().close();
  });

  test('the forum search can be narrowed to one space', async ({ browser }) => {
    const page = await openAs(
      browser,
      'teacher',
      '/forums/search?q=maps&forum=space-banner-club-e2e',
    );
    const filter = page.getByLabel('Forum', { exact: true });
    await expect(filter).toHaveValue('space-banner-club-e2e');
    await expect(filter.locator('option', { hasText: `Space: ${spaceName}` })).toHaveCount(1);
    await page.context().close();
  });

  test('axe: the settings page with the banner card, every view', async ({ browser }) => {
    // 12 views in one signed-in browser take longer than one test's usual 30 s.
    test.setTimeout(240_000);
    runSql(`update public.feature_flags set is_enabled = true where key = 'picture_uploads';`);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    const page = await context.newPage();
    for (const view of everyView([`${spaceAddress}/settings`])) {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      await checkScreen(page, view);
      await expectNoDoodleOverlap(page);
    }
    runSql(`update public.feature_flags set is_enabled = false where key = 'picture_uploads';`);
    await context.close();
  });
});
