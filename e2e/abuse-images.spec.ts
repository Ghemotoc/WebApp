/**
 * Suspected child sexual abuse images in a real browser (bundle ADMIN-2, part e2b; Robert's brief
 * of 2 Nov 2026, section 4).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first). The local server's
 * /api/picture-check uses the stub provider: a file whose name ends in _match is treated as an
 * Arachnid Shield match, every other file passes the automatic check.
 * What it proves (with the picture_uploads flag switched on for the test):
 * - a match: the file is deleted from Storage at once, the evidence is kept and the account stays
 *   open until a person decides;
 * - red with "Sexual image of a minor" needs a few words for the police, then deletes the file,
 *   keeps the evidence, moves the case to safeguarding and closes the account for good;
 * - on the safeguarding case page a safeguarding moderator reads the evidence, rewrites the
 *   description and puts a legal hold on it;
 * - the case page with the evidence passes axe at 390, 768 and 1440 px, in both themes and
 *   languages.
 * The database side is covered by database test 250.
 * Test data: two characters on adult_writer's seed story "Stația meteo". Everything made here is
 * removed afterwards, and adult_writer's account is opened again (audit log rows stay: it is
 * append-only).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** adult_writer's user ID and seed story (supabase/seed.sql). */
const writerId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';

/** The two characters this spec makes: one for the match, one for the red decision. */
const matchCharacterId = 'e2e12e2b-0000-4000-8000-000000000001';
const rejectCharacterId = 'e2e12e2b-0000-4000-8000-000000000002';

/** A 1 by 1 pixel PNG, enough for the stub check. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** The pictures and cases this spec made, as SQL, for the checks and the clean-up. */
const ownPictures = `select id from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image'`;
const ownCases = `select case_id from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image'`;

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

/** adult_writer uploads a portrait for one character under the given file name. */
async function writerUploads(browser: Browser, characterId: string, fileName: string) {
  const page = await openAs(
    browser,
    'adult_writer',
    `/plan/s/statia-meteo-seed01/characters/${characterId}`,
  );
  await page
    .getByRole('group', { name: 'Picture' })
    .getByLabel('Choose a picture')
    .setInputFiles({ name: fileName, mimeType: 'image/png', buffer: tinyPng });
  return page;
}

/** How many files the picture of one character still has in Storage, as text. */
function filesOf(characterId: string): string {
  return runSql(`select count(*) from storage.objects
    join public.picture_checks on picture_checks.bucket = objects.bucket_id and picture_checks.path = objects.name
    join public.story_characters on story_characters.picture_id = picture_checks.id
    where story_characters.id = '${characterId}'`);
}

/** Removes everything this spec made, opens the account again and puts the flag back. */
function cleanUp() {
  runSql(`
    update public.feature_flags set is_enabled = false where key = 'picture_uploads';
    delete from vault.secrets where name = 'picture_check_secret';
    delete from public.abuse_image_evidence where user_id = '${writerId}';
    delete from public.notifications where case_id in (${ownCases});
    delete from public.statements_of_reasons where case_id in (${ownCases});
    delete from public.banned_email_hashes where sanction_id in
      (select id from public.sanctions where user_id = '${writerId}');
    delete from public.sanctions where user_id = '${writerId}';
    update auth.users set banned_until = null where id = '${writerId}';
    delete from public.moderated_items where item_id in (${ownPictures});
    delete from public.case_actions where case_id in (${ownCases});
    delete from public.story_characters where story_id = '${storyId}';
    with removed as (delete from public.picture_checks where story_id = '${storyId}' and kind = 'atlas_image' returning case_id)
    delete from public.cases where id in (select case_id from removed);
    delete from public.rate_limit_events where user_id = '${writerId}';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'moderator');`);
}

