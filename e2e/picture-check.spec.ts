/**
 * Uploading a picture and the picture check in a real browser (story S1-E10-05; CLAUDE.md rule
 * 19: every uploaded picture is checked before anyone else sees it).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). The
 * local server's /api/picture-check always uses the stub provider: a file passes unless its name
 * ends in _fail, _gore, _match or _down.
 * What it proves (with the picture_uploads flag switched on for the test):
 * - adult_writer uploads a cover for a 16+ story; it passes the check (profile pictures can't be
 *   uploaded since ADMIN-2g, so the check is shown on a cover; a cover in an All ages or 13+ story
 *   waits for a moderator as well, ADMIN-2e1, so the story is set to 16+ for the test);
 * - a picture the check flags waits for a person: the writer is told, others never see it, and a
 *   moderation case opens with the picture blurred until the moderator chooses to see it;
 * - Story settings with the upload field passes axe at 390, 768 and 1440 px.
 * Test data: seed personas; the checks and the case made here are removed afterwards (the files
 * stay in the local covers bucket: Storage refuses deletes from SQL, and nothing reads them); the
 * story's rating and cover are put back.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** adult_writer's user ID. */
const writerId = '00000000-0000-4000-8000-000000000001';
/** adult_writer's second seed story, whose settings hold the cover upload. */
const storySlug = 'the-girl-who-fixed-radios-seed02';
const settingsAddress = `/write/s/${storySlug}/settings`;

/** A 1 by 1 pixel PNG, enough for the stub check. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('the picture check (S1-E10-05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    // The local server signs check results with PICTURE_CHECK_SECRET (playwright.config.ts); the
    // database checks them against the same value in its Vault. Never a real secret.
    runSql(`
      update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      delete from vault.secrets where name = 'picture_check_secret';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret');
      update public.stories set rating = '16_plus' where slug = '${storySlug}';`);
  });
  test.afterAll(() => {
    runSql(`
      update public.feature_flags set is_enabled = false where key = 'picture_uploads';
      delete from vault.secrets where name = 'picture_check_secret';
      update public.stories set rating = 'all_ages', cover_kind = 'automatic', cover_tall_path = null,
        cover_square_path = null where slug = '${storySlug}';
      delete from public.notifications where case_id in (select case_id from public.picture_checks where user_id = '${writerId}');
      delete from public.case_actions where case_id in (select case_id from public.picture_checks where user_id = '${writerId}');
      with removed as (delete from public.picture_checks where user_id = '${writerId}' returning case_id)
      delete from public.cases where id in (select case_id from removed);
      delete from public.rate_limit_events where user_id = '${writerId}';
      update public.profiles set locale = 'ro' where handle in ('adult_writer', 'moderator');`);
  });

  test('a picture that passes the check becomes the cover', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', settingsAddress);
    await page
      .getByLabel('Upload a picture')
      .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: tinyPng });
    await expect(page.getByText('The picture passed the check.')).toBeVisible();
    expect(
      runSql(
        `select status from public.picture_checks where user_id = '${writerId}' order by created_at desc limit 1`,
      ),
    ).toBe('passed');
  });

  test('a flagged picture waits for a person and opens a blurred case', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', settingsAddress);
    await page
      .getByLabel('Upload a picture')
      .setInputFiles({ name: 'me_fail.png', mimeType: 'image/png', buffer: tinyPng });
    await expect(
      page.getByText(/will look at your picture before others can see it/),
    ).toBeVisible();
    const caseId = runSql(
      `select case_id from public.picture_checks where user_id = '${writerId}' and status = 'held' order by created_at desc limit 1`,
    );
    expect(caseId).not.toBe('');

    const moderatorPage = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    await expect(moderatorPage.getByRole('button', { name: 'Show the picture' })).toBeVisible();
  });

  for (const view of everyView([settingsAddress])) {
    test(`axe: Story settings with the upload field at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view);
    });
  }
});
