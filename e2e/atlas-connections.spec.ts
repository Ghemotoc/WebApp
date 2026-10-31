/**
 * Story Atlas connections in a real browser (stories S1-E17-14 to S1-E17-16; bundle ATLAS,
 * part c).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a relationship added on a sheet, with a type and a note, is listed on both characters'
 *   sheets; the type list offers every type; a custom one needs its label; Delete asks twice
 *   (S1-E17-14);
 * - the Connections page draws the characters as linked nodes and the relationships as lines,
 *   a category switch hides its lines, a node opens the sheet, and on a phone the map scrolls
 *   inside its own region while the page doesn't (S1-E17-15);
 * - the family tree puts generations top to bottom with partners side by side, "Include turned
 *   or made" counts makers, and a note says how many characters are left off (S1-E17-16);
 * - the page passes axe, doesn't scroll sideways and has no doodle over text at 390, 768 and
 *   1440 px, light and night, Romanian and English.
 * Test data: adult_writer's seed story "Stația meteo" gets five characters (deleted at the end);
 * suspended_user (whose language no other spec changes) gets one seeded story with three
 * connected characters for the accessibility checks.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const writerStoryId = '00000000-0000-4000-9000-000000000001';
const planAddress = '/plan/s/statia-meteo-seed01';
const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const axeAddress = '/plan/s/atlas-links-seed01/connections';

/** The writer's five characters, by name, with fixed IDs so the spec can open their sheets. */
const cast = {
  ana: 'e2e17140-0000-4000-8000-000000000001',
  ion: 'e2e17140-0000-4000-8000-000000000002',
  vali: 'e2e17140-0000-4000-8000-000000000003',
  mara: 'e2e17140-0000-4000-8000-000000000004',
  lupul: 'e2e17140-0000-4000-8000-000000000005',
};

/** Removes this spec's characters (their relationships go with them) and story. */
function cleanUp() {
  runSql(`
    delete from public.story_characters where story_id = '${writerStoryId}';
    delete from public.stories where slug = 'atlas-links-seed01';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'suspended_user');`);
}

/** The writer's cast: Ana, Ion, Vali, Mara and Lupul, with no relationships yet. */
function seedWriterCast() {
  const rows = Object.entries({
    ana: 'Ana',
    ion: 'Ion',
    vali: 'Vali',
    mara: 'Mara',
    lupul: 'Lupul',
  })
    .map(
      ([key, name]) =>
        `('${cast[key as keyof typeof cast]}', '${writerStoryId}', '${writerId}', '${name}')`,
    )
    .join(', ');
  runSql(`insert into public.story_characters (id, story_id, user_id, name) values ${rows};`);
}

