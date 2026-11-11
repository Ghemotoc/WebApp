/**
 * The initials colour in a real browser (bundle G11a; the canvas's SettingsProfile board, "If you
 * keep your initials").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - Settings › Profile offers the sixteen colours as one radio group, starting on the colour the
 *   username gives; arrow keys move between them;
 * - "Save colour" keeps the pick on the profile, says so, and the bead on the person's own profile
 *   page takes the new colour;
 * - "Build an avatar instead" brings the avatar builder into view;
 * - the section passes axe and doesn't scroll sideways at 390, 768 and 1440 px, light and night.
 * Test data: the seed persona teacher (no drawn avatar); the colour is cleared afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, screenWidths, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The cobalt bead's colour (src/features/avatars/lib/beadColours.ts). */
const cobalt = '#1F4FA8';

/** Opens an address in English as teacher. */
async function openAsTeacher(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = 'teacher';`);
  await useSessionInBrowser(context, (await signInPersona('teacher')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Puts the persona back as the seed has it. */
function cleanUp() {
  runSql(
    `update public.profiles set initials_colour = null, locale = 'ro' where handle = 'teacher';`,
  );
}

test.describe('the initials colour (G11a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a member picks, saves and sees the colour of their initials', async ({ browser }) => {
    const page = await openAsTeacher(browser, '/settings#profile');
    const section = page.getByRole('region', { name: 'Initials colour' });
    const colours = section.getByRole('group', { name: 'Colour for the initials' });
    await expect(colours.getByRole('radio')).toHaveCount(16);
    await expect(colours.getByRole('radio', { checked: true })).toHaveCount(1);

    // Arrow keys move through the group, as in any radio group: the pick moves on by one.
    const startingColour = colours.getByRole('radio', { checked: true });
    const startingName = await startingColour.getAttribute('value');
    await startingColour.focus();
    await page.keyboard.press('ArrowRight');
    await expect(colours.getByRole('radio', { checked: true })).not.toHaveAttribute(
      'value',
      startingName ?? '',
    );
    // A click on the bead's name picks Cobalt (the native radio itself is visually hidden).
    await colours.getByText('Cobalt', { exact: true }).click();
    await expect(colours.getByRole('radio', { name: 'Cobalt' })).toBeChecked();
    await section.getByRole('button', { name: 'Save colour' }).click();
    await expect(section.getByRole('status')).toHaveText(
      'Saved. The initials show in this colour everywhere.',
    );
    expect(runSql(`select initials_colour from public.profiles where handle = 'teacher'`)).toBe(
      'cobalt',
    );

    // "Build an avatar instead" brings the builder into view.
    await section.getByRole('button', { name: 'Build an avatar instead' }).click();
    await expect(page.getByRole('heading', { name: 'Avatar', exact: true })).toBeInViewport();

    // The profile page's bead takes the colour.
    await page.goto('/u/teacher');
    const bead = page.locator('[data-avatar-bead]').first();
    await expect
      .poll(() => bead.evaluate((element) => getComputedStyle(element).getPropertyValue('--bead')))
      .toBe(cobalt);
    await expectNoDoodles(page);
  });

  test('the section passes axe and fits at every width, light and night', async ({ browser }) => {
    test.setTimeout(180_000);
    const page = await openAsTeacher(browser, '/settings#profile');
    for (const width of screenWidths) {
      for (const theme of ['light', 'night'] as const) {
        await test.step(`axe at ${width} px, ${theme}`, async () => {
          await checkScreen(page, { address: '/settings#profile', width, theme, language: 'en' });
          await expect(page.getByRole('region', { name: 'Initials colour' })).toBeVisible();
        });
      }
    }
  });
});
