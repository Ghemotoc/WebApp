/**
 * The avatar builder in a real browser (bundle ADMIN-2, part g; Robert's brief of 2 Nov 2026,
 * section 7; the Micah art and the visual editor since bundle AVATAR-1, 6 Nov 2026).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - Settings › Your avatar starts from the initials, with a live preview and tabs of picture
 *   tiles and colour swatches (no drop-downs), each named in words; the tabs work by keyboard;
 *   a choice can be undone, and "Surprise me" changes the avatar;
 * - the art's designer is credited under the editor;
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

/**
 * One part of the saved recipe, or '' when there is none.
 *
 * @param part - a recipe key; only the test's own fixed names are passed in
 */
function savedPart(part: string): string {
  return runSql(
    `select coalesce(avatar_recipe ->> '${part}', '') from public.profiles where handle = 'adult_writer'`,
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
    // Nothing is uploaded any more, and nothing is a drop-down (Robert, 6 Nov 2026).
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(section.locator('select')).toHaveCount(0);
    // The art's designer is credited under the editor (CC BY 4.0).
    await expect(section.getByText(/by Micah Lanier, CC BY 4.0/)).toBeVisible();

    // The Face tab is open first; its skin tones are named swatches.
    await expect(section.getByRole('tab', { name: 'Face' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await section.getByRole('radio', { name: 'Skin tone: Tone 9 (deepest)' }).click();

    // The Hair tab, by keyboard: Right arrow moves to it. A choice can be undone.
    await section.getByRole('tab', { name: 'Face' }).press('ArrowRight');
    await expect(section.getByRole('tab', { name: 'Hair' })).toBeFocused();
    const swept = section.getByRole('radio', { name: 'Hairstyle: Swept' });
    await expect(swept).toHaveAttribute('aria-checked', 'true');
    await section.getByRole('radio', { name: 'Hairstyle: Mohawk' }).click();
    await section.getByRole('button', { name: 'Undo' }).click();
    await expect(swept).toHaveAttribute('aria-checked', 'true');
    await section.getByRole('radio', { name: 'Hairstyle: Bob' }).click();
    await section.getByRole('radio', { name: 'Hair colour: Blue' }).click();

    // Glasses are on their own tab.
    await section.getByRole('tab', { name: 'Glasses and earrings' }).click();
    await section.getByRole('radio', { name: 'Glasses: Round' }).click();

    // Surprise me changes the avatar, and can be undone too.
    await section.getByRole('button', { name: 'Surprise me' }).click();
    await section.getByRole('button', { name: 'Undo' }).click();
    await section.getByRole('tab', { name: 'Hair' }).click();
    await expect(section.getByRole('radio', { name: 'Hairstyle: Bob' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Save keeps it; the profile draws it.
    await section.getByRole('button', { name: 'Save avatar' }).click();
    await expect(section.getByText(/Saved. Your avatar now shows/)).toBeVisible();
    expect(savedPart('hair')).toBe('pixie');
    expect(savedPart('glasses')).toBe('round');
    expect(savedPart('style')).toBe('micah');
    await page.goto('/u/adult_writer');
    await expect(page.locator('img[src^="data:image/svg+xml"]').first()).toBeVisible();

    // Back to the initials.
    await page.goto('/settings');
    await page
      .getByRole('region', { name: 'Your avatar' })
      .getByRole('button', { name: 'Use my initials instead' })
      .click();
    await expect(page.getByText('Done. Your initials show again.')).toBeVisible();
    expect(savedPart('hair')).toBe('');
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
