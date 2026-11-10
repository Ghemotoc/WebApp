/**
 * Story Atlas connections in a real browser (stories S1-E17-14 to S1-E17-16; bundle ATLAS,
 * part c).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a relationship added on a sheet, with a type and a note, is listed on both characters'
 *   sheets; the type list offers every type; a custom one needs its label; Delete asks twice
 *   (S1-E17-14);
 * - the Connections page switches between the map, the family tree and the list; the map draws
 *   the linked characters as cards and the relationships as lines, names the characters not on
 *   it, a category switch hides its lines, a card opens the sheet, and on a phone the map fits
 *   the width and, zoomed in, scrolls inside its own region while the page doesn't (S1-E17-15);
 * - a card dragged to an empty spot keeps its place, Arrange for me puts it back, and a card
 *   dropped on another opens Add a connection with both picked (G10b2);
 * - the family tree puts generations top to bottom with partners side by side, "Include turned
 *   or made" counts makers, "Whose tree" shows one family and a note says how many characters
 *   are left off (S1-E17-16, G10b2);
 * - a character's gender picks the family word (mother, son), told from the child on the child's
 *   own sheet, and "Add to this tree" adds a relative from the tree itself (GAPS-3);
 * - the page passes axe, doesn't scroll sideways and draws no doodle at 390, 768 and
 *   1440 px, light and night, Romanian and English.
 * Test data: adult_writer's seed story "Stația meteo" gets five characters (deleted at the end);
 * suspended_user (whose language no other spec changes) gets one seeded story with three
 * connected characters for the accessibility checks.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
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

/** Opens "Add a connection" on the Connections page, unless it is open already. */
async function openAddForm(page: Page) {
  const form = page.getByRole('region', { name: 'Add a relationship', exact: true });
  const opener = page.getByRole('button', { name: 'Add a connection' });
  await expect(opener).toBeVisible();
  if ((await opener.getAttribute('aria-expanded')) !== 'true') await opener.click();
  await expect(form).toBeVisible();
  return form;
}

/** Switches the Connections page to one of its views: Map, Family tree or List. */
async function showView(page: Page, name: 'Map' | 'Family tree' | 'List') {
  // The radio itself is visually hidden; a person clicks the segment's label.
  await page.getByRole('group', { name: 'View' }).getByText(name, { exact: true }).click();
  await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
}

