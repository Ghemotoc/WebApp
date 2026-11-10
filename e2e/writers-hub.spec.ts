/**
 * The Writers' hub and the Resources page in a real browser (bundle G9 WRITING, part a; Robert,
 * 9 Nov 2026, 12:09 and 12:11 UTC).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - signed in, the logo leads to /hub, the signed-in home: its heading, the contests block, the
 *   how-to guides two at a time with arrows (Previous off at the start) and the tools;
 * - an open contest's card shows the landing page's picture with its alt text and how many
 *   entries count, without a sideways scroll at phone width (GAPS-12a);
 * - the avatar menu has Resources, which lists the fifteen how-to guides from the CMS and the
 *   writers' rights page, and a guide opens as its help page;
 * - signed out, /hub asks the visitor to log in;
 * - both pages have no serious axe issue and no sideways scroll at 390, 768 and 1440 px, in light
 *   and night, Romanian and English (CLAUDE.md rules 9 and 21), and no doodle is drawn.
 * Test data: a throwaway account of its own, because the axe views change the account's language
 * and other specs rely on the seed personas' languages; removed afterwards. The guides are the
 * help pages the G9a migration publishes. Which contests are open depends on what other specs
 * set up, so the first test checks the contests block is there, not what it lists (the database
 * test 317-writers-hub covers the list). The cover test makes its own contest in SQL for
 * adult_writer, with a picture the admin persona uploads; removed afterwards.
 */
import { randomUUID } from 'node:crypto';

import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { makeTestClient, signInPersona, useSessionInBrowser } from './support/personas';
import { createTestAccount, removeTestAccount } from './support/testAccounts';

const password = 'writers hub secret passphrase';
const stamp = Date.now();
const account = { email: `writers-hub-${stamp}@example.com`, handle: `hub.${stamp}` };

/** A 1 by 1 pixel PNG, small enough to upload in a moment. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const writerId = '00000000-0000-4000-8000-000000000001';

/** Removes the cover test's contest, its landing page and its picture, and puts settings back. */
const coverCleanUpSql = `
  delete from public.contest_entries where contest_id in (select contests.id from public.contests
    join public.landing_pages on landing_pages.id = contests.landing_page_id where landing_pages.slug = 'hub-cover-e2e');
  delete from public.contests where landing_page_id in (select id from public.landing_pages where slug = 'hub-cover-e2e');
  delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug = 'hub-cover-e2e');
  delete from public.picture_checks where kind = 'landing_picture'
    and path like (select id::text from public.landing_pages where slug = 'hub-cover-e2e') || '/%';
  delete from public.landing_pages where slug = 'hub-cover-e2e';
  update public.feature_flags set is_enabled = false where key = 'picture_uploads';
  update public.profiles set locale = 'ro' where id = '${writerId}';`;

/**
 * Makes an open contest for adults in Romania whose live landing page has an approved picture
 * in its hero, and one entry that counts.
 */
async function seedContestWithCover(): Promise<void> {
  // Step 1: the landing page, with uploads on so the admin can add its picture.
  runSql(`${coverCleanUpSql}
    update public.feature_flags set is_enabled = true where key = 'picture_uploads';
    insert into public.landing_pages (slug, page_type) values ('hub-cover-e2e', 'contest');`);
  const pageId = runSql(`select id from public.landing_pages where slug = 'hub-cover-e2e';`).trim();
  // Step 2: the admin uploads the file and registers it, as the editor does.
  const { client } = await signInPersona('admin');
  const path = `${pageId}/${randomUUID()}.png`;
  const upload = await client.storage
    .from('landing-pictures')
    .upload(path, tinyPng, { contentType: 'image/png' });
  if (upload.error !== null) throw new Error(`Could not upload: ${upload.error.message}`);
  const registered = await client.rpc('register_landing_picture', { target_path: path });
  if (registered.error !== null) throw new Error(`Could not register: ${registered.error.message}`);
  // Step 3: a moderator approves it (by SQL; the queue has its own tests), the page goes live
  // with it, and the contest opens with one entry.
  runSql(`
    update public.picture_checks set status = 'approved' where id = '${String(registered.data)}';
    insert into public.landing_page_versions (page_id, status, content, show_from, published_at)
    values ('${pageId}', 'published', jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
      jsonb_build_object('id', 'h', 'kind', 'hero', 'picture_id', '${String(registered.data)}',
        'ro', '{"title": "Povești de iarnă", "intro": "", "alt": "O fereastră ninsă"}'::jsonb,
        'en', '{"title": "Winter stories", "intro": "", "alt": "A snowy window"}'::jsonb))),
      public.romania_today(), now());
    insert into public.contests (landing_page_id, name_ro, name_en, entries_open_on, entries_close_on,
      results_on, age_groups, market_codes, language_codes, what_counts_ro, what_counts_en, word_limit,
      prize_ro, prize_en, prize_delivered_by, judges, opened_at)
    values ('${pageId}', 'Povești de iarnă', 'Winter stories', public.romania_today() - 1,
      public.romania_today() + 10, public.romania_today() + 20, '{18_plus}', '{RO}', '{ro,en}',
      'O povestire', 'A short story', 3000, 'O carte', 'A book', 'The organiser', 'The team', now());
    insert into public.contest_entries (user_id, contest_id, story_id)
    select '${writerId}', contests.id, '00000000-0000-4000-9000-000000000001'
    from public.contests where landing_page_id = '${pageId}';
    update public.profiles set locale = 'en' where id = '${writerId}';`);
}

