/**
 * The Story Atlas bible in a real browser (stories S1-E17-17 and S1-E17-18; bundle ATLAS, part d).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a story's bible starts with the seven default sections; a section is added, renamed (empty
 *   gives the default name back), moved with Up and by dragging, and deleted only when empty
 *   after a second click (S1-E17-17);
 * - "New entry" opens an entry ready to write; its title, tags and text save by themselves;
 *   reading mode shows clickable links and an Edit toggle; moving it to another section puts it
 *   there; Delete asks twice (S1-E17-18);
 * - the page passes axe, doesn't scroll sideways and draws no doodle at 390, 768 and
 *   1440 px, light and night, Romanian and English, with an entry open and with the sections.
 * Test data: adult_writer's seed story "Stația meteo" (its bible goes back to the defaults at the
 * end); suspended_user (whose language no other spec changes) gets one seeded story with one
 * entry for the accessibility checks.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerStoryId = '00000000-0000-4000-9000-000000000001';
const bibleAddress = '/plan/s/statia-meteo-seed01/world';
const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const axeEntryId = 'e2e17170-0000-4000-8000-000000000001';
const axeBible = '/plan/s/atlas-bible-seed01/world';

/** Puts the writer's bible back to the seven defaults and removes this spec's story. */
function cleanUp() {
  runSql(`
    delete from public.story_bible_entries where story_id = '${writerStoryId}';
    delete from public.story_bible_sections where story_id = '${writerStoryId}';
    select public.make_bible_sections(story_id, user_id) from public.story_plans where story_id = '${writerStoryId}';
    delete from public.story_bible_entries where story_id in (select id from public.stories where slug = 'atlas-bible-seed01');
    delete from public.stories where slug = 'atlas-bible-seed01';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'suspended_user');`);
}

