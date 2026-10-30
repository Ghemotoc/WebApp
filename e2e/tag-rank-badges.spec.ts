/**
 * Rank badges under a story's cover, in a real browser (CMS-1g; Robert, 30 Oct 2026, 10:44 to 10:48).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the story page shows where the story stands in its tags ("#3 in Owls"), by the same popular
 *   order as the tag page, with the tag in the reader's language;
 * - the writer sees each tag's rank in Story settings, picks one tag, and the cover then shows only
 *   that one; "Show my 3 best ranks instead" brings the automatic badges back;
 * - Story settings with the picker passes axe at 390 px, light, ro and en.
 * Test data: six stories of the spec's own (adult_writer's "Ranked owls" and five by teacher), two
 * approved tags with English and Romanian names, and likes from seed personas, so the hourly
 * ranking job gives the same order whenever it runs. All removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const slug = 'rank-badges-e2e-story';
const stamp = String(Date.now()).slice(-6);
const owls = `Owls rbe${stamp}`;
const bufnite = `Bufnițe rbe${stamp}`;
const lanterns = `Lanterns rbe${stamp}`;

/** Removes the spec's stories (their chapters, likes, tags and scores go with them) and tags. */
function cleanUp() {
  runSql(`delete from public.chapter_likes where chapter_id in
      (select id from public.chapters where code like 'rankbe2%');
    delete from public.chapters where code like 'rankbe2%';
    delete from public.stories where slug like 'rank-badges-e2e%';
    -- "rbe" and not "e2e": tags.spec.ts removes tags named "… e2e…" while this spec may be running.
    delete from public.tags where name like '% rbe%';
    update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
}

/**
 * Six readable stories with both tags. Likes set the order: two others first, then the spec's
 * story with 3 likes, then three more; so it is 3rd of 6 in each tag.
 */
function seedStories() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    select case when number = 3 then '00000000-0000-4000-8000-000000000001'
        else '00000000-0000-4000-8000-000000000007' end::uuid,
      case when number = 3 then '${slug}' else 'rank-badges-e2e-' || number end,
      case when number = 3 then 'Ranked owls' else 'Other owls ' || number end,
      'x', 'en', (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now()
    from generate_series(1, 6) as number;
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'rankbe2' || right(slug, 1), 1, 'One', 'x', 1,
      'published', 'One', 'Text.', 1, now()
    from public.stories where slug like 'rank-badges-e2e%';
    insert into public.tags (name, normalised_name, status) values
      ('${owls}', public.normalise_tag('${owls}'), 'approved'),
      ('${lanterns}', public.normalise_tag('${lanterns}'), 'approved');
    insert into public.tag_names (tag_id, language_code, name, normalised_name)
    select tags.id, names.language, names.name, public.normalise_tag(names.name)
    from public.tags join (values ('${owls}', 'en', '${owls}'), ('${owls}', 'ro', '${bufnite}'),
      ('${lanterns}', 'en', '${lanterns}'), ('${lanterns}', 'ro', '${lanterns}')) as names (tag, language, name)
      on names.tag = tags.name;
    insert into public.story_tags (story_id, tag_id, user_id)
    select stories.id, tags.id, stories.user_id from public.stories, public.tags
    where stories.slug like 'rank-badges-e2e%' and tags.name in ('${owls}', '${lanterns}');
    insert into public.chapter_likes (user_id, chapter_id)
    select liker, chapters.id
    from public.stories join public.chapters on chapters.story_id = stories.id
    cross join lateral unnest(array['00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000006',
      '00000000-0000-4000-8000-000000000008']::uuid[]) with ordinality as likers (liker, place)
    -- Story n gets 6 - n likes; the spec's story ("…-story", so its slug ends in y) is number 3.
    where stories.slug like 'rank-badges-e2e%'
      and likers.place <= 6 - coalesce(nullif(right(stories.slug, 1), 'y'), '3')::integer;
    select public.compute_story_scores();`);
}

/** Opens a page as a visitor or as adult_writer, in a language. */
async function openAs(browser: Browser, isWriter: boolean, address: string, language: 'en' | 'ro') {
  const context = await browser.newContext();
  if (isWriter) {
    runSql(`update public.profiles set locale = '${language}' where handle = 'adult_writer';`);
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The badges under the cover. */
function badges(page: Page) {
  return page.getByRole('list', { name: /ranks in its tags|locul poveștii/i });
}

test.describe('rank badges (CMS-1g)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('a visitor sees the story’s ranks in its tags under the cover, as on the tag page', async ({
    browser,
  }) => {
    const page = await openAs(browser, false, `/s/${slug}`, 'en');
    await expect(badges(page)).toContainText(`#3 in ${owls}`);
    await expect(badges(page)).toContainText(`#3 in ${lanterns}`);
    await expect(badges(page)).toContainText('out of 6 stories');
  });

  test('a Romanian reader sees the tag in Romanian', async ({ browser }) => {
    const page = await openAs(browser, false, `/s/${slug}`, 'ro');
    await expect(badges(page)).toContainText(`#3 în ${bufnite}`);
  });

  test('the writer picks one tag, and the cover shows only that one', async ({ browser }) => {
    const settings = await openAs(browser, true, `/write/s/${slug}/settings`, 'en');
    const owlsChip = settings.getByRole('button', { name: `${owls} · #3 of 6` });
    await expect(owlsChip).toHaveAttribute('aria-pressed', 'false');
    await expect(settings.getByText('Showing your 3 best ranks.')).toBeVisible();
    await owlsChip.click();
    await expect(owlsChip).toHaveAttribute('aria-pressed', 'true');
    await expect(settings.getByText('Showing the 1 tag you picked.')).toBeVisible();

    const story = await openAs(browser, false, `/s/${slug}`, 'en');
    await expect(badges(story)).toContainText(`#3 in ${owls}`);
    await expect(badges(story)).not.toContainText(lanterns);

    await settings.getByRole('button', { name: 'Show my 3 best ranks instead' }).click();
    await expect(settings.getByText('Showing your 3 best ranks.')).toBeVisible();
    const again = await openAs(browser, false, `/s/${slug}`, 'en');
    await expect(badges(again)).toContainText(`#3 in ${lanterns}`);
  });

  for (const language of ['ro', 'en'] as const) {
    test(`axe: Story settings with the picker at 390 px, light, ${language}`, async ({ page }) => {
      runSql(`update public.profiles set locale = '${language}' where handle = 'adult_writer';`);
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, {
        address: `/write/s/${slug}/settings`,
        width: 390,
        theme: 'light',
        language,
      });
    });
  }
});
