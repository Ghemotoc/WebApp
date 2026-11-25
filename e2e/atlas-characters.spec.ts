/**
 * Story Atlas characters in a real browser (stories S1-E17-08 to S1-E17-11 and S1-E17-13; bundle
 * ATLAS, part b).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - "New character" makes a character and opens its sheet; the cast is one list in role order with
 *   initials (board E22, story 6.3), "Choose a character…" beside it until one is open; typing
 *   filters it; on a phone an open sheet stands alone with "Characters" to go back; the sheet
 *   sits beside the list on a laptop and below it on a phone (S1-E17-08, G10a);
 * - every sheet field saves by itself and is still there after a reload, the first appearance is
 *   picked from the chapters, and long boxes grow with the text (S1-E17-09);
 * - a field of the writer's own shows on every sheet; removing it hides it and keeps its value,
 *   and bringing it back shows the value again (S1-E17-10);
 * - with uploads on, a picture shows once a moderator approved it (the seed story is All ages),
 *   with alt text, and Remove takes it away; no initials stand in for it (S1-E17-11, G10a);
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
    delete from public.chapter_plans where chapter_id in (select id from public.chapters where code = 'e2ecast1');
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

/** The cast list in role order (board E22). */
function castList(page: Page) {
  return page.getByRole('list', { name: 'Characters', exact: true });
}