/** suspended_user's story with one entry in World and places, for the accessibility checks. */
function seedAxeStory() {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating)
    values ('${suspendedUserId}', 'atlas-bible-seed01', 'Farul de pe stâncă', 'Un far stins.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages');
    insert into public.story_bible_entries (id, story_id, user_id, section_id, title, tags, body)
    select '${axeEntryId}', sections.story_id, sections.user_id, sections.id, 'Farul', '{far,coastă}',
      'Farul are **trei** etaje. Vezi [harta](https://example.com/harta).'
    from public.story_bible_sections as sections
    join public.stories on stories.id = sections.story_id
    where stories.slug = 'atlas-bible-seed01' and sections.preset = 'world';`);
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

/** The section names in the contents, in order. */
async function contentsOrder(page: Page): Promise<string[]> {
  return page
    .getByRole('navigation', { name: 'Sections' })
    .getByRole('heading', { level: 3 })
    .allTextContents();
}

/**
 * Drags one section's handle onto another row with the browser's own drag events, carrying one
 * DataTransfer from start to drop as a real drag does.
 */
async function dragSection(page: Page, fromIndex: number, toIndex: number) {
  const rows = page.getByTestId('atlas-bible-section-row');
  const handle = await rows.nth(fromIndex).locator('[draggable="true"]').elementHandle();
  const target = await rows.nth(toIndex).locator('[role="presentation"]').elementHandle();
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await handle?.dispatchEvent('dragstart', { dataTransfer });
  await target?.dispatchEvent('dragover', { dataTransfer });
  await target?.dispatchEvent('drop', { dataTransfer });
  await handle?.dispatchEvent('dragend', { dataTransfer });
}

const defaults = [
  'Premise and themes',
  'World and places',
  'Magic and rules',
  'Cosmology and belief',
  'Factions and organisations',
  'History',
  'Glossary',
];

test.describe('Story Atlas story world, once the bible (S1-E17-17 and S1-E17-18)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedAxeStory();
  });
  test.afterAll(cleanUp);

  test('an old /bible address still opens the story world (ADMIN-2a2)', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/plan/s/statia-meteo-seed01/bible?edit');
    await expect(page).toHaveURL(/\/plan\/s\/statia-meteo-seed01\/world\?edit$/);
    await expect(page.getByRole('heading', { name: 'Story world', level: 1 })).toBeVisible();
  });

  test('the story world starts with the default sections, which can be renamed, added and moved', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', bibleAddress);
    await expect(page.getByRole('link', { name: 'Story world' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect.poll(async () => contentsOrder(page)).toEqual(defaults);
    // Rename History, then empty the box to get the default name back.
    const history = page.getByRole('textbox', { name: 'Name of section 6' });
    await history.fill('Old wars');
    await expect(page.locator(`#${await history.getAttribute('id')}-save`)).toHaveText('Saved');
    await expect.poll(async () => (await contentsOrder(page))[5]).toBe('Old wars');
    await history.fill('');
    await expect.poll(async () => (await contentsOrder(page))[5]).toBe('History');
    // Add a section of the writer's own, at the end.
    await page.getByRole('textbox', { name: 'New section’s name' }).fill('Creatures');
    await page.getByRole('button', { name: 'Add section' }).click();
    await expect.poll(async () => (await contentsOrder(page)).at(-1)).toBe('Creatures');
    // Up moves it one place; dragging it onto the first row makes it first.
    await page.getByRole('button', { name: 'Move Creatures up' }).click();
    await expect.poll(async () => (await contentsOrder(page))[6]).toBe('Creatures');
    await dragSection(page, 6, 0);
    await expect.poll(async () => (await contentsOrder(page))[0]).toBe('Creatures');
    await expect(page.getByRole('button', { name: 'Move Creatures up' })).toBeDisabled();
    await page.context().close();
  });

  test('a new entry opens ready to write, saves by itself and reads with clickable links', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', bibleAddress);
    await page.getByRole('button', { name: 'New entry in World and places' }).click();
    await expect(page).toHaveURL(/\/world\/[0-9a-f-]{36}\?edit$/);
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('textbox', { name: 'Title' }).fill('Old harbour');
    await expect(page.locator('#atlas-bible-entry-title-save')).toHaveText('Saved');
    await page.getByRole('textbox', { name: 'Tags' }).fill('city, north, City');
    await expect(page.locator('#atlas-bible-entry-tags-save')).toHaveText('Saved');
    await page
      .getByRole('textbox', { name: 'Text' })
      .fill('The harbour has **three** lighthouses.\n\nSee [the map](https://example.com/map).');
    await expect(page.locator('#atlas-bible-entry-body-save')).toHaveText('Saved');
    // Reading mode, after a reload: the text as Markdown, the link clickable and safe.
    await page.goto(page.url().replace('?edit', ''));
    const entry = page.getByRole('article', { name: 'Old harbour' });
    await expect(entry.getByRole('button', { name: 'Edit' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(entry.locator('strong')).toHaveText('three');
    const link = entry.getByRole('link', { name: 'the map' });
    await expect(link).toHaveAttribute('href', 'https://example.com/map');
    await expect(link).toHaveAttribute('rel', 'nofollow ugc noopener');
    await expect(entry.getByRole('list', { name: 'Tags' }).getByRole('listitem')).toHaveText([
      'city',
      'north',
    ]);
    // Moving it to another section puts it there.
    await entry.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Section', { exact: true }).selectOption({ label: 'Creatures' });
    await expect(page.locator('#atlas-bible-entry-section-save')).toHaveText('Saved');
    await expect(entry.getByText('In Creatures')).toHaveCount(0);
    await entry.getByRole('button', { name: 'Edit' }).click();
    await expect(entry.getByText('In Creatures')).toBeVisible();
    const contents = page.getByRole('navigation', { name: 'Sections' });
    await expect(
      contents.getByRole('list', { name: 'Creatures' }).getByRole('link', { name: 'Old harbour' }),
    ).toBeVisible();
    await page.context().close();
  });

  test('only an empty section can be deleted, and each delete asks twice', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', bibleAddress);
    await page.getByRole('button', { name: 'Delete Creatures' }).click();
    await expect(
      page.getByText('Delete the section “Creatures”? This can’t be undone.'),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(
      page.getByText('Move or delete its entries first', { exact: false }),
    ).toBeVisible();
    // Delete the entry, asking twice.
    await page.getByRole('link', { name: 'Old harbour' }).click();
    await page.getByRole('button', { name: 'Delete entry' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();
    await page.getByRole('button', { name: 'Delete entry' }).click();
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(page).toHaveURL(/\/world$/);
    await expect(page.getByRole('link', { name: 'Old harbour' })).toHaveCount(0);
    // Now empty, the section goes.
    await page.getByRole('button', { name: 'Delete Creatures' }).click();
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    await expect.poll(async () => contentsOrder(page)).toEqual(defaults);
    await page.context().close();
  });

  for (const view of everyView([`${axeBible}/${axeEntryId}`, axeBible])) {
    test(`the bible passes axe at ${view.address.endsWith('world') ? 'sections' : 'entry'}, ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${suspendedUserId}';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('suspended_user')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.getByRole('link', { name: 'Farul', exact: true })).toBeVisible();
      await expectNoDoodles(page);
      await context.close();
    });
  }
});
