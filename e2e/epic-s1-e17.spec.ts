/**
 * Epic check for S1-E17, Story Atlas (story S1-E17-QA; bundle ATLAS, part i).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's main journeys across its stories, in a real browser.
 * - Journey 1 (S1-E17-08 × S1-E17-30 × S1-E17-13): a writer with two stories makes a character
 *   in one → it survives a reload → searching the other story finds nothing of it, searching
 *   its own finds it → deleting it leaves nothing to find.
 * - Journey 2 (S1-E17-01 × S1-E17-32 × S1-E17-33): another member and a staff account open the
 *   writer's private plan and get nothing; once the writer makes Characters public, both see
 *   exactly the public characters on the readers' page, never the one kept private.
 * The axe runs for every Story Atlas screen (390, 768 and 1440 px, light and night, ro and en)
 * live in each story's own spec (atlas-*.spec.ts); the allowed and denied database tests per
 * policy are in supabase/tests/database/18x-19x. Test data: adult_writer gets two stories of its
 * own, removed afterwards; teen_17 and moderator only read.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const firstStory = { id: 'e2e17990-0000-4000-9000-000000000001', slug: 'atlas-epic-a01' };
const secondStory = { id: 'e2e17990-0000-4000-9000-000000000002', slug: 'atlas-epic-b01' };
const keptPrivateId = 'e2e17990-0000-4000-8000-000000000002';

/** Removes both stories (their plans and characters go with them). */
function cleanUp() {
  runSql(`
    delete from public.story_characters where story_id in ('${firstStory.id}', '${secondStory.id}');
    delete from public.story_plans where story_id in ('${firstStory.id}', '${secondStory.id}');
    delete from public.chapters where story_id in ('${firstStory.id}', '${secondStory.id}');
    delete from public.stories where id in ('${firstStory.id}', '${secondStory.id}');
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teen_17', 'moderator');`);
}

/** The writer's two stories; the first has one published chapter so readers may open it. */
function seedStories() {
  runSql(`
    insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating, first_published_at)
    values ('${firstStory.id}', '${writerId}', '${firstStory.slug}', 'Pădurea de argint', 'Un drum prin pădure.', 'ro',
             (select id from public.categories where slug = 'fiction'), 'all_ages', now()),
           ('${secondStory.id}', '${writerId}', '${secondStory.slug}', 'Orașul de sticlă', 'Un oraș fragil.', 'ro',
             (select id from public.categories where slug = 'fiction'), 'all_ages', null);
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status,
                                 published_title, published_body, first_published_at, last_published_at)
    values ('${firstStory.id}', '${writerId}', 'e2e179aa', 1, 'Intrarea', 'Unu.', 'published', 'Intrarea', 'Unu.', now(), now());`);
}

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Searches the open story from the top bar's box. */
async function searchFor(page: Page, slug: string, query: string) {
  await page.goto(`/plan/s/${slug}`);
  const box = page.getByRole('searchbox', { name: 'Search this story' });
  await box.fill(query);
  await box.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();
}

test.describe('Epic check: Story Atlas (S1-E17-QA)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedStories();
  });
  test.afterAll(cleanUp);

  test('journey 1: a character stays in its own story, survives a reload and goes when deleted', async ({
    browser,
  }) => {
    // Step 1: a new character in the first story, kept after a reload.
    const page = await openAs(browser, 'adult_writer', `/plan/s/${firstStory.slug}/characters`);
    await page.getByRole('button', { name: 'New character' }).click();
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Ilinca Vrăjitoarea');
    await expect(page.locator('#atlas-character-name-save')).toHaveText('Saved');
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
      'Ilinca Vrăjitoarea',
    );
    // Step 2: the other story knows nothing of her; her own story finds her, accents ignored.
    await searchFor(page, secondStory.slug, 'ilinca');
    await expect(page.getByText('Nothing in this story matches “ilinca”.')).toBeVisible();
    await searchFor(page, firstStory.slug, 'vrajitoarea');
    await expect(page.getByRole('link', { name: /Ilinca Vrăjitoarea/ })).toBeVisible();
    // Step 3: deleted (after a second click), she is gone from search too.
    await page.getByRole('link', { name: /Ilinca Vrăjitoarea/ }).click();
    const deleteSection = page.getByRole('region', { name: 'Delete this character' });
    await deleteSection.getByRole('button', { name: 'Delete character' }).click();
    await deleteSection.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(page).toHaveURL(new RegExp(`/plan/s/${firstStory.slug}/characters$`));
    await searchFor(page, firstStory.slug, 'ilinca');
    await expect(page.getByText('Nothing in this story matches “ilinca”.')).toBeVisible();
    await page.context().close();
  });

  test('journey 2: others never see the private plan, and see exactly what the writer shares', async ({
    browser,
  }) => {
    runSql(`insert into public.story_characters (id, story_id, user_id, name, is_private)
      values ('e2e17990-0000-4000-8000-000000000001', '${firstStory.id}', '${writerId}', 'Maria Pădurăreasa', false),
             ('${keptPrivateId}', '${firstStory.id}', '${writerId}', 'Umbra', true);`);
    for (const persona of ['teen_17', 'moderator'] as const) {
      // The writer's own planning pages are the writer's alone, staff included.
      const page = await openAs(browser, persona, `/plan/s/${firstStory.slug}/characters`);
      await expect(
        page.getByText('We couldn’t find that story among yours.', { exact: false }),
      ).toBeVisible();
      await expect(page.getByText('Maria Pădurăreasa')).toHaveCount(0);
      // Nothing is public until an area is on.
      await page.goto(`/s/${firstStory.slug}/atlas/characters`);
      await expect(page.getByText('This isn’t available.', { exact: false })).toBeVisible();
      await page.context().close();
    }
    runSql(`insert into public.story_plans (story_id, user_id, public_areas)
      values ('${firstStory.id}', '${writerId}', '{characters}')
      on conflict (story_id) do update set public_areas = excluded.public_areas;`);
    for (const persona of ['teen_17', 'moderator'] as const) {
      const page = await openAs(browser, persona, `/s/${firstStory.slug}/atlas/characters`);
      await expect(page.getByRole('link', { name: /Maria Pădurăreasa/ })).toBeVisible();
      await expect(page.getByText('Umbra')).toHaveCount(0);
      await page.goto(`/s/${firstStory.slug}/atlas/characters/${keptPrivateId}`);
      await expect(page.getByRole('heading', { name: 'Umbra' })).toHaveCount(0);
      await page.context().close();
    }
  });
});
