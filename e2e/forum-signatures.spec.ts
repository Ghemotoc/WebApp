/**
 * Forum signatures and moderators' change requests in a real browser (bundle FORUMS-2, part d;
 * story S1-E8-08; boards 6.1, 6.3 and 5.2).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a writer saves a signature in Settings, with the counts; a fourth line is refused before
 *   saving (criterion 1);
 * - a moving picture is refused in words, and a still one passes the (stub) check;
 * - the signature shows on the writer's profile, and under their forum post from 768 px up but
 *   not at phone width (criterion 2; Q25);
 * - a moderator asks for a change on the staff account page; the writer is told in Notifications
 *   and in Settings (criterion 3; Q29);
 * - the Settings and profile pages pass axe at 390, 768 and 1440 px, light and night, ro and en,
 *   and no doodle is drawn.
 * Test data: adult_writer's signature and one thread "Semnături e2e" they start here. Everything
 * is removed before and after, with the requests, notifications and pictures made here.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** adult_writer's user ID (the seed's), for the staff page's address and the clean-up. */
const writerId = '00000000-0000-4000-8000-000000000001';
const threadTitle = 'Semnături e2e';
const signatureText = 'Writing The Salt Mine Choir.\nNew chapter most Fridays.';

/** A 1 by 1 pixel PNG, enough for the stub check. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** The smallest shape of a moving WebP: RIFF, WEBP and an ANIM chunk. */
const movingWebp = Buffer.concat([
  Buffer.from('RIFF\0\0\0\0WEBPANIM', 'latin1'),
  Buffer.from([6, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
]);

/** Takes off everything this spec makes and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`
    update public.feature_flags set is_enabled = false where key = 'picture_uploads';
    update public.profiles set signature = null, signature_picture_id = null where id = '${writerId}';
    delete from public.notifications where change_request_id is not null;
    delete from public.customisation_change_requests where user_id = '${writerId}';
    delete from public.forum_threads where title = '${threadTitle}';
    delete from public.picture_checks where kind = 'signature_picture';
    delete from public.rate_limit_events where user_id = '${writerId}';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'moderator');`);
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

/** Starts adult_writer's thread, as adult_writer, and answers its address. */
function startThread(): string {
  const number =
    runSql(`select set_config('request.jwt.claims', '{"sub": "${writerId}", "role": "authenticated"}', false);
    select public.start_forum_thread('first-chapters', '${threadTitle}', 'Prima postare.') ->> 'thread_number';`)
      .split('\n')
      .at(-1);
  return `/forums/first-chapters/${number ?? ''}`;
}

/** The signature section in Settings. */
function signatureSection(page: Page) {
  return page.getByRole('region', { name: 'Forum signature' });
}

test.describe('forum signatures (FORUMS-2d, S1-E8-08)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a writer saves a signature within the limits', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/settings#forum-signature');
    const section = signatureSection(page);
    const field = section.getByLabel('Your signature');
    await field.fill('one\ntwo\nthree\nfour');
    await expect(section.getByText('That’s 4 lines. A signature can have up to 3.')).toBeVisible();
    await field.fill(signatureText);
    await expect(section.getByText('54 of 300 characters, 2 of 3 lines')).toBeVisible();
    await section.getByRole('button', { name: 'Save signature' }).click();
    await expect(section.getByText('Your signature is saved.')).toBeVisible();
    await page.context().close();
  });

  test('a moving picture is refused; a still one passes its check', async ({ browser }) => {
    // The local server signs check results with PICTURE_CHECK_SECRET (playwright.config.ts); the
    // database checks them against the same value in its Vault. Never a real secret.
    runSql(`update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret')
      where not exists (select 1 from vault.secrets where name = 'picture_check_secret');`);
    const page = await openAs(browser, 'adult_writer', '/settings#forum-signature');
    const section = signatureSection(page);
    const chooser = section.getByLabel('Choose a signature picture');
    await chooser.setInputFiles({
      name: 'moving.webp',
      mimeType: 'image/webp',
      buffer: movingWebp,
    });
    await expect(
      section.getByText('A signature picture can’t move. Choose a still picture.'),
    ).toBeVisible();
    await chooser.setInputFiles({ name: 'moon.png', mimeType: 'image/png', buffer: tinyPng });
    await expect(section.getByText('Your picture passed the check.').first()).toBeVisible();
    await expect(section.getByRole('img', { name: 'Your signature picture' })).toBeVisible();
    await page.context().close();
  });

  test('it shows on the profile and under posts, but not at phone width', async ({ browser }) => {
    const address = startThread();
    const page = await openAs(browser, 'moderator', '/u/adult_writer');
    const card = page.getByRole('region', { name: 'Forum signature' });
    await expect(card.getByText('New chapter most Fridays.')).toBeVisible();
    await page.goto(address);
    const signature = page.locator('#post-1').getByTestId('post-signature');
    await expect(signature).toBeVisible();
    await expect(signature.getByText('Writing The Salt Mine Choir.')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(signature).toBeHidden();
    await page.context().close();
  });

  test('a moderator asks for a change, and the writer is told', async ({ browser }) => {
    const staff = await openAs(browser, 'moderator', `/staff/users/${writerId}`);
    const form = staff.getByRole('region', { name: 'Ask for a change' });
    await form.getByLabel('Why it needs changing').fill('No adverts in signatures, please.');
    await form.getByRole('button', { name: 'Send the request' }).click();
    await expect(form.getByText(/Request sent/)).toBeVisible();
    await staff.context().close();

    const writer = await openAs(browser, 'adult_writer', '/notifications');
    const row = writer
      .getByRole('listitem')
      .filter({ hasText: 'please change your forum signature' });
    await expect(row.getByText('No adverts in signatures, please.')).toBeVisible();
    await row.getByRole('link').click();
    await expect(writer).toHaveURL(/\/settings#forum-signature$/);
    await expect(
      signatureSection(writer).getByText(/A moderator asked you to change your signature/),
    ).toBeVisible();
    await writer.context().close();
  });

  /**
   * Checks every view of one page as adult_writer.
   *
   * @param browser - the test's browser
   * @param address - the page
   */
  async function checkEveryView(browser: Browser, address: string) {
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    for (const view of everyView([address])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(page, view);
      await expectNoDoodles(page);
    }
    await context.close();
  }

  test('axe: Settings with the signature section and its picture, every view', async ({
    browser,
  }) => {
    // 12 views in one signed-in browser take longer than one test's usual 30 s.
    test.setTimeout(240_000);
    runSql(`update public.feature_flags set is_enabled = true where key = 'picture_uploads';`);
    await checkEveryView(browser, '/settings');
  });

  test('axe: the profile with its signature card, every view', async ({ browser }) => {
    test.setTimeout(240_000);
    runSql(`update public.feature_flags set is_enabled = false where key = 'picture_uploads';`);
    await checkEveryView(browser, '/u/adult_writer');
  });
});