/** suspended_user's story with three connected characters, for the accessibility checks. */
function seedAxeStory() {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating)
    values ('${suspendedUserId}', 'atlas-links-seed01', 'Farul de pe stâncă', 'Un far stins.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages');
    insert into public.story_characters (id, story_id, user_id, name)
    select ('e2e17141-0000-4000-8000-00000000000' || n)::uuid, stories.id, stories.user_id, names.name
    from public.stories, (values (1, 'Ileana Pescaru'), (2, 'Toma Pescaru'), (3, 'Radu')) as names (n, name)
    where stories.slug = 'atlas-links-seed01';
    insert into public.story_character_relationships (story_id, user_id, from_character_id, to_character_id, kind, note)
    select stories.id, stories.user_id, links.from_id::uuid, links.to_id::uuid, links.kind, ''
    from public.stories, (values
      ('e2e17141-0000-4000-8000-000000000001', 'e2e17141-0000-4000-8000-000000000002', 'partner_of'),
      ('e2e17141-0000-4000-8000-000000000001', 'e2e17141-0000-4000-8000-000000000003', 'parent_of'),
      ('e2e17141-0000-4000-8000-000000000003', 'e2e17141-0000-4000-8000-000000000002', 'resents')
    ) as links (from_id, to_id, kind)
    where stories.slug = 'atlas-links-seed01';`);
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

/** Fills in and sends one "Add a relationship" form on the Connections page. */
async function addOnConnections(page: Page, from: string, kind: string, to: string) {
  const form = page.getByRole('region', { name: 'Add a relationship', exact: true });
  await form.getByLabel('Character', { exact: true }).selectOption({ label: from });
  await form.getByLabel('Relationship', { exact: true }).selectOption({ label: kind });
  await form.getByLabel('Other character', { exact: true }).selectOption({ label: to });
  await form.getByRole('button', { name: 'Add relationship' }).click();
  await expect(form.getByText('Relationship added.')).toBeVisible();
}

test.describe('Story Atlas connections (S1-E17-14 to S1-E17-16)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedWriterCast();
    seedAxeStory();
  });
  test.afterAll(cleanUp);

  test('a relationship added on a sheet shows on both sheets', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/characters/${cast.ana}`);
    const section = page.getByRole('region', { name: 'Relationships', exact: true });
    await expect(section.getByText('No relationships yet.')).toBeVisible();
    // Every type is offered (S1-E17-14), custom last.
    const kinds = section.getByLabel('Relationship', { exact: true });
    await expect(kinds.locator('option')).toHaveCount(13);
    await expect(kinds.locator('option').last()).toHaveText('Custom (your own label)');
    // A custom one needs its label.
    await kinds.selectOption('custom');
    await section.getByLabel('Other character', { exact: true }).selectOption({ label: 'Lupul' });
    await section.getByRole('button', { name: 'Add relationship' }).click();
    await expect(section.getByText('Write your label for this relationship.')).toBeVisible();
    // A parent with a note.
    await kinds.selectOption('parent_of');
    await section.getByLabel('Other character', { exact: true }).selectOption({ label: 'Vali' });
    await section.getByRole('textbox', { name: 'Note (optional)' }).fill('Raised him alone.');
    await section.getByRole('button', { name: 'Add relationship' }).click();
    await expect(
      section.getByText('Ana is the parent of Vali', { exact: true }).first(),
    ).toBeVisible();
    await expect(section.getByText('Raised him alone.')).toBeVisible();
    // Listed on Vali's sheet too.
    await page.goto(`${planAddress}/characters/${cast.vali}`);
    const valiSection = page.getByRole('region', { name: 'Relationships', exact: true });
    await expect(
      valiSection.getByText('Ana is the parent of Vali', { exact: true }).first(),
    ).toBeVisible();
    await page.context().close();
  });

  test('the map draws every relationship, hides a category and opens a sheet', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections`);
    await expect(page.getByRole('link', { name: 'Connections' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await addOnConnections(page, 'Ion', 'Partner or spouse of', 'Ana');
    await addOnConnections(page, 'Ion', 'Killed', 'Lupul');
    const map = page.getByTestId('atlas-relationship-map');
    await expect(map.locator('[data-category]')).toHaveCount(3);
    await expect(map.locator('[data-category="conflict"]')).toHaveCount(1);
    // The same relationships as a list (S1-E17-15: "available as a list").
    const list = page.getByRole('region', { name: 'All relationships', exact: true });
    await expect(list.getByText('Ion killed Lupul', { exact: true }).first()).toBeVisible();
    // Turning Conflict off hides its line.
    await page.getByRole('button', { name: 'Conflict' }).click();
    await expect(page.getByRole('button', { name: 'Conflict' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(map.locator('[data-category="conflict"]')).toHaveCount(0);
    await expect(map.locator('[data-category]')).toHaveCount(2);
    // A node is a real link to the sheet.
    await map.getByRole('link', { name: 'Lupul', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/characters/${cast.lupul}$`));
    await expect(page.getByRole('heading', { level: 2, name: 'Lupul' })).toBeVisible();
    await page.context().close();
  });

  test('on a phone the map scrolls inside its region, not the page', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections`, 390);
    const map = page.getByTestId('atlas-relationship-map');
    await expect(map.getByRole('link', { name: 'Ana', exact: true })).toBeVisible();
    const sizes = await map.evaluate((region) => ({
      scrollWidth: region.scrollWidth,
      clientWidth: region.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(sizes.scrollWidth).toBeGreaterThan(sizes.clientWidth);
    expect(sizes.pageWidth).toBeLessThanOrEqual(390);
    await page.context().close();
  });

  test('the family tree lays out generations and counts who is left off', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections`);
    const treeCard = page.getByRole('region', { name: 'Family tree', exact: true });
    const generations = treeCard.getByRole('list', { name: 'Generations' });
    await expect(generations.getByRole('listitem')).toHaveText([
      'Generation 1: Ana, Ion',
      'Generation 2: Vali',
    ]);
    await expect(
      treeCard.getByText('2 characters with no family links are left off.'),
    ).toBeVisible();
    // A maker counts as lineage once the switch is on (S1-E17-16).
    await addOnConnections(page, 'Mara', 'Turned or made', 'Lupul');
    await expect(
      treeCard.getByText('2 characters with no family links are left off.'),
    ).toBeVisible();
    await treeCard.getByRole('button', { name: 'Include turned or made' }).click();
    await expect(generations.getByRole('listitem')).toHaveText([
      'Generation 1: Ana, Ion, Mara',
      'Generation 2: Lupul, Vali',
    ]);
    await expect(treeCard.getByText(/left off/)).toHaveCount(0);
    // Each box opens the sheet.
    await expect(
      page.getByTestId('atlas-family-tree').getByRole('link', { name: 'Mara', exact: true }),
    ).toHaveAttribute('href', `${planAddress}/characters/${cast.mara}`);
    await page.context().close();
  });

  test('Delete asks twice, then the relationship is gone from both sheets', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections`);
    const list = page.getByRole('region', { name: 'All relationships', exact: true });
    await list.getByRole('button', { name: 'Delete Ion killed Lupul' }).click();
    await expect(list.getByText('Delete “Ion killed Lupul”?')).toBeFocused();
    await list.getByRole('button', { name: 'Keep it' }).click();
    await list.getByRole('button', { name: 'Delete Ion killed Lupul' }).click();
    await list.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(list.getByText('Ion killed Lupul', { exact: true })).toHaveCount(0);
    await page.goto(`${planAddress}/characters/${cast.lupul}`);
    await expect(
      page
        .getByRole('region', { name: 'Relationships', exact: true })
        .getByText('Ion killed Lupul', { exact: true }),
    ).toHaveCount(0);
    expect(
      runSql(
        `select count(*) from public.story_character_relationships where story_id = '${writerStoryId}'`,
      ),
    ).toBe('3');
    await page.context().close();
  });

  for (const view of everyView([axeAddress])) {
    test(`connections pass axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${suspendedUserId}';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('suspended_user')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(
        page.getByTestId('atlas-relationship-map').getByRole('link', { name: 'Radu', exact: true }),
      ).toBeVisible();
      await expectNoDoodleOverlap(page);
      await context.close();
    });
  }
});