/** A browser signed in as the throwaway account. */
async function openSignedIn(browser: Browser): Promise<Page> {
  // Step 1: sign in through the API, as the other specs do, so no form is involved.
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({ email: account.email, password });
  if (error !== null || data.session === null)
    throw new Error(`Could not sign in: ${error?.message}`);
  // Step 2: hand the session to a fresh browser context.
  const context = await browser.newContext();
  await useSessionInBrowser(context, data.session);
  return context.newPage();
}

test.describe('the Writers’ hub and Resources (G9a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => createTestAccount(account.email, password, account.handle));
  test.afterAll(() => removeTestAccount(account.email));

  test('signed in, the logo opens the hub with contests, guides and tools', async ({ browser }) => {
    const page = await openSignedIn(browser);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/discover');
    // Step 1: the logo in the top bar leads to the signed-in home.
    await page.getByRole('banner').getByRole('link').first().click();
    await expect(page).toHaveURL(/\/hub$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Everything for the next chapter.' }),
    ).toBeVisible();
    // Step 2: the two buttons under the heading.
    await expect(page.getByRole('link', { name: 'Start writing' })).toHaveAttribute(
      'href',
      '/write/new',
    );
    // Step 3: the contests block is there, whatever other specs left open.
    await expect(page.getByRole('heading', { level: 2, name: /^Contest/ }).first()).toBeVisible();
    // Step 4: the guides come two at a time; Previous is off at the start, Next moves on.
    const guides = page.getByRole('region', { name: 'How-to guides' });
    await expect(guides.getByRole('link')).toHaveCount(3);
    const previous = guides.getByRole('button', { name: 'Previous guides' });
    await expect(previous).toBeDisabled();
    await guides.getByRole('button', { name: 'Next guides' }).click();
    await expect(previous).toBeEnabled();
    await expect(guides.getByText('Guides 3 to 4 of 15')).toBeAttached();
    // Step 5: the tools.
    await expect(page.getByRole('link', { name: /Story Atlas/ })).toHaveAttribute('href', '/plan');
    await expectNoDoodles(page);
    await page.context().close();
  });

  test('an open contest shows its cover picture and its entry count', async ({ browser }) => {
    await seedContestWithCover();
    try {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto('/hub');
      const card = page.getByRole('article', { name: 'Winter stories' });
      await expect(card).toBeVisible();
      // The picture is the landing page's, with the alt text the admin wrote, and it loads.
      const cover = card.getByRole('img', { name: 'A snowy window' });
      await expect(cover).toBeVisible();
      await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
      await expect(card.getByText('1 entry', { exact: true })).toBeVisible();
      // Nothing scrolls sideways at phone width with the picture in.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await context.close();
    } finally {
      runSql(coverCleanUpSql);
    }
  });

  test('the avatar menu opens Resources, which lists every guide and opens one', async ({
    browser,
  }) => {
    const page = await openSignedIn(browser);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/hub');
    // Step 1: Resources sits in the avatar menu.
    await page.getByRole('button', { name: /^Account, / }).click();
    await page.locator('#account-menu-panel').getByRole('link', { name: 'Resources' }).click();
    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Resources' })).toBeVisible();
    // Step 2: writers' rights links to its own page; the guides list holds all fifteen.
    await expect(page.getByRole('link', { name: 'Read writers’ rights in full' })).toHaveAttribute(
      'href',
      '/help/writers-rights',
    );
    const guideLinks = page.locator('a[href^="/help/how-to-"]');
    await expect(guideLinks).toHaveCount(15);
    // Step 3: a guide opens as its help page, with numbered steps.
    await page.getByRole('link', { name: /Block someone/ }).click();
    await expect(page).toHaveURL(/\/help\/how-to-block-someone$/);
    await expect(page.getByRole('main').locator('ol li').first()).toBeVisible();
    await expectNoDoodles(page);
    await page.context().close();
  });

  test('signed out, the hub asks the visitor to log in', async ({ page }) => {
    // The interface opens in Romanian for everyone (decided 17 Oct 2026, 11:48).
    await page.goto('/hub');
    await expect(
      page.getByText('Conectează-te ca să vezi concursurile, ghidurile și instrumentele de scris.'),
    ).toBeVisible();
  });

  for (const view of everyView(['/hub', '/resources'])) {
    test(`no serious axe issue on ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The account's language wins over the browser's once the page reads it, so the view's
      // language goes on the account too; otherwise a Romanian view could switch to English.
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = '${account.handle}';`,
      );
      const page = await openSignedIn(browser);
      await checkScreen(page, view);
      await page.context().close();
    });
  }
});
