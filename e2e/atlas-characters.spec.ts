/**
 * Story Atlas characters in a real browser (stories S1-E17-08 to S1-E17-11 and S1-E17-13; bundle
 * ATLAS, part b).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - "New character" makes a character and opens its sheet; the list groups the cast by role and
 *   filters it by typing; the sheet sits beside the list on a laptop and below it on a phone
 *   (S1-E17-08);
 * - every sheet field saves by itself and is still there after a reload, the first appearance is
 *   picked from the chapters, and long boxes grow with the text (S1-E17-09);
 * - a field of the writer's own shows on every sheet; removing it hides it and keeps its value,
 *   and bringing it back shows the value again (S1-E17-10);
 * - with uploads on, a picture shows once a moderator approved it (the seed story is All ages), with alt text, and Remove brings the
 *   initials back (S1-E17-11);
 * - Delete asks twice, and the at-a-glance page counts the cast (S1-E17-13, S1-E17-06);
 * - the page passes axe, doesn't scroll sideways and draws no doodle at 390, 768 and
 *   1440 px, light and night, Romanian and English.
 * Test data: adult_writer's seed story "Stația meteo" (its characters and fields are deleted at
 * the end); suspended_user (whose language no other spec changes) gets one seeded story with one
 * character for the accessibility checks.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';
import { approveWaitingPictures } from './support/pictures';

const writerStoryId = '00000000-0000-4000-9000-000000000001';
const castAddress = '/plan/s/statia-meteo-seed01/characters';
const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const axeCharacterId = 'e2e17080-0000-4000-8000-000000000001';
const axeAddress = `/plan/s/atlas-cast-seed01/characters/${axeCharacterId}`;

/** A 1 by 1 pixel PNG, enough for the stub check. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Removes this spec's characters, fields, pictures and story, and resets what it switched on. */
function cleanUp() {
  runSql(`
    update public.feature_flags set is_enabled = false where key = 'picture_uploads';
    delete from vault.secrets where name = 'picture_check_secret';
    delete from public.story_characters where story_id = '${writerStoryId}';
    delete from public.story_character_fields where story_id = '${writerStoryId}';
    delete from public.picture_checks where kind = 'atlas_image';
    delete from public.rate_limit_events where user_id = '00000000-0000-4000-8000-000000000001';
    delete from public.chapters where code = 'e2ecast1';
    delete from public.stories where slug = 'atlas-cast-seed01';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'suspended_user');`);
}

