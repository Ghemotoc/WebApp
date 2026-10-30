/**
 * Tags that staff approve, with a name in each language, in a real browser (CMS-1e; Robert's tag
 * task, 30 Oct 2026, 10:43 to 10:50).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - in the tag box a name typed in another language becomes the interface language's name
 *   ("fantezie" is "Fantasy" in English), the recommended tags sit under the box, and a new tag
 *   says it is waiting for approval;
 * - readers see the story's approved tags in their own language and never the waiting one;
 * - a moderator approves the new tag with a name in each language, and readers then see it;
 * - a moderator rejects a tag: it leaves the story and the writer is told;
 * - Staff › Tags passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: a story of the spec's own by adult_writer, its tags and the writer's notifications
 * about it, removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const slug = 'tags-e2e-story';
const stamp = String(Date.now()).slice(-6);
const newTag = `Lumea bunicii e2e${stamp}`;
const spamTag = `Spam e2e${stamp}`;

/** Removes the spec's story, its chapter, the tags it made and the writer's notices about it. */
function cleanUp() {
  runSql(`delete from public.notifications where kind = 'tag_rejected'
      and story_id in (select id from public.stories where slug = '${slug}');
    delete from public.chapters where code = 'tagse2e1';
    delete from public.stories where slug = '${slug}';
    delete from public.tags where name like '% e2e%';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'moderator', 'owner');`);
}

/** The spec's story, with one published chapter so readers can open it. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${writerId}', '${slug}', 'Tagged orchard', 'x', 'en',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'tagse2e1', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()
    from public.stories where slug = '${slug}';`);
}

/** Opens a page as a persona (or a visitor) in a language. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The story page's tag list. */
function storyTags(page: Page) {
  return page.getByRole('list', { name: /^(Tags|Etichete)$/ });
}

test.describe('tags (CMS-1e)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('the writer tags in any language, picks a suggestion and adds a new tag', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `/write/s/${slug}/settings`);
    const box = page.getByLabel('Tags', { exact: true });
    // Step 1: "fantezie", typed with the interface in English, becomes Fantasy.
    await box.fill('fantezie');
    await box.press('Enter');
    await expect(page.getByRole('button', { name: 'Remove tag Fantasy' })).toBeVisible();
    // Step 2: a recommended tag from under the box.
    await page.getByRole('button', { name: 'Add the tag Adventure' }).click();
    await expect(page.getByRole('button', { name: 'Remove tag Adventure' })).toBeVisible();
    // Step 3: a tag nobody used before waits for staff.
    await box.fill(newTag);
    await box.press(',');
    await expect(page.getByText(`${newTag}(waiting for approval)`)).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
  });

  test('a reader sees the approved tags in Romanian and not the waiting one', async ({
    browser,
  }) => {
    const page = await openAs(browser, null, `/s/${slug}`, 'ro');
    const tags = storyTags(page);
    await expect(tags.getByRole('link', { name: 'Fantezie' })).toBeVisible();
    await expect(tags.getByRole('link', { name: 'Aventură' })).toBeVisible();
    await expect(tags.getByText(newTag)).toHaveCount(0);
  });

  test('a moderator approves the new tag with both names, and readers see it', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'moderator', '/staff/tags');
    const row = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: newTag }) });
    await expect(row.getByText('Used on 1 story')).toBeVisible();
    await row.getByLabel('Name in English').fill(`Grandma's world e2e${stamp}`);
    await row.getByRole('button', { name: `Approve ${newTag}` }).click();
    await expect(page.getByText('Approved. Readers see it now.')).toBeVisible();
    const reader = await openAs(browser, null, `/s/${slug}`, 'en');
    await expect(
      storyTags(reader).getByRole('link', { name: `Grandma's world e2e${stamp}` }),
    ).toBeVisible();
  });

  test('a moderator rejects a tag: it leaves the story and the writer is told', async ({
    browser,
  }) => {
    runSql(`select public.set_story_tags(id, user_id, array['Fantasy', '${spamTag}'])
      from public.stories where slug = '${slug}';`);
    const page = await openAs(browser, 'moderator', '/staff/tags');
    await page.getByRole('button', { name: `Reject ${spamTag}` }).click();
    await page.getByLabel('Why it is rejected').fill('Advertising, not a tag.');
    await page.getByRole('button', { name: 'Reject the tag' }).click();
    await expect(page.getByText('Rejected. It left every story', { exact: false })).toBeVisible();
    const writer = await openAs(browser, 'adult_writer', '/notifications');
    await expect(
      writer.getByText('took a new tag off your story “Tagged orchard”', { exact: false }),
    ).toBeVisible();
  });

  for (const view of everyView(['/staff/tags', '/staff/tags/missing'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
