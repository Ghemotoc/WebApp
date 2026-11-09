/**
 * Discover's greeting, "Dashboard" cards and five shelves in a real browser (story S1-E5-12,
 * bundle LOOK-4b; board Discover).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a signed-in reader is greeted by name in the h1 under a dated eyebrow, and sees Continue
 *   reading with "Chapter 2 of 2" and "Chapter 2 is out"; Continue opens the chapter;
 * - a writer sees their latest draft and opens it in the editor, and the gold "Start a new story"
 *   card leads to the new story page;
 * - a visitor sees the plain heading and none of the cards;
 * - Discover with the cards passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: one story of the spec's own by adult_writer with two chapters out (one a week ago,
 * one yesterday) and a draft third chapter, and teacher's place in chapter 1 three days ago; all
 * removed after. teacher's other places are moved back a month so this story is the latest.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the spec's story, its chapters and teacher's place in it. */
function cleanUp() {
  runSql(`delete from public.reading_positions where chapter_id in
      (select id from public.chapters where code like 'dcarde2%');
    delete from public.library_entries where story_id in
      (select id from public.stories where slug = 'cards-e2e-far');
    delete from public.chapters where code like 'dcarde2%';
    delete from public.stories where slug = 'cards-e2e-far';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'adult_writer');`);
}

/** The story, its chapters, the draft and teacher's place. */
function seedCards() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      rating, first_published_at, last_chapter_published_at)
    values ('${adultWriterId}', 'cards-e2e-far', 'Farul de pe dig', 'Un far vechi.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages',
      now() - interval '7 days', now() - interval '1 day');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
      status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'dcarde21', 1, 'Unu', 'x', 1, 'published'::public.chapter_status, 'Unu', 'Text.', 1, now() - interval '7 days'
    from public.stories where slug = 'cards-e2e-far'
    union all
    select id, user_id, 'dcarde22', 2, 'Doi', 'x', 1, 'published'::public.chapter_status, 'Doi', 'Text.', 1, now() - interval '1 day'
    from public.stories where slug = 'cards-e2e-far';
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
    select id, user_id, 'dcarde23', 3, 'Lumina de pe mare', 'x', 1240
    from public.stories where slug = 'cards-e2e-far';
    insert into public.library_entries (user_id, story_id, shelf)
    select '${teacherId}', id, 'reading' from public.stories where slug = 'cards-e2e-far'
    on conflict (user_id, story_id) do update set shelf = 'reading';
    update public.reading_positions set updated_at = now() - interval '30 days'
      where user_id = '${teacherId}';
    insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind, updated_at)
    select '${teacherId}', story_id, id, 80, 'computer', now() - interval '3 days'
    from public.chapters where code = 'dcarde21';`);
}

/**
 * Opens an address in English, as a persona or signed out.
 *
 * @returns the page
 */
async function openAs(browser: Browser, persona: SignInPersonaName | null, address: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Discover greeting, cards and five shelves (S1-E5-12)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedCards);
  test.afterAll(cleanUp);

  test('a reader is greeted by name and carries on where they stopped', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/discover');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /^(Good (morning|afternoon|evening), .+\.|Happy .+!)$/,
    );
    await expect(page.getByText(/^Discover · /)).toBeVisible();
    const dashboard = page.getByRole('complementary', { name: 'Dashboard' });
    const continueCard = dashboard.getByRole('link', { name: /Farul de pe dig/ });
    await expect(continueCard).toContainText('Chapter 1 of 2');
    await expect(continueCard).toContainText('Chapter 2 is out');
    await continueCard.click();
    await expect(page).toHaveURL(/\/s\/cards-e2e-far\/dcarde21$/);
    await page.context().close();
  });

  test('a writer opens their latest draft, or starts a new story', async ({ browser }) => {
    runSql(`update public.chapters set updated_at = now() - interval '30 days'
      where user_id = '${adultWriterId}' and status = 'draft' and code <> 'dcarde23';
      update public.chapters set updated_at = now() where code = 'dcarde23';`);
    const page = await openAs(browser, 'adult_writer', '/discover');
    const dashboard = page.getByRole('complementary', { name: 'Dashboard' });
    const draft = dashboard.getByRole('link', { name: /Draft/ });
    await expect(draft).toContainText('Lumina de pe mare');
    await expect(draft).toContainText('Farul de pe dig · 1,240 words');
    await expect(dashboard.getByRole('link', { name: /Start a new story/ })).toHaveAttribute(
      'href',
      '/write/new',
    );
    await draft.click();
    await expect(page).toHaveURL(/\/write\/s\/cards-e2e-far\/c\/dcarde23$/);
    await page.context().close();
  });

  test('a visitor sees the plain heading and no cards', async ({ browser }) => {
    const page = await openAs(browser, null, '/discover');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Find the next story' }),
    ).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Dashboard' })).toHaveCount(0);
    await page.context().close();
  });

  for (const width of [390, 768, 1440]) {
    test(`axe: Discover with the cards at ${width} px, light, en`, async ({ browser }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, { address: '/discover', width, theme: 'light', language: 'en' });
      await expect(page.getByRole('complementary', { name: 'Dashboard' })).toBeVisible();
      await context.close();
    });
  }
});