/** suspended_user's story with one character and one chapter, for the accessibility checks. */
function seedAxeStory() {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating)
    values ('${suspendedUserId}', 'atlas-cast-seed01', 'Farul de pe stâncă', 'Un far stins.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages');
    insert into public.story_characters (id, story_id, user_id, name, role, sheet)
    select '${axeCharacterId}', id, user_id, 'Ileana Pescaru', 'protagonist',
      '{"pronouns": "ea", "wants": "Să aprindă farul din nou."}'::jsonb
    from public.stories where slug = 'atlas-cast-seed01';`);
}

/** Opens an address in English as a persona, at a width, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  path: string,
  width = 1440,
): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Makes a character with "New character" and gives it a name. */
async function newCharacter(page: Page, name: string) {
  await page.getByRole('button', { name: 'New character' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'New character' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await expect(page.locator('#atlas-character-name-save')).toHaveText('Saved');
}

test.describe('Story Atlas characters (S1-E17-08 to S1-E17-13)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedAxeStory();
    runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body)
      values ('${writerStoryId}', '00000000-0000-4000-8000-000000000001', 'e2ecast1', 90, 'Furtuna', 'Vântul.');`);
  });
  test.afterAll(cleanUp);

  test('New character opens its sheet, and every field saves by itself', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', castAddress);
    await expect(page.getByText('No characters yet.')).toBeVisible();
    await newCharacter(page, 'Ana Mureșan');
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
    await page.getByLabel('Role').selectOption('protagonist');
    await expect(page.locator('#atlas-character-role-save')).toHaveText('Saved');
    await page.getByRole('textbox', { name: 'Pronouns' }).fill('she/her');
    await expect(page.locator('#atlas-character-pronouns-save')).toHaveText('Saved');
    // A long box grows with the text (S1-E17-09).
    const wants = page.getByRole('textbox', { name: 'What they want' });
    const shortHeight = (await wants.boundingBox())?.height ?? 0;
    await wants.fill(
      'To find out who put the lighthouse out.\nAnd why.\nAnd who knew.\nAnd who lied.',
    );
    await expect(page.locator('#atlas-character-wants-save')).toHaveText('Saved');
    expect((await wants.boundingBox())?.height ?? 0).toBeGreaterThan(shortHeight);
    await page.getByLabel('First appearance').selectOption('e2ecast1');
    await expect(page.locator('#atlas-character-first-appearance-save')).toHaveText('Saved');

    // Still there after a reload, and listed under its role.
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Pronouns' })).toHaveValue('she/her');
    await expect(wants).toHaveValue(/who put the lighthouse out/);
    await expect(page.getByLabel('First appearance')).toHaveValue('e2ecast1');
    await expect(page.getByRole('list', { name: 'Protagonist (1)' })).toContainText('Ana Mureșan');
    await page.context().close();
  });

  test('the list groups by role and filters by typing; the sheet sits beside it, or below on a phone', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', castAddress);
    await newCharacter(page, 'Ștefan the Keeper');
    await page.getByLabel('Role').selectOption('antagonist');
    await expect(page.locator('#atlas-character-role-save')).toHaveText('Saved');
    await expect(page.getByRole('list', { name: 'Antagonist (1)' })).toContainText('Ștefan');
    // Filtering ignores accents and case.
    await page.getByRole('searchbox', { name: 'Filter characters' }).fill('stef');
    await expect(page.getByRole('list', { name: 'Protagonist (1)' })).toHaveCount(0);
    await page.getByRole('searchbox', { name: 'Filter characters' }).fill('zzz');
    await expect(page.getByText('No one matches “zzz”.')).toBeVisible();

    // Beside the list on a laptop.
    const list = await page.getByRole('heading', { name: '2 characters' }).boundingBox();
    const sheet = await page
      .getByRole('heading', { level: 2, name: 'Ștefan the Keeper' })
      .boundingBox();
    expect(sheet?.x ?? 0).toBeGreaterThan((list?.x ?? 0) + 200);
    await page.context().close();

    // Below it on a phone.
    const phone = await openAs(browser, 'adult_writer', castAddress, 390);
    await phone.getByRole('link', { name: 'Ștefan the Keeper' }).click();
    const phoneList = await phone.getByRole('heading', { name: '2 characters' }).boundingBox();
    const phoneSheet = await phone
      .getByRole('heading', { level: 2, name: 'Ștefan the Keeper' })
      .boundingBox();
    expect(phoneSheet?.y ?? 0).toBeGreaterThan(phoneList?.y ?? 0);
    expect(await phone.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await phone.context().close();
  });

  test('a field of your own shows on every sheet, and removing it keeps its value', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/plan/s/statia-meteo-seed01');
    const fields = page.getByRole('region', { name: 'Your character fields' });
    await fields.getByRole('textbox', { name: 'New field' }).fill('Turned by');
    await fields.getByRole('button', { name: 'Add field' }).click();
    await expect(fields.getByRole('listitem')).toContainText('Turned by');
    // The cast count and the recently edited characters (S1-E17-06).
    await expect(page.getByRole('region', { name: 'Characters', exact: true })).toContainText(
      '2 characters',
    );

    await page.getByRole('link', { name: 'Ana Mureșan' }).click();
    await page.getByRole('textbox', { name: 'Turned by' }).fill('Nobody yet');
    await expect(page.locator('[id$="-save"]').filter({ hasText: 'Saved' }).first()).toBeVisible();
    await page.getByRole('textbox', { name: 'Turned by' }).blur();
    await page.goto('/plan/s/statia-meteo-seed01');
    await fields.getByRole('button', { name: 'Remove Turned by' }).click();
    await expect(fields.getByText(/Removed: hidden from the sheets/)).toBeVisible();

    await page.getByRole('link', { name: 'Ana Mureșan' }).click();
    await expect(page.getByRole('textbox', { name: 'Turned by' })).toHaveCount(0);
    await page.goto('/plan/s/statia-meteo-seed01');
    await fields.getByRole('button', { name: 'Bring back Turned by' }).click();
    await expect(fields.getByRole('button', { name: 'Remove Turned by' })).toBeVisible();
    await page.getByRole('link', { name: 'Ana Mureșan' }).click();
    await expect(page.getByRole('textbox', { name: 'Turned by' })).toHaveValue('Nobody yet');
    await page.context().close();
  });

  test('a picture shows once a moderator approved it, and Remove brings the initials back', async ({
    browser,
  }) => {
    // The local server signs check results with PICTURE_CHECK_SECRET (playwright.config.ts); the
    // database checks them against the same value in its Vault. Never a real secret.
    runSql(`update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret')
      where not exists (select 1 from vault.secrets where name = 'picture_check_secret');`);
    const page = await openAs(browser, 'adult_writer', castAddress);
    await page.getByRole('link', { name: 'Ana Mureșan' }).click();
    const pictureCard = page.getByRole('group', { name: 'Picture' });
    await expect(pictureCard.getByText('No picture yet, so the initials show.')).toBeVisible();
    await pictureCard.getByLabel('Choose a picture').setInputFiles({
      name: 'ana.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    // The seed story is All ages, so the portrait waits for a moderator (ADMIN-2e1b).
    await expect(pictureCard.getByText(/will look at your picture before others/)).toBeVisible();
    expect(approveWaitingPictures("kind = 'atlas_image'")).toBe('1');
    await pictureCard
      .getByRole('textbox', { name: 'Describe the picture' })
      .fill('Ana on the cliff');
    await expect(page.locator('#atlas-character-picture-alt-save')).toHaveText('Saved');
    await expect(pictureCard.getByRole('img', { name: 'Ana on the cliff' })).toBeVisible();

    await pictureCard.getByRole('button', { name: 'Remove picture' }).click();
    await expect(pictureCard.getByText('No picture yet, so the initials show.')).toBeVisible();
    await expect(pictureCard.getByRole('img')).toHaveCount(0);
    // The file is gone from Storage too (S1-E17-11: "removing it deletes the file").
    expect(runSql(`select count(*) from storage.objects where bucket_id = 'atlas-images'`)).toBe(
      '0',
    );
    runSql(`update public.feature_flags set is_enabled = false where key = 'picture_uploads';`);
    await page.context().close();
  });

  test('Delete asks twice, then the character is gone', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', castAddress);
    await page.getByRole('link', { name: 'Ștefan the Keeper' }).click();
    const deleteSection = page.getByRole('region', { name: 'Delete this character' });
    await deleteSection.getByRole('button', { name: 'Delete character' }).click();
    await expect(
      deleteSection.getByText('Delete Ștefan the Keeper?', { exact: false }),
    ).toBeFocused();
    await deleteSection.getByRole('button', { name: 'Keep Ștefan the Keeper' }).click();
    await deleteSection.getByRole('button', { name: 'Delete character' }).click();
    await deleteSection.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(page).toHaveURL(/\/characters$/);
    await expect(page.getByRole('link', { name: 'Ștefan the Keeper' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '1 character', exact: true })).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView([axeAddress])) {
    test(`characters pass axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${suspendedUserId}';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('suspended_user')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.getByRole('heading', { level: 2, name: 'Ileana Pescaru' })).toBeVisible();
      await expectNoDoodles(page);
      await context.close();
    });
  }
});
