/**
 * Landing page pictures and featured stories in a real browser (story S1-E11-14; bundle
 * CONTESTS-13a2a).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an admin adds a picture to the Hero with its alt text in both languages; it goes through the
 *   picture check (no moderator step: staff uploaded it, bundle G12a) and then publishes
 *   (criterion 5);
 * - a Featured stories block picked by hand shows the story to visitors (criterion 6);
 * - the visitor sees the picture with its alt text.
 * Test data: the page /c/pictures-e2e and one published chapter, deleted afterwards (the audit log
 * keeps its rows; the small picture file stays in the local bucket, because Storage refuses direct
 * deletes). The local picture check signs with a test value, never a real secret.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** A 1 by 1 pixel PNG, small enough to upload in a moment. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Removes this spec's page, its pictures and its chapter. */
const cleanUpSql = `
  delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug = 'pictures-e2e');
  delete from public.picture_checks where kind = 'landing_picture';
  delete from public.landing_pages where slug = 'pictures-e2e';
  delete from public.chapters where code = 'lpe2e001';
  update public.feature_flags set is_enabled = false where key = 'picture_uploads';`;

/** Opens an address in English, as a persona or as a visitor. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Opens one block's fields beside the list with its Edit button (one block at a time, G12c). */
async function openBlock(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
}

/** Adds one block of a kind with "Add a block". */
async function addBlock(page: Page, kind: string): Promise<void> {
  await page.getByLabel('Block to add').selectOption({ label: kind });
  await page.getByRole('button', { name: 'Add a block' }).click();
}

test.describe('Landing page pictures and featured stories (S1-E11-14)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    // Step 1: uploads on, the local check's test secret, and a published chapter so the seed
    // story shows in public lists.
    runSql(`${cleanUpSql}
      update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret')
      where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
      insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
        status, published_title, published_body, published_word_count, first_published_at)
      values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'lpe2e001',
        1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());`);
  });
  test.afterAll(() => {
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle = 'admin';`);
  });

  test('a picture is checked, then the page shows it and a featured story', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/website/landing-pages');
    // Step 1: a campaign page with a Hero and a Featured stories block.
    await page.getByLabel('Address').fill('pictures-e2e');
    await page.getByLabel('Type', { exact: true }).selectOption({ label: 'Campaign' });
    await page.getByRole('button', { name: 'Create page' }).click();
    await expect(page.getByRole('heading', { name: '/c/pictures-e2e (Campaign)' })).toBeVisible();
    await addBlock(page, 'Hero');
    await addBlock(page, 'Featured stories');
    await openBlock(page, 'Block 1: Hero');
    await page.locator('#landing-b0-ro-title').fill('Săptămâna desenului');
    await page.locator('#landing-b0-en-title').fill('Drawing week');
    await openBlock(page, 'Block 2: Featured stories');
    await page.locator('#landing-b1-ro-heading').fill('Povești alese');
    await page.locator('#landing-b1-en-heading').fill('Chosen stories');
    await page.locator('#landing-b1-stories').fill('/s/statia-meteo-seed01');

    // Step 2: the Hero gets a picture; it passes the check with no moderator step (G12a).
    await openBlock(page, 'Block 1: Hero');
    await page.getByLabel('Picture (optional)').setInputFiles({
      name: 'drawing.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    await expect(page.getByText('Picture ready.').first()).toBeVisible();
    await page.locator('#landing-b0-ro-alt').fill('O pisică desenată cu creionul');
    await page.locator('#landing-b0-en-alt').fill('A cat drawn in pencil');

    // Step 3: the page publishes.
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText(/Published\. The page shows this version from/)).toBeVisible();

    // Step 4: a visitor sees the picture with its alt text and the featured story.
    const visitor = await openAs(browser, null, '/c/pictures-e2e');
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('Drawing week');
    await expect(visitor.getByRole('img', { name: 'A cat drawn in pencil' })).toBeVisible();
    await expect(visitor.getByRole('heading', { name: 'Chosen stories' })).toBeVisible();
    await expect(visitor.getByText('Stația meteo').first()).toBeVisible();
    await page.context().close();
    await visitor.context().close();
  });
});
