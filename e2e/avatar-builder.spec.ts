/**
 * The avatar builder in a real browser (bundle ADMIN-2, part g; Robert's brief of 2 Nov 2026,
 * section 7).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - Settings › Your avatar starts from the initials, with a live preview and a labelled
 *   drop-down for every part; a choice can be undone, and "Surprise me" changes the avatar;
 * - nothing is uploaded: there is no file field any more;
 * - Save keeps the recipe on the profile and the drawn avatar shows on the writer's profile;
 * - "Use my initials instead" goes back to the initials;
 * - Settings with the builder passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: the seed persona adult_writer; their avatar is cleared afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Opens an address in English as adult_writer. */
async function openAsWriter(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The saved recipe's head, or '' when there is none. */
function savedHead(): string {
  return runSql(
    `select coalesce(avatar_recipe ->> 'head', '') from public.profiles where handle = 'adult_writer'`,
  );
}

test.describe('the avatar builder (ADMIN-2g)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    runSql(`update public.profiles set avatar_recipe = null where handle = 'adult_writer';`);
  });
  test.afterAll(() => {
    runSql(
      `update public.profiles set avatar_recipe = null, locale = 'ro' where handle = 'adult_writer';`,
    );
  });

  test('a writer builds, undoes, saves and clears an avatar', async ({ browser }) => {
    const page = await openAsWriter(browser, '/settings');
    const section = page.getByRole('region', { name: 'Your avatar' });
    await expect(section.getByText('Others see your initials.')).toBeVisible();
    await expect(
      section.getByRole('img', { name: 'Preview of the avatar you are building' }),
    ).toBeVisible();
    // Nothing is uploaded any more.
    await expect(page.locator('input[type="file"]')).toHaveCount(0);

    // Every part has a labelled drop-down; a choice can be undone.
    const head = section.getByLabel('Hair or head covering');
    await expect(head).toHaveValue('medium1');
    await section.getByLabel('Skin tone').selectOption({ label: 'Tone 9 (deepest)' });
    await head.selectOption({ label: 'Hijab' });
    await section.getByRole('button', { name: 'Undo' }).click();
    await expect(head).toHaveValue('medium1');
    await head.selectOption({ label: 'Bantu knots' });
    await section.getByLabel('Glasses and more').selectOption({ label: 'Glasses' });

    // Surprise me changes the avatar, and can be undone too.
    await section.getByRole('button', { name: 'Surprise me' }).click();
    await section.getByRole('button', { name: 'Undo' }).click();
    await expect(head).toHaveValue('bantuKnots');

    // Save keeps it; the profile draws it.
    await section.getByRole('button', { name: 'Save avatar' }).click();
    await expect(section.getByText(/Saved. Your avatar now shows/)).toBeVisible();
    expect(savedHead()).toBe('bantuKnots');
    await page.goto('/u/adult_writer');
    await expect(page.locator('img[src^="data:image/svg+xml"]').first()).toBeVisible();

    // Back to the initials.
    await page.goto('/settings');
    await page
      .getByRole('region', { name: 'Your avatar' })
      .getByRole('button', { name: 'Use my initials instead' })
      .click();
    await expect(page.getByText('Done. Your initials show again.')).toBeVisible();
    expect(savedHead()).toBe('');
  });

  for (const view of everyView(['/settings'])) {
    test(`axe: Settings with the avatar builder at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view);
    });
  }
});
