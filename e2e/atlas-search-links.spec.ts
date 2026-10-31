/**
 * Search, [[Name]] cross-links and "Mentioned in" in Story Atlas in a real browser (stories
 * S1-E17-30, S1-E17-31 and the "Mentioned in" half of S1-E17-12; bundle ATLAS, part h).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the search box is in the top bar of every Story Atlas page; a search lists the open story's
 *   matches grouped by type, each with a snippet whose match is marked in bold, and a result
 *   opens its item (a note opens on the Ideas page with every note shown) (S1-E17-30);
 * - a search under two letters asks for more;
 * - in a bible entry, [[a name]] or [[an alias]] in any capitals is a link to its character, and
 *   a name nothing has yet reads "not found yet"; under the editing field the links show as
 *   chips; a note's and a timeline event's links do the same (S1-E17-31);
 * - "Mentioned in" on the sheet lists the places that link to the character and opens one with
 *   one click (S1-E17-12);
 * - the search page passes axe, doesn't scroll sideways and has no doodle over text at 390, 768
 *   and 1440 px, light and night, Romanian and English.
 * Test data: adult_writer gets "atlas-search-seed01"; suspended_user (whose language only the
 * Story Atlas specs change, one at a time) gets "atlas-search-seed02" for the accessibility
 * checks. Both go at the end.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const slug = 'atlas-search-seed01';
const anaId = '19800000-0000-4000-8000-0000000000a1';
const entryId = '19800000-0000-4000-8000-0000000000e1';
const axeAddress = '/plan/s/atlas-search-seed02/search?q=far';

/** Removes this spec's stories (everything planned in them goes with them). */
function cleanUp() {
  runSql(`
    delete from public.chapters where story_id in (select id from public.stories where slug like 'atlas-search-seed0%');
    delete from public.stories where slug like 'atlas-search-seed0%';
    update public.profiles set locale = 'ro' where id in ('${writerId}', '${suspendedUserId}');`);
}