/** Makes a character with "New character" and gives it a name. */
async function newCharacter(page: Page, name: string) {
  await page.getByRole('button', { name: 'New character' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'New character' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await expect(page.locator('#atlas-character-name-save')).toHaveText('Saved');
}

/** Opens a folded card on the sheet by its title, unless it is open already (CALM-9, board E23). */
async function openCard(page: Page, title: RegExp) {
  const button = page.getByRole('button', { name: title }).first();
  if ((await button.getAttribute('aria-expanded')) === 'false') await button.click();
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
    // A long box grows with the text (S1-E17-09). "What they want" sits in the Inside card,
    // which folds shut until opened (CALM-9, board E23).
    await page.getByRole('button', { name: /^Inside/ }).click();
    const wants = page.getByRole('textbox', { name: 'What they want' });
    const shortHeight = (await wants.boundingBox())?.height ?? 0;
    await wants.fill(
      'To find out who put the lighthouse out.\nAnd why.\nAnd who knew.\nAnd who lied.',
    );
    await expect(page.locator('#atlas-character-wants-save')).toHaveText('Saved');
    expect((await wants.boundingBox())?.height ?? 0).toBeGreaterThan(shortHeight);
    // First appearance sits in the In the story card, folded shut too.
    await page.getByRole('button', { name: /^In the story/ }).click();
    await page.getByLabel('First appearance').selectOption('e2ecast1');
    await expect(page.locator('#atlas-character-first-appearance-save')).toHaveText('Saved');

    // Still there after a reload, and listed under its role.
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Pronouns' })).toHaveValue('she/her');
    // The cards fold shut again after a reload, so open the two this test filled.
    await page.getByRole('button', { name: /^Inside/ }).click();
    await page.getByRole('button', { name: /^In the story/ }).click();
    await expect(wants).toHaveValue(/who put the lighthouse out/);
    await expect(page.getByLabel('First appearance')).toHaveValue('e2ecast1');
    await expect(castList(page)).toContainText('Ana Mureșan');
    await expect(castList(page)).toContainText('Protagonist');
    await page.context().close();
  });

  test('the list is in role order and filters by typing; the sheet sits beside it, or alone on a phone', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', castAddress);
    // Board E22: with no character open, the place beside the list says what to do.
    await expect(page.getByText('Choose a character to open their sheet.')).toBeVisible();
    await newCharacter(page, 'Ștefan the Keeper');
    await page.getByLabel('Role').selectOption('antagonist');
    await expect(page.locator('#atlas-character-role-save')).toHaveText('Saved');
    // Role order: the protagonist before the antagonist, each with a circle of initials.
    const rows = castList(page).locator(':scope > li');
    await expect(rows.nth(0)).toContainText('Ana Mureșan');
    await expect(rows.nth(1)).toContainText('Ștefan the Keeper');
    await expect(rows.nth(1)).toContainText('Antagonist');
    await expect(rows.nth(1)).toContainText('ȘT');
    // Beside an open sheet the list has no filter (board E23); with none open it has (E22).
    await expect(page.getByRole('searchbox', { name: 'Filter characters' })).toHaveCount(0);
    const sheet = await page
      .getByRole('heading', { level: 2, name: 'Ștefan the Keeper' })
      .boundingBox();
    expect(sheet?.x ?? 0).toBeGreaterThan(((await castList(page).boundingBox())?.x ?? 0) + 200);
    await page.goto(castAddress);
    // Filtering ignores accents and case.
    await page.getByRole('searchbox', { name: 'Filter characters' }).fill('stef');
    await expect(castList(page)).not.toContainText('Ana Mureșan');
    await page.getByRole('searchbox', { name: 'Filter characters' }).fill('zzz');
    await expect(page.getByText('No one matches “zzz”.')).toBeVisible();
    await page.context().close();

    // On a phone the list stands alone; an open sheet is its own page with "Characters" to go
    // back (stories 6.3 and 6.4).
    const phone = await openAs(browser, 'adult_writer', castAddress, 390);
    await expect(phone.getByText('2 characters', { exact: true })).toBeVisible();
    await phone.getByRole('link', { name: 'Ștefan the Keeper' }).click();
    await expect(phone.getByRole('heading', { level: 2, name: 'Ștefan the Keeper' })).toBeVisible();
    await expect(castList(phone)).toBeHidden();
    expect(await phone.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await phone.getByRole('link', { name: 'Characters', exact: true }).last().click();
    await expect(phone).toHaveURL(/\/characters$/);
    await expect(castList(phone)).toBeVisible();
    await phone.context().close();
  });

  test('a field of your own shows on every sheet, and removing it keeps its value', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/plan/s/statia-meteo-seed01');
    const fields = page.getByRole('region', { name: 'Character fields' });
    await fields.getByRole('textbox', { name: 'New field' }).fill('Turned by');
    await fields.getByRole('button', { name: 'Add field' }).click();
    await expect(fields.getByRole('listitem')).toContainText('Turned by');
    // The cast count and the recently edited characters (S1-E17-06; G10a: the five edited last,
    // each with its role).
    await expect(page.getByRole('link', { name: 'Open characters (2)' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Characters · edited recently' })).toContainText(
      'Protagonist',
    );

    await page.getByRole('link', { name: 'Ana Mureșan' }).click();
    // A field of the writer's own sits in the Custom fields card, folded shut (CALM-9, E23).
    await page.getByRole('button', { name: /^Custom fields/ }).click();
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
    await page.getByRole('button', { name: /^Custom fields/ }).click();
    await expect(page.getByRole('textbox', { name: 'Turned by' })).toHaveValue('Nobody yet');
    await page.context().close();
  });

  test('Add detail puts a detail under its group on every sheet, a group of details gets its own card, and the header counts point-of-view chapters', async ({
    browser,
  }) => {
    // GAPS-1: the chapter is told from Ana's point of view, so her header counts it.
    runSql(`insert into public.chapter_plans (chapter_id, story_id, user_id, pov_character_id)
      select chapters.id, chapters.story_id, chapters.user_id,
        (select id from public.story_characters where name = 'Ana Mureșan' and story_id = '${writerStoryId}')
      from public.chapters where code = 'e2ecast1'
      on conflict (chapter_id) do update set pov_character_id = excluded.pov_character_id;`);
    const page = await openAs(browser, 'adult_writer', castAddress);
    await page.getByRole('link', { name: 'Ana Mureșan' }).click();
    await expect(page.getByText('Point of view in 1 chapter', { exact: true })).toBeVisible();

    // A detail under a built-in group.
    const basics = page.getByRole('group', { name: 'Basics' });
    await basics.getByRole('button', { name: 'Add detail to Basics' }).click();
    await expect(basics.getByRole('textbox', { name: 'Detail name' })).toBeFocused();
    await basics.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(basics.getByText('Give the detail a name.')).toBeVisible();
    await basics.getByRole('textbox', { name: 'Detail name' }).fill('Blood type');
    await basics.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(basics.getByRole('textbox', { name: 'Blood type' })).toBeVisible();
    await expect(
      page
        .getByRole('group', { name: 'Custom fields' })
        .getByRole('textbox', { name: 'Blood type' }),
    ).toHaveCount(0);

    // A group of the writer's own, then its new name.
    await page.getByRole('button', { name: 'Add a group of details' }).click();
    await page.getByRole('textbox', { name: 'Group name' }).fill('Magic');
    await page.getByRole('textbox', { name: 'First detail' }).fill('Wand');
    await page.getByRole('button', { name: 'Add group' }).click();
    const magic = page.getByRole('region', { name: 'Magic' });
    await openCard(page, /^Magic/);
    await magic.getByRole('textbox', { name: 'Wand' }).fill('Hazel, nine inches');
    await expect(page.locator('[id$="-save"]').filter({ hasText: 'Saved' }).first()).toBeVisible();
    await magic.getByRole('textbox', { name: 'Wand' }).blur();
    await magic.getByRole('button', { name: 'Rename the group Magic' }).click();
    await magic.getByRole('textbox', { name: 'Group name' }).fill('Spellwork');
    await magic.getByRole('button', { name: 'Save' }).click();
    const spellwork = page.getByRole('region', { name: 'Spellwork' });
    await openCard(page, /^Spellwork/);
    await expect(spellwork.getByRole('textbox', { name: 'Wand' })).toHaveValue(
      'Hazel, nine inches',
    );

    // Break test (10 Nov 2026): a double click adds one detail; the same name again in the same
    // place is refused in plain words; a group can't take a built-in card's name or, capitals
    // aside, another group's; and a name typed as one very long word stays inside a phone screen.
    const longName = 'Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(2).slice(0, 60);
    await basics.getByRole('button', { name: 'Add detail to Basics' }).click();
    await basics.getByRole('textbox', { name: 'Detail name' }).fill(longName);
    await basics.getByRole('button', { name: 'Add', exact: true }).dblclick();
    await expect(basics.getByRole('textbox', { name: longName })).toHaveCount(1);
    await basics.getByRole('button', { name: 'Add detail to Basics' }).click();
    await basics.getByRole('textbox', { name: 'Detail name' }).fill('blood TYPE');
    await basics.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(basics.getByText(/A detail with that name is already here/)).toBeVisible();
    await basics.getByRole('button', { name: 'Cancel' }).click();
    await spellwork.getByRole('button', { name: 'Rename the group Spellwork' }).click();
    await spellwork.getByRole('textbox', { name: 'Group name' }).fill('basics');
    await spellwork.getByRole('button', { name: 'Save' }).click();
    await expect(
      spellwork.getByText('Another group has that name. Try a different one.'),
    ).toBeVisible();
    await spellwork.getByRole('button', { name: 'Cancel' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(basics.getByRole('textbox', { name: longName })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 1440, height: 1000 });

    // The other character's sheet has the same detail and group, empty, and no point-of-view pill.
    await castList(page).getByRole('link', { name: 'Ștefan the Keeper' }).click();
    await expect(
      page.getByRole('group', { name: 'Basics' }).getByRole('textbox', { name: 'Blood type' }),
    ).toHaveValue('');
    // Wait for Ștefan's own sheet before opening his card.
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
      'Ștefan the Keeper',
    );
    await openCard(page, /^Spellwork/);
    await expect(
      page.getByRole('region', { name: 'Spellwork' }).getByRole('textbox', { name: 'Wand' }),
    ).toHaveValue('');
    await expect(page.getByText(/Point of view in/)).toHaveCount(0);
    await expectNoDoodles(page);
    await page.context().close();
  });

  test('a picture shows once a moderator approved it, and Remove takes it away', async ({
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
    await expect(pictureCard.getByText('No picture yet.')).toBeVisible();
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
    await expect(pictureCard.getByText('No picture yet.')).toBeVisible();
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
    await expect(page.getByText('1 character', { exact: true })).toBeVisible();
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