test.describe('suspected child abuse images (ADMIN-2e2b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    runSql(`
      insert into public.story_characters (id, story_id, user_id, name, role) values
        ('${matchCharacterId}', '${storyId}', '${writerId}', 'Match test', 'supporting'),
        ('${rejectCharacterId}', '${storyId}', '${writerId}', 'Reject test', 'supporting');
      update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret');`);
  });
  test.afterAll(cleanUp);

  test('a match is deleted at once and its evidence kept, with the account still open', async ({
    browser,
  }) => {
    const page = await writerUploads(browser, matchCharacterId, 'portrait_match.png');
    await expect(page.getByText(/before others can see it/)).toBeVisible();
    await page.context().close();
    await expect.poll(() => filesOf(matchCharacterId)).toBe('0');
    expect(
      runSql(`select source from public.abuse_image_evidence where user_id = '${writerId}'`),
    ).toBe('known_image_match');
    expect(
      runSql(
        `select count(*) from public.sanctions where user_id = '${writerId}' and kind = 'ban'`,
      ),
    ).toBe('0');
  });

  test('red with "Sexual image of a minor" keeps the evidence and closes the account', async ({
    browser,
  }) => {
    const writerPage = await writerUploads(browser, rejectCharacterId, 'portrait.png');
    await expect(writerPage.getByText(/will look at your picture before others/)).toBeVisible();
    await writerPage.context().close();

    const page = await openAs(browser, 'moderator', '/staff/pictures');
    const card = page.getByRole('listitem').filter({ hasText: '@adult_writer' });
    await card.getByRole('button', { name: 'Reject', exact: true }).click();
    await card.getByLabel('What does this image show?').selectOption('sexual_image_of_minor');
    await expect(card.getByText(/deletes the image at once; it is never kept/)).toBeVisible();
    await card.getByRole('textbox', { name: 'Note for the team' }).fill('Clear case.');
    await card.getByRole('button', { name: 'Reject and remove' }).click();
    await expect(card.getByRole('alert')).toHaveText('Describe the image for the police.');
    await card
      .getByRole('textbox', { name: 'Describe the image in a few words for the police.' })
      .fill('A drawing of a child in a sexual pose.');
    await card.getByRole('button', { name: 'Reject and remove' }).click();
    await expect(page.getByText('No pictures are waiting.')).toBeVisible();
    await page.context().close();

    await expect.poll(() => filesOf(rejectCharacterId)).toBe('0');
    expect(
      runSql(`select count(*) from public.abuse_image_evidence
        where user_id = '${writerId}' and source = 'moderator' and description like 'A drawing%'`),
    ).toBe('1');
    expect(
      runSql(
        `select count(*) from public.sanctions where user_id = '${writerId}' and kind = 'ban'`,
      ),
    ).toBe('1');
  });

  test('a safeguarding moderator reads the evidence and puts a legal hold on it', async ({
    browser,
  }) => {
    const caseId = runSql(`select case_id from public.abuse_image_evidence
      where user_id = '${writerId}' and source = 'known_image_match'`);
    const page = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    const panel = page.getByRole('region', { name: 'Evidence about the image' });
    await expect(panel.getByText('Arachnid Shield, matching a known image')).toBeVisible();
    await expect(panel.getByText('The account is closed for good.')).toBeVisible();
    await panel.getByRole('button', { name: 'Change the description' }).click();
    await panel
      .getByRole('textbox', { name: 'Describe the image in a few words for the police' })
      .fill('A known image of a young child.');
    await panel.getByRole('button', { name: 'Save' }).click();
    await expect(panel.getByText('A known image of a young child.')).toBeVisible();
    await panel.getByRole('button', { name: 'Put a legal hold on it' }).click();
    await panel.getByRole('textbox', { name: /Why\?/ }).fill('Police request of 3 Nov 2026.');
    await panel.getByRole('button', { name: 'Save' }).click();
    await expect(panel.getByText('On: Police request of 3 Nov 2026.')).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView(['/staff/moderation/cases/'])) {
    test(`axe: a safeguarding case with evidence at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      const caseId = runSql(`select case_id from public.abuse_image_evidence
        where user_id = '${writerId}' and source = 'known_image_match'`);
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, { ...view, address: `${view.address}${caseId}` });
    });
  }
});