/** Drags with the mouse from one point to another, in small steps, as a person would. */
async function dragBetween(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/** The centre of an element on the screen. */
async function centreOf(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (box === null) throw new Error(`${selector} is not on the screen`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** One relationship to add: from whom, which kind, which relationship, to whom. */
interface NewLink {
  from: string;
  group: string;
  kind: string;
  to: string;
}

/** Fills in and sends one "Add a relationship" form on the Connections page. */
async function addOnConnections(page: Page, { from, group, kind, to }: NewLink) {
  const form = await openAddForm(page);
  await form.getByLabel('Character', { exact: true }).selectOption({ label: from });
  await form.getByLabel('Kind', { exact: true }).selectOption({ label: group });
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
    // Kind first, then the relationships of that kind (S1-E17-14; G10b, handoff A4).
    const groups = section.getByLabel('Kind', { exact: true });
    await expect(groups.locator('option')).toHaveText([
      'Family',
      'Love',
      'Allies',
      'Conflict',
      'Other',
    ]);
    const kinds = section.getByLabel('Relationship', { exact: true });
    await expect(kinds.locator('option')).toHaveText([
      'Parent of',
      'Sibling of',
      'Partner or spouse of',
      'Cousin of',
      'Turned or made',
    ]);
    // "Other" asks for the writer's own words, and needs them.
    await groups.selectOption({ label: 'Other' });
    await expect(kinds).toHaveCount(0);
    await section.getByLabel('Other character', { exact: true }).selectOption({ label: 'Lupul' });
    await expect(section.getByRole('textbox', { name: 'What is Ana to Lupul?' })).toBeVisible();
    await section.getByRole('button', { name: 'Add relationship' }).click();
    await expect(section.getByText('Write a label for this relationship.')).toBeVisible();
    await groups.selectOption({ label: 'Family' });
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
    // Listed on Vali's sheet too, told from his side (GAPS-3).
    const valiSection = page.getByRole('region', { name: 'Relationships', exact: true });
    await expect(
      valiSection.getByText('Vali is the child of Ana', { exact: true }).first(),
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
    await addOnConnections(page, {
      from: 'Ion',
      group: 'Family',
      kind: 'Partner or spouse of',
      to: 'Ana',
    });
    await addOnConnections(page, { from: 'Ion', group: 'Conflict', kind: 'Killed', to: 'Lupul' });
    const map = page.getByTestId('atlas-relationship-map');
    await expect(map.locator('[data-category]')).toHaveCount(3);
    await expect(map.locator('[data-category="conflict"]')).toHaveCount(1);
    // Mara has no relationship yet, so she is named under the map instead (G10b2).
    await expect(page.getByText('Not on the map yet: Mara', { exact: true })).toBeVisible();
    // The same relationships as a list (S1-E17-15: "available as a list").
    await showView(page, 'List');
    const list = page.getByRole('region', { name: 'Relationships', exact: true });
    await expect(list.getByText('Ion killed Lupul', { exact: true }).first()).toBeVisible();
    await expect(page).toHaveURL(/\?view=list$/);
    await showView(page, 'Map');
    // Turning Conflict off hides its line.
    await page.getByRole('button', { name: 'Conflict' }).click();
    await expect(page.getByRole('button', { name: 'Conflict' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(map.locator('[data-category="conflict"]')).toHaveCount(0);
    await expect(map.locator('[data-category]')).toHaveCount(2);
    // A card is a real link to the sheet.
    await map.getByRole('link', { name: 'Lupul', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/characters/${cast.lupul}$`));
    await expect(page.getByRole('heading', { level: 2, name: 'Lupul' })).toBeVisible();
    await page.context().close();
  });

  test('on a phone the map fits, and zoomed in it scrolls inside its region', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections`, 390);
    const map = page.getByTestId('atlas-relationship-map');
    await expect(map.getByRole('link', { name: 'Ana', exact: true })).toBeVisible();
    // At first the whole map fits across the screen (G10b2: "Fit").
    const fitted = await map.evaluate((region) => region.scrollWidth - region.clientWidth);
    expect(fitted).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    const sizes = await map.evaluate((region) => ({
      scrollWidth: region.scrollWidth,
      clientWidth: region.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(sizes.scrollWidth).toBeGreaterThan(sizes.clientWidth);
    expect(sizes.pageWidth).toBeLessThanOrEqual(390);
    await page.context().close();
  });

  test('a dragged card keeps its place, and dropped on another opens Add a connection', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections`);
    const lupul = `[data-map-card="${cast.lupul}"]`;
    await expect(page.locator(lupul)).toBeVisible();
    const placeOfLupul = () =>
      runSql(
        `select coalesce(map_x::text, 'none') from public.story_characters where id = '${cast.lupul}'`,
      );
    // Dragged a little way onto empty map, the card stays there and the place is saved.
    // The whole map in view first, so both ends of each drag are on the screen.
    await page.getByTestId('atlas-relationship-map').scrollIntoViewIfNeeded();
    const start = await centreOf(page, lupul);
    await dragBetween(page, start, { x: start.x + 40, y: start.y + 30 });
    await expect.poll(placeOfLupul).not.toBe('none');
    await expect(page).toHaveURL(/\/connections$/);
    // Arrange for me forgets every place (the button alternative to dragging).
    await page.getByRole('button', { name: 'Arrange for me' }).click();
    await expect.poll(placeOfLupul).toBe('none');
    await expect(page.getByRole('button', { name: 'Arrange for me' })).toBeDisabled();
    // Dropped on Ana's card, it opens the form with both picked; nothing is saved yet.
    await dragBetween(
      page,
      await centreOf(page, lupul),
      await centreOf(page, `[data-map-card="${cast.ana}"]`),
    );
    const form = page.getByRole('region', { name: 'Add a relationship', exact: true });
    await expect(form.getByLabel('Character', { exact: true })).toHaveValue(cast.lupul);
    await expect(form.getByLabel('Other character', { exact: true })).toHaveValue(cast.ana);
    await expect(form.getByLabel('Kind', { exact: true })).toBeFocused();
    expect(placeOfLupul()).toBe('none');
    // Focus on fades everyone not linked to the chosen character.
    await page.getByLabel('Focus on', { exact: true }).selectOption({ label: 'Lupul' });
    await expect(page.locator(`[data-map-card="${cast.vali}"]`)).toHaveClass(/opacity-30/);
    await expect(page.locator(`[data-map-card="${cast.ion}"]`)).not.toHaveClass(/opacity-30/);
    await page.context().close();
  });

  test('the family tree lays out generations and counts who is left off', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections?view=tree`);
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
    await addOnConnections(page, {
      from: 'Mara',
      group: 'Family',
      kind: 'Turned or made',
      to: 'Lupul',
    });
    await expect(
      treeCard.getByText('2 characters with no family links are left off.'),
    ).toBeVisible();
    await treeCard.getByRole('button', { name: 'Include turned or made' }).click();
    await expect(generations.getByRole('listitem')).toHaveText([
      'Generation 1: Ana, Ion, Mara',
      'Generation 2: Lupul, Vali',
    ]);
    await expect(treeCard.getByText(/left off/)).toHaveCount(0);
    // Whose tree: only Mara's family (G10b2, board AtlasFamilyTree).
    await treeCard.getByLabel('Whose tree', { exact: true }).selectOption({ label: 'Mara' });
    await expect(generations.getByRole('listitem')).toHaveText([
      'Generation 1: Mara',
      'Generation 2: Lupul',
    ]);
    await expect(
      treeCard.getByRole('list', { name: 'Line styles' }).getByRole('listitem'),
    ).toHaveText(['Parent', 'Sibling', 'Partner', 'Cousin']);
    // Each box opens the sheet.
    await expect(
      page.getByTestId('atlas-family-tree').getByRole('link', { name: 'Mara', exact: true }),
    ).toHaveAttribute('href', `${planAddress}/characters/${cast.mara}`);
    await page.context().close();
  });

  test('Delete asks twice, then the relationship is gone from both sheets', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections?view=list`);
    const list = page.getByRole('region', { name: 'Relationships', exact: true });
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

  test('a cousin says which cousin, and an "Other" one reads from each side', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/connections?view=list`);
    const form = await openAddForm(page);
    const list = page.getByRole('region', { name: 'Relationships', exact: true });
    // A second cousin once removed (G10b: first to third cousins, up to three times removed).
    await form.getByLabel('Character', { exact: true }).selectOption({ label: 'Mara' });
    await form.getByLabel('Relationship', { exact: true }).selectOption({ label: 'Cousin of' });
    await form.getByLabel('Other character', { exact: true }).selectOption({ label: 'Vali' });
    await form.getByLabel('Which cousin', { exact: true }).selectOption({ label: 'Second cousin' });
    await form
      .getByLabel('Generations apart', { exact: true })
      .selectOption({ label: 'Once removed' });
    await form.getByRole('button', { name: 'Add relationship' }).click();
    await expect(
      list.getByText('Mara is the second cousin once removed of Vali', { exact: true }).first(),
    ).toBeVisible();
    // "Other" in the writer's own words, both ways.
    await form.getByLabel('Character', { exact: true }).selectOption({ label: 'Ana' });
    await form.getByLabel('Kind', { exact: true }).selectOption({ label: 'Other' });
    await form.getByLabel('Other character', { exact: true }).selectOption({ label: 'Mara' });
    await form.getByRole('textbox', { name: 'What is Ana to Mara?' }).fill('godmother of');
    await form
      .getByRole('textbox', { name: 'What is Mara to Ana? (optional)' })
      .fill('goddaughter of');
    await form.getByRole('button', { name: 'Add relationship' }).click();
    await expect(list.getByText('Ana: godmother of Mara', { exact: true }).first()).toBeVisible();
    // In the tree, the younger cousin sits a generation below Mara; Mara joins the top row.
    await showView(page, 'Family tree');
    await expect(
      page.getByRole('list', { name: 'Generations' }).getByRole('listitem').first(),
    ).toHaveText('Generation 1: Ana, Ion, Mara');
    // Mara's sheet tells it from her side.
    await page.goto(`${planAddress}/characters/${cast.mara}`);
    const maraSection = page.getByRole('region', { name: 'Relationships', exact: true });
    await expect(
      maraSection.getByText('Mara: goddaughter of Ana', { exact: true }).first(),
    ).toBeVisible();
    await page.context().close();
  });

  test('a clashing relationship warns, and Save anyway keeps it with a note', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `${planAddress}/characters/${cast.vali}`);
    const section = page.getByRole('region', { name: 'Relationships', exact: true });
    // Ana is Vali's parent; making them siblings too is a clash (G10b, handoff A5).
    await section.getByLabel('Relationship', { exact: true }).selectOption({ label: 'Sibling of' });
    await section.getByLabel('Other character', { exact: true }).selectOption({ label: 'Ana' });
    await section.getByRole('button', { name: 'Add relationship' }).click();
    await expect(section.getByText('This clashes with a relationship already here.')).toBeVisible();
    await expect(section.getByText(/Already here: “Ana is the parent of Vali”/)).toBeVisible();
    // Go back closes the warning and saves nothing.
    await section.getByRole('button', { name: 'Go back' }).click();
    await expect(section.getByLabel('Kind', { exact: true })).toBeFocused();
    await expect(section.getByText('Vali is the sibling of Ana', { exact: true })).toHaveCount(0);
    // Never a block: Save anyway keeps it, with the note on how both are true.
    await section.getByRole('button', { name: 'Add relationship' }).click();
    await section
      .getByRole('textbox', { name: 'How both are true (optional)' })
      .fill('A spell swapped their ages.');
    await section.getByRole('button', { name: 'Save anyway' }).click();
    await expect(
      section.getByText('Vali is the sibling of Ana', { exact: true }).first(),
    ).toBeVisible();
    await expect(section.getByText('A spell swapped their ages.')).toBeVisible();
    await page.context().close();
  });

  test('a gender picks mother and son, and "Add to this tree" adds a child', async ({
    browser,
  }) => {
    // Ana is Vali's parent. With a gender she is his mother (GAPS-3, board
    // AtlasCharacterRelationship).
    const page = await openAs(browser, 'adult_writer', `${planAddress}/characters/${cast.ana}`);
    const gender = page.getByLabel('Gender', { exact: true });
    await expect(gender.locator('option')).toHaveText(['Not set', 'She', 'He', 'They']);
    await gender.selectOption({ label: 'She' });
    await expect(page.locator('#atlas-character-gender-save')).toHaveText('Saved');
    await expect(
      page
        .getByRole('region', { name: 'Relationships', exact: true })
        .getByText('Ana is the mother of Vali', { exact: true })
        .first(),
    ).toBeVisible();
    // On Vali's own sheet it is told from his side: the son.
    await page.goto(`${planAddress}/characters/${cast.vali}`);
    await page.getByLabel('Gender', { exact: true }).selectOption({ label: 'He' });
    await expect(page.locator('#atlas-character-gender-save')).toHaveText('Saved');
    await expect(
      page
        .getByRole('region', { name: 'Relationships', exact: true })
        .getByText('Vali is the son of Ana', { exact: true })
        .first(),
    ).toBeVisible();
    // The tree adds to itself (board AtlasFamilyTree: "Add to Mara's tree"). Reduced motion, as
    // checkScreen does, so axe measures the settled page and not one still fading in.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${planAddress}/connections?view=tree`);
    const treeCard = page.getByRole('region', { name: 'Family tree', exact: true });
    await treeCard.getByLabel('Whose tree', { exact: true }).selectOption({ label: 'Mara' });
    await treeCard.getByRole('button', { name: 'Add to this tree' }).click();
    const form = treeCard.getByRole('form', { name: 'Add to Mara’s tree' });
    await expect(form.getByLabel('How they’re related to Mara').locator('option')).toHaveText([
      'Parent',
      'Child',
      'Sibling',
      'Partner or spouse',
      'Cousin',
    ]);
    // Both characters are needed.
    await form.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(form.getByText('Pick both characters.')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await form.getByLabel('Character', { exact: true }).selectOption({ label: 'Lupul' });
    await form.getByLabel('How they’re related to Mara').selectOption({ label: 'Child' });
    await form.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(form.getByText('Relationship added.')).toBeVisible();
    // Lupul now sits a generation under Mara, and the relationship runs from parent to child.
    await expect(
      treeCard.getByRole('list', { name: 'Generations' }).getByRole('listitem').filter({
        hasText: 'Lupul',
      }),
    ).toHaveCount(1);
    expect(
      runSql(`select count(*) from public.story_character_relationships
        where from_character_id = '${cast.mara}' and to_character_id = '${cast.lupul}' and kind = 'parent_of'`),
    ).toBe('1');
    // Cancel closes the form.
    await form.getByRole('button', { name: 'Cancel' }).click();
    await expect(form).toHaveCount(0);
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
      await expectNoDoodles(page);
      await context.close();
    });
  }
});
