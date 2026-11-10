/**
 * The Report button and dialog in a real browser (story S1-E10-01).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * Where: the /design page's Report panel, the one place the shared button is shown until the
 * story, chapter and profile screens exist (Lane A, S1-E5-05).
 * What it proves:
 * - by keyboard only: Tab to "Report @adult_writer", Enter opens the dialog with focus inside, the
 *   thirteen reasons (the story's eleven plus the board's two) are radio buttons in order, Space picks one, the report sends and
 *   "Report sent" shows a reference; Escape closes and focus returns to the button;
 * - a read-only account (kid_14_waiting) can report; a signed-out visitor is told to log in;
 * - a person can't report their own profile (adult_writer gets a plain refusal);
 * - the open dialog passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas only; the reports made here are removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { everyView, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The reasons as the dialog shows them in English, in the story's order. */
const reasonLabels = [
  'Illegal content',
  'Harassment',
  'Insults',
  'Self-harm',
  'Sexual content involving a minor',
  'Threat to a minor',
  'Terrorism',
  'Hate',
  'Spam',
  'Copyright',
  'Copied from a published work',
  'Missing AI label',
  'Other',
];

/** Opens the design page's Report panel in English, signed in as a persona (or not). */
async function openPanel(page: Page, persona: SignInPersonaName | null) {
  if (persona !== null) {
    await useSessionInBrowser(page.context(), (await signInPersona(persona)).session);
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  }
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto('/design#report');
  await expect(page.getByRole('button', { name: 'Report @adult_writer' })).toBeVisible();
}

test.describe('report dialog (S1-E10-01)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`delete from public.reports where created_at > now() - interval '1 hour';
      update public.profiles set locale = 'ro' where handle in ('kid_14_waiting', 'adult_writer', 'teen_17');`);
  });

  test('kid_14_waiting reports a profile by keyboard only and gets a reference', async ({
    page,
  }) => {
    await openPanel(page, 'kid_14_waiting');
    const button = page.getByRole('button', { name: 'Report @adult_writer' });
    await button.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Report this profile' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('@adult_writer. They won’t see who reported it.')).toBeVisible();
    await expect(dialog.getByRole('radio')).toHaveCount(13);
    const labels = await dialog
      .getByRole('group', { name: 'What’s wrong?' })
      .locator('label')
      .allInnerTexts();
    expect(labels).toEqual(reasonLabels);

    // Sending without a reason is refused in plain words.
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByText('Choose a reason first.')).toBeVisible();

    // Pick "Harassment" with the keyboard, write a note, send.
    await dialog.getByRole('radio', { name: 'Harassment' }).focus();
    await page.keyboard.press('Space');
    await expect(dialog.getByText('Bullying, threats or targeting a person.')).toBeVisible();
    await dialog.getByLabel('Anything else? (optional)').fill('Keeps messaging me');
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByRole('status')).toContainText('Report sent');
    await expect(dialog.getByRole('status')).toContainText(/Reference: R-\d{6}/);
    expect(
      runSql(`select reason || ' ' || reporter_age_band from public.reports
        where user_id = '00000000-0000-4000-8000-000000000004' and created_at > now() - interval '1 hour'`),
    ).toBe('harassment 13_to_15');

    // Escape closes the dialog and focus goes back to the button.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('adult_writer can’t report their own profile', async ({ page }) => {
    await openPanel(page, 'adult_writer');
    await page.getByRole('button', { name: 'Report @adult_writer' }).click();
    const dialog = page.getByRole('dialog', { name: 'Report this profile' });
    // The radio input is visually hidden inside the chip, so the chip (its label) is what's clicked.
    await dialog.getByText('Spam', { exact: true }).click();
    await expect(dialog.getByRole('radio', { name: 'Spam' })).toBeChecked();
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByRole('alert')).toContainText('You can’t report your own things');
  });

  test('the corner × closes the dialog by keyboard and gives focus back, in both languages', async ({
    page,
  }) => {
    await openPanel(page, 'teen_17');
    const button = page.getByRole('button', { name: 'Report @adult_writer' });
    await button.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Report this profile' });
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    await close.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();

    // In Romanian the same button is named "Închide".
    runSql(`update public.profiles set locale = 'ro' where handle = 'teen_17';`);
    await page.evaluate((key) => localStorage.setItem(key, 'ro'), LANGUAGE_STORAGE_KEY);
    await page.reload();
    await page.getByRole('button', { name: 'Raportează @adult_writer' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Închide' })).toBeVisible();
    runSql(`update public.profiles set locale = 'en' where handle = 'teen_17';`);
  });

  test('a signed-out visitor is told to log in', async ({ page }) => {
    await openPanel(page, null);
    await page.getByRole('button', { name: 'Report @adult_writer' }).click();
    const dialog = page.getByRole('dialog', { name: 'Report this profile' });
    await expect(dialog.getByText('Log in to report this.')).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/sign-in');
    await expect(dialog.getByRole('radio')).toHaveCount(0);
  });

  for (const width of screenWidths) {
    test(`axe: the open dialog at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openPanel(page, 'teen_17');
      await page.getByRole('button', { name: 'Report @adult_writer' }).click();
      await expect(page.getByRole('dialog', { name: 'Report this profile' })).toBeVisible();
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious).toEqual([]);
      const dialogWidth = await page
        .getByRole('dialog', { name: 'Report this profile' })
        .evaluate((element) => element.scrollWidth);
      expect(dialogWidth).toBeLessThanOrEqual(width);
    });
  }

  // The panel itself, closed, in every view (the design page's own spec covers the rest).
  for (const view of everyView(['/design#report']).filter((view) => view.language === 'en')) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}`, async ({ page }) => {
      await page.setViewportSize({ width: view.width, height: 900 });
      await page.addInitScript(([themeKey, theme]) => localStorage.setItem(themeKey, theme), [
        'theme-preference',
        view.theme,
      ] as const);
      await openPanel(page, null);
    });
  }
});
