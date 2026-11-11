/**
 * Languages I read, in a real browser (bundle MARKETS-2, part c; IDEA-20261109-2).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a signed-out visitor reads the language menu's language only: in English the tag page shows
 *   the English story, and "Any language" on the See all filter brings back the rest;
 * - a member who picked nothing reads the interface language plus English (Romanian and English,
 *   not Swedish);
 * - a member who ticks only Swedish in Settings › Language › Reading languages sees only the
 *   Swedish story, and unticking every language goes back to the default;
 * - the Language settings pass axe and don't scroll sideways at 390, 768 and 1440 px, light and
 *   night, Romanian and English.
 * Test data: three stories of its own by adult_writer (Romanian, English and Swedish), one chapter
 * each, all tagged "e2e-limbi", removed afterwards; adult_writer's reading languages and language
 * are put back.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const tag = 'e2e-limbi';

/** This spec's stories: slug, title and language. */
const stories = [
  ['lang-e2e-ro', 'Vara la bunici', 'ro'],
  ['lang-e2e-en', 'Summer Lights', 'en'],
  ['lang-e2e-sv', 'Sommarljus', 'sv'],
] as const;

/** Removes this spec's stories, chapters and tag, and puts adult_writer back. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'lange%';
    delete from public.stories where slug like 'lang-e2e-%';
    delete from public.tags where normalised_name = '${tag}';
    update public.profiles set reading_languages = null, locale = 'ro' where id = '${adultWriterId}';`);
}

/** The three stories, each with one published chapter and the shared tag. */
function seedStories() {
  cleanUp();
  const rows = stories.map(
    ([slug, title, language]) =>
      `('${adultWriterId}', '${slug}', '${title}', 'x', '${language}',
        (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now())`,
  );
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ${rows.join(',')};
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'lange' || substr(md5(slug), 1, 3), 1, 'Unu', 'x', 1, 'published', 'Unu',
      'Text.', 1, now() from public.stories where slug like 'lang-e2e-%';
    insert into public.tags (name, normalised_name, status) values ('${tag}', '${tag}', 'approved');
    insert into public.story_tags (story_id, tag_id, user_id)
    select stories.id, tags.id, stories.user_id from public.stories, public.tags
    where stories.slug like 'lang-e2e-%' and tags.normalised_name = '${tag}';`);
}

/**
 * Says which of this spec's stories a page lists.
 *
 * @param page - a tag or See all page
 * @returns the titles shown, in the order of the stories array
 */
async function titlesShown(page: Page): Promise<string[]> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Wait for the list itself: at least one of the three, or the empty line.
  await expect(
    page
      .getByRole('link', { name: /Vara la bunici|Summer Lights|Sommarljus/ })
      .first()
      .or(page.getByText(/No stories|Nicio poveste/).first()),
  ).toBeVisible();
  const shown: string[] = [];
  for (const [, title] of stories) {
    if ((await page.getByRole('link', { name: title }).count()) > 0) shown.push(title);
  }
  return shown;
}

/** adult_writer's page in a fresh browser context, in English. */
async function openAsWriter(browser: Browser, address: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${adultWriterId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Languages I read (MARKETS-2c)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('a visitor reads the language menu’s language, and "Any language" shows the rest', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto(`/discover/t/${tag}`);
    expect(await titlesShown(page)).toEqual(['Summer Lights']);
    // The filter starts on "Languages I read"; "Any language" turns it off.
    const language = page
      .getByRole('group', { name: 'Filters' })
      .getByRole('combobox', { name: 'Language' });
    await expect(language).toHaveValue('');
    await language.selectOption({ label: 'Any language' });
    await expect(page).toHaveURL(/language=any/);
    await expect(page.getByRole('link', { name: 'Sommarljus' })).toBeVisible();
    expect(await titlesShown(page)).toEqual(['Vara la bunici', 'Summer Lights', 'Sommarljus']);
    await context.close();
  });

  test('a member who picked nothing reads Romanian and English', async ({ browser }) => {
    // adult_writer's account is Romanian here, so the default is Romanian plus English.
    runSql(`update public.profiles set locale = 'ro' where id = '${adultWriterId}';`);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    await page.goto(`/discover/t/${tag}`);
    expect(await titlesShown(page)).toEqual(['Vara la bunici', 'Summer Lights']);
    await context.close();
  });

  test('a member who ticks only Swedish sees only the Swedish story', async ({ browser }) => {
    const page = await openAsWriter(browser, '/settings#language');
    const section = page.getByRole('region', { name: 'Reading languages' });
    await expect(section.getByText(/With none ticked, you read English\./)).toBeVisible();
    // English is ticked by default for an English-speaking member; untick it and tick Swedish.
    await section.getByRole('checkbox', { name: 'English' }).uncheck();
    await section.getByRole('checkbox', { name: 'Svenska' }).check();
    await section.getByRole('button', { name: 'Save' }).click();
    await expect(
      section.getByText('Saved. The story lists follow these languages now.'),
    ).toBeVisible();
    expect(
      runSql(
        `select array_to_string(reading_languages, ',') from public.profiles where id = '${adultWriterId}'`,
      ),
    ).toBe('sv');

    await page.goto(`/discover/t/${tag}`);
    expect(await titlesShown(page)).toEqual(['Sommarljus']);

    // Unticking every language goes back to the default.
    await page.goto('/settings#language');
    await section.getByRole('checkbox', { name: 'Svenska' }).uncheck();
    await section.getByRole('button', { name: 'Save' }).click();
    await expect(
      section.getByText('Saved. The story lists follow these languages now.'),
    ).toBeVisible();
    expect(
      runSql(
        `select coalesce(array_to_string(reading_languages, ','), 'default') from public.profiles where id = '${adultWriterId}'`,
      ),
    ).toBe('default');
    await page.context().close();
  });

  for (const view of everyView(['/settings#language'])) {
    test(`axe, Language settings: ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${adultWriterId}';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view);
    });
  }
});
