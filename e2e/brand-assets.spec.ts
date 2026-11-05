/**
 * Staff › Website › Branding in a real browser (bundle BRAND-1, part a; Robert, 4 Nov 2026,
 * 14:25 UTC).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an empty slot shows the default (Nicole's cat for the emblem, the name as text for the logo);
 * - an admin uploads a light-theme emblem; it goes through the picture check and waits for a
 *   moderator, and the page says the default shows until then (CLAUDE.md rule 19);
 * - once a moderator approves it, the page says the app shows it; "Use the default" empties the
 *   slot again;
 * - a moderator is told the page isn't theirs;
 * - axe finds nothing serious at 390, 768 and 1440 px, light and night, Romanian and English.
 * Test data: the brand slots and brand pictures, cleared before and after (the audit log keeps its
 * rows; the small file stays in the local bucket, because Storage refuses direct deletes). The
 * local picture check signs with a test value, never a real secret.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { approveWaitingPictures } from './support/pictures';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** A 1 by 1 pixel PNG, small enough to upload in a moment. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** Empties every slot and forgets the brand pictures, so each run starts from the defaults. */
const cleanUpSql = `
  delete from public.brand_assets;
  delete from public.picture_checks where kind = 'brand_asset';
  update public.feature_flags set is_enabled = false where key = 'picture_uploads';`;

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Staff › Website › Branding (BRAND-1a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    // Uploads on, and the local check's test secret.
    runSql(`${cleanUpSql}
      update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret')
      where not exists (select 1 from vault.secrets where name = 'picture_check_secret');`);
  });
  test.afterAll(() => {
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle in ('admin', 'moderator');`);
  });

  test('an emblem waits for a moderator, then shows, and the default comes back', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'admin', '/staff/website/branding');
    const emblem = page.getByRole('region', { name: 'Emblem, light theme' });
    const logo = page.getByRole('region', { name: 'Logo, night theme' });

    // Step 1: every slot starts on its default.
    await expect(emblem.getByRole('img', { name: 'The default emblem: a cat' })).toBeVisible();
    await expect(emblem.getByText('The app shows the default.')).toBeVisible();
    await expect(logo.getByText('The app shows the default.')).toBeVisible();

    // Step 2: the upload passes the check and waits for a moderator; the default stays up.
    await emblem.getByLabel('Upload a picture').setInputFiles({
      name: 'emblem.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    await expect(
      emblem.getByText('This picture is waiting for a moderator. The default shows until then.'),
    ).toBeVisible();
    await expect(
      emblem.getByRole('img', { name: 'The uploaded picture for Emblem, light theme' }),
    ).toBeVisible();

    // Step 3: a moderator approves it (as the Approve button does), and the page says it shows.
    approveWaitingPictures(`kind = 'brand_asset'`);
    await page.reload();
    await expect(emblem.getByText('The app shows this picture.')).toBeVisible();

    // Step 4: "Use the default" empties the slot again.
    await emblem.getByRole('button', { name: 'Use the default' }).click();
    await expect(emblem.getByText('The app shows the default.')).toBeVisible();
    await expect(emblem.getByRole('button', { name: 'Use the default' })).toHaveCount(0);
    await page.context().close();
  });

  test('a moderator is told the page is not theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/website/branding');
    await expect(page.getByText('Only the owner and admins can edit the website.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Emblem, light theme' })).toHaveCount(0);
    await page.context().close();
  });

  for (const view of everyView(['/staff/website/branding'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
