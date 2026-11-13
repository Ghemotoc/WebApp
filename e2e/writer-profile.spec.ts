/**
 * The writer profile, blocks and the bio in a real browser (story S1-E5-05; board 6.1).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a visitor opens /u/adult_writer: the name as the H1, "@adult_writer · Joined …", the bio, the
 *   numbers (stories, chapters published, reads, followers with "only … sees who") and the
 *   published stories as a shelf; the 16+ story is missing for kid_14_ok (rule 18);
 * - the page never shows the year of birth, the email or the user ID (second criterion);
 * - "See profile" on the story page's writer card leads to the profile;
 * - blocks: blocker sees "You block @blocked" with Unblock and no stories; blocked gets "This
 *   profile isn't available" on /u/blocker; teacher blocks adult_writer from the dialog, the
 *   story page then disappears for teacher, and Settings' "Blocked accounts" unblocks;
 * - the bio is edited in Settings and shows on the profile;
 * - axe in all 12 views (390, 768 and 1440 px, light and night, Romanian and English) of the
 *   profile finds nothing serious and nothing scrolls sideways.
 * Test data: chapters made in SQL on adult_writer's two seed stories (the second made 16+);
 * removed after, with the bios, blocks and locales put back.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const seedBio = 'Scriu povești scurte despre orașe mici și oamenii care le țin minte.';

/** Removes this spec's chapters, blocks and changes, and puts the seed state back. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'wprof%';
    update public.stories set rating = 'all_ages', first_published_at = null, last_chapter_published_at = null
      where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002');
    update public.stories set rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000002';
    delete from public.blocks where user_id = '${teacherId}';
    update public.profiles set bio = '${seedBio}' where id = '${adultWriterId}';
    update public.profiles set bio = '' where id = '${teacherId}';
    update public.profiles set locale = 'ro'
      where handle in ('adult_writer', 'teacher', 'kid_14_ok', 'blocker', 'blocked');`);
}

/** One published chapter on each of adult_writer's seed stories; the second story becomes 16+. */
function seedChapters() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values
      ('00000000-0000-4000-9000-000000000001', '${adultWriterId}', 'wprofa01', 1, 'Unu', 'x', 3,
        'published', 'Unu', 'Primul capitol aici.', 3, now()),
      ('00000000-0000-4000-9000-000000000002', '${adultWriterId}', 'wprofb01', 1, 'One', 'x', 3,
        'published', 'One', 'The first chapter.', 3, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002');
    update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';`);
}

/** Opens a page in English, as a persona or as a visitor, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName | null, path: string) {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('writer profile and blocks (S1-E5-05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapters);
  test.afterAll(cleanUp);

  test('a visitor sees the name, bio, numbers and stories, and nothing private', async ({
    browser,
  }) => {
    const page = await openAs(browser, null, '/u/adult_writer');
    await expect(page.getByRole('heading', { level: 1, name: 'Lia Scrie' })).toBeVisible();
    await expect(page.getByText(/@adult_writer · Joined \w+ \d{4}/)).toBeVisible();
    await expect(page.getByText(seedBio)).toBeVisible();
    const numbers = page.locator('dl');
    await expect(numbers).toContainText('Chapter published');
    await expect(numbers).toContainText('only Lia Scrie sees who');
    await expect(page.getByRole('heading', { name: 'Stories by Lia Scrie' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Stația meteo/ })).toBeVisible();
    // The year of birth (30 years ago by the seed), the email and the user ID appear nowhere.
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('personas.test');
    expect(text).not.toContain(adultWriterId);
    expect(text).not.toContain(String(new Date().getFullYear() - 30));
    // A visitor has no Report or Block (both need an account) and a log-in link instead of Follow.
    await expect(page.getByRole('button', { name: /Block/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Get in to follow' })).toBeVisible();
    await page.context().close();
  });

  test('kid_14_ok doesn’t see the 16+ story on the profile', async ({ browser }) => {
    const page = await openAs(browser, 'kid_14_ok', '/u/adult_writer');
    await expect(page.getByRole('link', { name: /Stația meteo/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /The Girl Who Fixed Radios/ })).toHaveCount(0);
    await page.context().close();
  });

  test('"See profile" on the story page leads to the writer’s profile', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/s/statia-meteo-seed01');
    await page.getByRole('link', { name: 'See profile' }).click();
    await expect(page).toHaveURL(/\/u\/adult_writer$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Lia Scrie' })).toBeVisible();
    await page.context().close();
  });

  test('blocker sees the block and can undo it; blocked can’t see blocker at all', async ({
    browser,
  }) => {
    const blockerPage = await openAs(browser, 'blocker', '/u/blocked');
    await expect(blockerPage.getByRole('heading', { name: 'You block @blocked' })).toBeVisible();
    await expect(blockerPage.getByRole('button', { name: 'Unblock blocked' })).toBeVisible();
    await expect(blockerPage.getByRole('heading', { name: /Stories by/ })).toHaveCount(0);
    await blockerPage.context().close();

    const blockedPage = await openAs(browser, 'blocked', '/u/blocker');
    await expect(
      blockedPage.getByRole('heading', { name: 'This profile isn’t available' }),
    ).toBeVisible();
    await blockedPage.context().close();
  });

  test('teacher blocks adult_writer, loses the story page, then unblocks in Settings', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', '/u/adult_writer');
    await page.getByRole('button', { name: 'Block Lia Scrie' }).click();
    const dialog = page.getByRole('dialog', { name: 'Block @adult_writer?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Block', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: 'You block @adult_writer' })).toBeVisible();

    await page.goto('/s/statia-meteo-seed01');
    await expect(page.getByRole('heading', { name: 'This story isn’t available' })).toBeVisible();

    await page.goto('/settings#privacy');
    const blockedSection = page.getByRole('region', { name: 'Blocked accounts' });
    await blockedSection.getByRole('button', { name: 'Unblock @adult_writer' }).click();
    await expect(blockedSection.getByText('You don’t block anyone.')).toBeVisible();
    await page.goto('/s/statia-meteo-seed01');
    await expect(page.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();
    await page.context().close();
  });

  test('teacher writes a bio in Settings and it shows on the profile', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/settings');
    const bio = page.getByLabel('Bio');
    await bio.fill('I teach Romanian and read everything.');
    await page.getByRole('button', { name: 'Save bio' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await page.getByRole('link', { name: 'See profile' }).click();
    await expect(page.getByText('I teach Romanian and read everything.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit profile' })).toBeVisible();
    await page.context().close();
  });

  test('the profile passes axe in all 12 views and never scrolls sideways', async ({ browser }) => {
    // Twelve full axe scans in one test: about 2.5 s each on the build machine.
    test.setTimeout(90_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    for (const view of everyView(['/u/adult_writer'])) {
      // The account's language wins over the browser's, so set it to the view's (S1-E1-04).
      runSql(`update public.profiles set locale = '${view.language}' where id = '${teacherId}';`);
      const page = await context.newPage();
      await test.step(`axe at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await expect(page.getByRole('heading', { level: 1, name: 'Lia Scrie' })).toBeVisible();
      });
      await page.close();
    }
    await context.close();
  });
});
