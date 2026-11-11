/**
 * Staff › Website › Branding in a real browser (bundle BRAND-1, part a; Robert, 4 Nov 2026,
 * 14:25 UTC).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an empty slot shows the default (Nicole's cat for the emblem, the name as text for the logo);
 * - an admin uploads a light-theme emblem; it goes through the picture check, with no moderator
 *   step because staff uploaded it (CLAUDE.md rule 19; bundle G12a);
 * - once the check clears it, the page says the app shows it, and a visitor's top bar and
 *   browser tab show it (part b) while the night theme keeps the default; "Use the default"
 *   empties the slot again;
 * - a moderator is told the page isn't theirs;
 * - axe finds nothing serious at 390, 768 and 1440 px, light and night, Romanian and English.
 * Test data: the brand slots and brand pictures, cleared before and after (the audit log keeps its
 * rows; the small file stays in the local bucket, because Storage refuses direct deletes). The
 * local picture check signs with a test value, never a real secret.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
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

  test('an emblem is checked, then shows, and the default comes back', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/website/branding');
    const emblem = page.getByRole('region', { name: 'Emblem, light theme' });
    const logo = page.getByRole('region', { name: 'Logo, night theme' });

    // Step 1: every slot starts on its default.
    await expect(emblem.getByRole('img', { name: 'The default emblem: a cat' })).toBeVisible();
    await expect(emblem.getByText('The app shows the default.')).toBeVisible();
    await expect(logo.getByText('The app shows the default.')).toBeVisible();

    // Step 2: the upload passes the check; staff uploaded it, so no moderator step (G12a).
    await emblem.getByLabel('Upload a picture').setInputFiles({
      name: 'emblem.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    await expect(
      emblem.getByRole('img', { name: 'The uploaded picture for Emblem, light theme' }),
    ).toBeVisible();

    // Step 3: once the check answered, the page says the app shows it.
    await expect
      .poll(() =>
        runSql(
          `select count(*) from public.picture_checks where kind = 'brand_asset' and status = 'passed'`,
        ),
      )
      .toBe('1');
    await page.reload();
    await expect(emblem.getByText('The app shows this picture.')).toBeVisible();

    // Step 4: a visitor's top bar and browser tab show the approved emblem (part b), on the light
    // theme and in a light browser.
    const visitorContext = await browser.newContext({ colorScheme: 'light' });
    const visitor = await visitorContext.newPage();
    await visitor.goto('/discover');
    const topBarEmblem = visitor.locator('header img[data-brand-emblem="light"]');
    await expect(topBarEmblem).toHaveAttribute(
      'src',
      /\/storage\/v1\/object\/sign\/brand-assets\/emblem_light\//,
    );
    await expect(visitor.locator('link[data-brand-icon="light"]')).toHaveAttribute(
      'href',
      /\/brand-assets\/emblem_light\//,
    );
    // The night emblem has no upload, so it keeps the bundled cat, tinted with the logo colour
    // (bundle G2: the cat follows the look's accent).
    await expect(
      visitor.locator('header [data-brand-emblem="dark"][data-brand-emblem-kind="tinted"]'),
    ).toHaveAttribute('style', /\/brand\/emblem-dark\.svg/);
    await visitorContext.close();

    // Step 5: "Use the default" empties the slot again.
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