/** A story with a character, an entry, a chapter, a note, an event and marketing notes. */
function seedStory(userId: string, storySlug: string, idSuffix: string) {
  const story = `(select id from public.stories where slug = '${storySlug}')`;
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating)
    values ('${userId}', '${storySlug}', 'Farul de pe stâncă', 'Un far stins.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages');
    insert into public.story_characters (id, story_id, user_id, name, sheet)
    values ('19800000-0000-4000-8000-0000000000a${idSuffix}', ${story}, '${userId}', 'Ana', '{"also_known_as": "Ani", "occupation": "Paznica farului"}'),
           ('19800000-0000-4000-8000-0000000000b${idSuffix}', ${story}, '${userId}', 'Bogdan', '{}');
    insert into public.story_bible_entries (id, story_id, user_id, section_id, title, body)
    values ('19800000-0000-4000-8000-0000000000e${idSuffix}', ${story}, '${userId}',
      (select id from public.story_bible_sections where story_id = ${story} order by position limit 1),
      'Farul', 'Aici [[ani]] urcă treptele. Vezi și [[Insula]].');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status)
    values (${story}, '${userId}', 'e2esrch${idSuffix}', 1, 'Furtuna', 'Ștefan o vede pe [[ANA]] în ploaie.', 'draft');
    insert into public.story_ideas (story_id, user_id, kind, body, outcome, done_at)
    values (${story}, '${userId}', 'question', 'Cine a stins farul?', '[[Bogdan]] știe.', now());
    insert into public.story_events (story_id, user_id, title, display_date, sort_value, description)
    values (${story}, '${userId}', 'Plecarea', '2055', 2055, '[[Ana]] pleacă din port.');
    insert into public.story_marketing (story_id, user_id, back_cover_blurb)
    values (${story}, '${userId}', 'Un far stins și o insulă care tace.');`);
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

/** Searches from the top bar's box. */
async function search(page: Page, query: string) {
  const box = page.getByRole('searchbox', { name: 'Search this story' });
  await box.fill(query);
  await box.press('Enter');
}

test.describe('Story Atlas search, cross-links and "Mentioned in" (S1-E17-30, 31 and 12)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedStory(writerId, slug, '1');
    seedStory(suspendedUserId, 'atlas-search-seed02', '2');
  });
  test.afterAll(cleanUp);

  test('the top bar’s search finds the story’s items, grouped by type, with the match marked', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `/plan/s/${slug}/bible`);
    await expect(page.getByRole('searchbox', { name: 'Search this story' })).toBeVisible();
    await search(page, 'far');
    await expect(page).toHaveURL(new RegExp(`/plan/s/${slug}/search\\?q=far$`));
    await expect(page.locator('h2[id^="atlas-search-"]')).toHaveText([
      'Characters (1)',
      'Bible entries (1)',
      'Questions and ideas (1)',
      'Marketing notes (1)',
    ]);
    await expect(page.getByText('4 results for “far”')).toBeVisible();
    const marketing = page.getByRole('region', { name: 'Marketing notes (1)' });
    await expect(marketing.getByRole('link', { name: 'Back-cover blurb' })).toBeVisible();
    await expect(marketing.locator('mark')).toHaveText('far');
    // Accents don't matter, and the manuscript is searched.
    await search(page, 'stefan');
    const chapters = page.getByRole('region', { name: 'Chapters (1)' });
    await expect(chapters.locator('mark')).toHaveText('Ștefan');
    await expect(chapters.locator('mark')).toHaveCSS('font-weight', '700');
    await chapters.getByRole('link', { name: 'Furtuna' }).click();
    await expect(page).toHaveURL(new RegExp(`/write/s/${slug}/c/e2esrch1$`));
    await page.context().close();
  });

  test('a result opens its item: a note done long ago opens with every note shown', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `/plan/s/${slug}/search?q=stins`);
    await page
      .getByRole('region', { name: 'Questions and ideas (1)' })
      .getByRole('link', { name: 'Cine a stins farul?' })
      .click();
    await expect(page.getByRole('radio', { name: 'All (1)' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByTestId('atlas-idea-item')).toHaveCount(1);
    // The note's [[link]] shows as a chip to the character.
    const chip = page.getByTestId('atlas-idea-item').getByRole('link', { name: 'Bogdan' });
    await chip.click();
    await expect(page).toHaveURL(
      new RegExp(`/plan/s/${slug}/characters/19800000-0000-4000-8000-0000000000b1$`),
    );
    await page.goto(`/plan/s/${slug}/search?q=a`);
    await expect(page.getByText('Type at least 2 letters to search.')).toBeVisible();
    await page.context().close();
  });

  test('a [[link]] in a bible entry opens its character, and an unknown name reads "not found yet"', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `/plan/s/${slug}/bible/${entryId}`);
    const entry = page.getByRole('article', { name: 'Farul' });
    await expect(entry.getByTestId('atlas-cross-link-missing')).toHaveText(
      'Insula (not found yet)',
    );
    // The editing field shows the same links as chips.
    await entry.getByRole('button', { name: 'Edit' }).click();
    await expect(entry.getByRole('list', { name: 'Links:' }).getByRole('listitem')).toHaveText([
      'ani',
      'Insula: not found yet',
    ]);
    await entry.getByRole('button', { name: 'Edit' }).click();
    await entry.getByRole('link', { name: 'ani' }).click();
    await expect(page).toHaveURL(new RegExp(`/plan/s/${slug}/characters/${anaId}$`));
    await page.context().close();
  });

  test('a timeline event’s [[link]] is a link to the character', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `/plan/s/${slug}/storyline?view=timeline`);
    const event = page.getByTestId('atlas-timeline-item').filter({ hasText: 'Plecarea' });
    await expect(event.getByRole('link', { name: 'Ana' })).toHaveAttribute(
      'href',
      `/plan/s/${slug}/characters/${anaId}`,
    );
    await page.context().close();
  });

  test('"Mentioned in" lists every place that links to the character and opens one', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `/plan/s/${slug}/characters/${anaId}`);
    const mentions = page.getByTestId('atlas-mentions');
    await expect(mentions.getByRole('listitem')).toHaveText([
      'Farulbible entry',
      'Furtunachapter',
      'Plecareatimeline event',
    ]);
    await mentions.getByRole('link', { name: 'Farul' }).click();
    await expect(page).toHaveURL(new RegExp(`/plan/s/${slug}/bible/${entryId}$`));
    await page.context().close();
  });

  everyView([axeAddress]).forEach((view) => {
    test(`the search page passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${suspendedUserId}';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('suspended_user')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.locator('mark').first()).toBeVisible();
      await expectNoDoodleOverlap(page);
      await context.close();
    });
  });
});
