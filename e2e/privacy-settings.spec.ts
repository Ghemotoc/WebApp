/**
 * Privacy settings, end to end (story S1-E13-01; board Settings 6.3, the Privacy tab).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - criterion 1: Settings › Privacy has who can see your profile, who can message you (with
 *   Change to Messages), "Show when I'm online" (off) and who can see your library; adult_writer
 *   keeps their profile to people with an account and a signed-out visitor gets the limited
 *   profile, with no bio;
 * - criterion 2: teen_17 sees every setting on its most private value and the under-18 note;
 * - the library: teacher shows their library to everyone; the Library page says so, a signed-out
 *   visitor sees it on teacher's profile and on its See all page;
 * - the online dot: blocker turns online status on and follows adult_writer, who then sees the
 *   dot on blocker's profile;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on Settings scrolled to Privacy, and
 *   no sideways scroll.
 * Test data: the seed personas and one published story by adult_writer on teacher's library
 * shelf. Everything changed is put back at the start and the end; adults_only is switched off
 * for the run (minors' accounts are read-only while it is on) and put back as it was.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The spec's story, on teacher's library shelf. */
const storySlug = 'privacy-e2e';

/** Whether adults_only was on before this file, so it is put back as it was. */
let wasAdultsOnly = 'true';

/**
 * Opens an address in English at 1440 px, as a persona or, with null, signed out.
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

/** Puts the privacy settings, the follows, the story and the locales back as the seed has them. */
function resetPrivacy() {
  runSql(`
    update public.profiles set profile_visible_to = null, library_visible_to = 'only_me',
      shows_online_status = false, last_active_at = null;
    delete from public.follows_users where user_id = '00000000-0000-4000-8000-000000000015'
      and followed_user_id = '00000000-0000-4000-8000-000000000001';
    delete from public.library_entries where story_id in (select id from public.stories where slug = '${storySlug}');
    delete from public.chapters where code = 'prive2e1';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teen_17', 'teacher', 'blocker');`);
}

/** One published story by adult_writer, on teacher's Reading shelf. */
function seedLibrary() {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}', 'Raftul deschis', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select stories.id, stories.user_id, 'prive2e1', 1, 'Capitol', 'x', 1, 'published',
      'Capitolul 1', 'Text.', 1, now()
    from public.stories where stories.slug = '${storySlug}';
    insert into public.library_entries (user_id, story_id, shelf)
    select '00000000-0000-4000-8000-000000000007', id, 'reading' from public.stories where slug = '${storySlug}';`);
}

test.describe('privacy settings (S1-E13-01)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    resetPrivacy();
    seedLibrary();
  });

  test.afterAll(() => {
    resetPrivacy();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('an adult keeps their profile to people with an account', async ({ browser }) => {
    // Step 1: the four settings, with the adult's defaults.
    const page = await openAs(browser, 'adult_writer', '/settings#privacy');
    const section = page.getByRole('region', { name: 'Privacy' });
    const profile = section.getByRole('group', { name: 'Who can see the profile' });
    await expect(
      profile.getByRole('radio', { name: /Everyone, including people without an account/ }),
    ).toBeChecked();
    await expect(section.getByText('Who can message you')).toBeVisible();
    await expect(section.getByRole('link', { name: 'Change who can message you' })).toBeVisible();
    await expect(section.getByLabel('Show when I’m online')).not.toBeChecked();
    await expect(
      section
        .getByRole('group', { name: 'Who can see the library' })
        .getByRole('radio', { name: /Only me/ }),
    ).toBeChecked();
    // Step 2: "Only people with an account", saved at once.
    await profile.getByRole('radio', { name: 'Only people with an account' }).check();
    await expect(profile.getByRole('radio', { name: 'Only people with an account' })).toBeChecked();
    await expect
      .poll(() =>
        runSql(
          `select profile_visible_to from public.profiles where handle = 'adult_writer';`,
        ).trim(),
      )
      .toBe('members');
    // Step 3: signed out, the profile keeps the name and drops the bio.
    const visitor = await openAs(browser, null, '/u/adult_writer');
    await expect(visitor.getByRole('heading', { name: 'Lia Scrie', level: 1 })).toBeVisible();
    await expect(
      visitor.getByText('Lia Scrie shares the rest of their profile with fewer people.'),
    ).toBeVisible();
    await expect(visitor.getByText(/Scriu povești scurte/)).toHaveCount(0);
  });

  test('an under-18 starts on the most private value of every setting', async ({ browser }) => {
    const page = await openAs(browser, 'teen_17', '/settings#privacy');
    const section = page.getByRole('region', { name: 'Privacy' });
    await expect(
      section.getByText(
        'You’re under 18, so every setting here started at its most private choice.',
        {
          exact: false,
        },
      ),
    ).toBeVisible();
    await expect(section.getByRole('radio', { name: /Only people I follow/ })).toBeChecked();
    await expect(section.getByRole('radio', { name: /Only me/ })).toBeChecked();
    await expect(section.getByLabel('Show when I’m online')).not.toBeChecked();
    await expect(section.getByText('People you follow', { exact: true })).toBeVisible();
  });

  test('a library shown to everyone appears on the profile', async ({ browser }) => {
    // Step 1: teacher shows their library to everyone.
    const page = await openAs(browser, 'teacher', '/settings#privacy');
    const library = page.getByRole('group', { name: 'Who can see the library' });
    await library.getByRole('radio', { name: 'Everyone' }).check();
    await expect(library.getByRole('radio', { name: 'Everyone' })).toBeChecked();
    // Step 2: the Library page says so.
    await page.goto('/library');
    await expect(page.getByText('Everyone can see your library on your profile.')).toBeVisible();
    // Step 3: a signed-out visitor sees the shelf on teacher's profile and its See all page.
    const visitor = await openAs(browser, null, '/u/teacher');
    await expect(visitor.getByRole('heading', { name: 'teacher’s library' })).toBeVisible();
    await expect(visitor.getByRole('link', { name: /Raftul deschis/ })).toBeVisible();
    await visitor.goto('/u/teacher/library');
    await expect(visitor.getByRole('heading', { name: '@teacher’s library' })).toBeVisible();
    await expect(visitor.getByRole('link', { name: /Raftul deschis/ })).toBeVisible();
  });

  test('the people someone follows see them online', async ({ browser }) => {
    // Step 1: blocker follows adult_writer and turns online status on.
    runSql(`insert into public.follows_users (user_id, followed_user_id)
      values ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001')
      on conflict do nothing;`);
    const page = await openAs(browser, 'blocker', '/settings#privacy');
    await page.getByLabel('Show when I’m online').check();
    await expect(page.getByLabel('Show when I’m online')).toBeChecked();
    await expect
      .poll(() =>
        runSql(
          `select last_active_at is not null from public.profiles where handle = 'blocker';`,
        ).trim(),
      )
      .toBe('t');
    // Step 2: adult_writer sees the dot by blocker's name.
    const writer = await openAs(browser, 'adult_writer', '/u/blocker');
    await expect(writer.getByTitle('Online')).toBeVisible();
    // Step 3: someone blocker doesn't follow sees no dot.
    const teacher = await openAs(browser, 'teacher', '/u/blocker');
    await expect(teacher.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(teacher.getByTitle('Online')).toHaveCount(0);
  });

  for (const view of everyView(['/settings#privacy'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's own language wins (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teen_17';`);
      await useSessionInBrowser(page.context(), (await signInPersona('teen_17')).session);
      await checkScreen(page, view);
      await expect(page.locator('#privacy')).toBeVisible();
    });
  }
});
