/**
 * Moderation › Pictures to check in a real browser (bundle ADMIN-2, part e1b; Robert's brief of
 * 2 Nov 2026, sections 2 and 3).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first). The local server's
 * /api/picture-check uses the stub provider, so every file here passes the automatic check.
 * What it proves (with the picture_uploads flag switched on for the test):
 * - a character portrait in adult_writer's All ages seed story waits for a moderator instead of
 *   going live;
 * - the moderator sees it large on Pictures to check with the handle, age group and story, and no
 *   download button;
 * - Reject asks what the image shows, previews the uploader's message, removes the picture and
 *   gives the uploader a statement of reasons naming the picture rules;
 * - "Approve and raise the rating" approves the picture and raises the story to 16+;
 * - the page passes axe at 390, 768 and 1440 px, in both themes and languages.
 * The database side (who may decide, the 18+ age rule, rejections of a sexual image of a minor) is
 * covered by database test 248.
 * Test data: three characters on the seed story "Stația meteo"; the characters, pictures, cases
 * and statements made here are removed afterwards and the story's rating is put back.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** adult_writer's user ID and seed story (supabase/seed.sql). */
const writerId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';

/** The three characters this spec makes, one picture each. */
const characterIds = [
  'e2e12e1b-0000-4000-8000-000000000001',
  'e2e12e1b-0000-4000-8000-000000000002',
  'e2e12e1b-0000-4000-8000-000000000003',
];

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
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** adult_writer uploads a portrait for one character and sees it wait for a person. */
async function writerUploads(browser: Browser, characterId: string) {
  const page = await openAs(
    browser,
    'adult_writer',
    `/plan/s/statia-meteo-seed01/characters/${characterId}`,
  );
  await page
    .getByRole('group', { name: 'Picture' })
    .getByLabel('Choose a picture')
    .setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: tinyPng });
  await expect(page.getByText(/will look at your picture before others can see it/)).toBeVisible();
  await page.context().close();
}

/** The pictures this spec made, as SQL, for the clean-up. */
const ownPictures = `select id from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image'`;
const ownCases = `select case_id from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image'`;

/** Removes everything this spec made and puts the flag, rating and languages back. */
function cleanUp() {
  runSql(`
    update public.feature_flags set is_enabled = false where key = 'picture_uploads';
    delete from vault.secrets where name = 'picture_check_secret';
    delete from public.notifications where case_id in (${ownCases});
    delete from public.statements_of_reasons where case_id in (${ownCases});
    delete from public.moderated_items where item_id in (${ownPictures});
    delete from public.case_actions where case_id in (${ownCases});
    delete from public.story_characters where story_id = '${storyId}';
    with removed as (delete from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image' returning case_id)
    delete from public.cases where id in (select case_id from removed);
    delete from public.rate_limit_events where user_id = '${writerId}';
    update public.stories set rating = 'all_ages' where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'moderator');`);
}

/** Makes the three characters, so each upload is a new picture. */
function seedCharacters() {
  const rows = characterIds
    .map(
      (id, index) =>
        `('${id}', '${storyId}', '${writerId}', 'Picture test ${index + 1}', 'supporting')`,
    )
    .join(', ');
  runSql(`insert into public.story_characters (id, story_id, user_id, name, role) values ${rows};`);
}

test.describe('Pictures to check (ADMIN-2e1b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedCharacters();
    // The local server signs check results with PICTURE_CHECK_SECRET (playwright.config.ts); the
    // database checks them against the same value in its Vault. Never a real secret.
    runSql(`
      update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret');`);
  });
  test.afterAll(cleanUp);

  test('a picture in an All ages story waits, and a moderator rejects it with a reason', async ({
    browser,
  }) => {
    await writerUploads(browser, characterIds[0] ?? '');
    expect(
      runSql(
        `select status from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image'`,
      ),
    ).toBe('held');

    const page = await openAs(browser, 'moderator', '/staff/pictures');
    await expect(page.getByRole('heading', { name: 'Pictures to check', level: 1 })).toBeVisible();
    const card = page.getByRole('listitem').filter({ hasText: '@adult_writer' });
    await expect(
      card.getByRole('img', { name: 'The picture uploaded by @adult_writer' }),
    ).toBeVisible();
    await expect(card.getByText('adult', { exact: true })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Stația meteo' })).toBeVisible();
    await expect(card.getByRole('link', { name: /download/i })).toHaveCount(0);

    await card.getByRole('button', { name: 'Reject', exact: true }).click();
    await card.getByRole('button', { name: 'Reject and remove' }).click();
    await expect(card.getByRole('alert')).toHaveText(
      'Choose what the image shows and write a note.',
    );
    await card.getByLabel('What does this image show?').selectOption('photograph');
    await card.getByRole('textbox', { name: 'Note for the team' }).fill('A photo of a face.');
    await expect(card.getByText(/it shows: a photograph/)).toBeVisible();
    await card.getByRole('button', { name: 'Reject and remove' }).click();
    await expect(page.getByText('No pictures are waiting.')).toBeVisible();

    expect(
      runSql(
        `select status from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image'`,
      ),
    ).toBe('removed');
    expect(
      runSql(`select ground_key from public.statements_of_reasons where case_id in (${ownCases})`),
    ).toBe('picture_check');
    await page.context().close();
  });

  test('Approve and raise the rating makes the story 16+', async ({ browser }) => {
    await writerUploads(browser, characterIds[1] ?? '');
    await writerUploads(browser, characterIds[2] ?? '');
    const page = await openAs(browser, 'moderator', '/staff/pictures');
    const cards = page.getByRole('listitem').filter({ hasText: '@adult_writer' });
    await expect(cards).toHaveCount(2);
    const first = cards.first();
    await first.getByRole('button', { name: 'Approve and raise the rating' }).click();
    await first.getByRole('radio', { name: /Suggestive, no nudity/ }).check();
    await first.getByRole('button', { name: 'Approve and raise', exact: true }).click();
    // The other picture stays for the accessibility checks below.
    await expect(cards).toHaveCount(1);
    expect(
      runSql(
        `select count(*) from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image' and status = 'approved'`,
      ),
    ).toBe('1');
    expect(runSql(`select rating from public.stories where id = '${storyId}'`)).toBe('16_plus');
    await page.context().close();
  });

  for (const view of everyView(['/staff/pictures'])) {
    test(`axe: Pictures to check at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, view);
    });
  }
});
