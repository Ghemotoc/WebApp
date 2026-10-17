/**
 * The year of birth at sign-up in a real browser (story S1-E2-02).
 *
 * What it proves:
 * - a year that leaves the age unclear at 13 or 16 brings up the month; any other year doesn't;
 * - the "why we ask" tooltip opens on keyboard focus and closes with Escape;
 * - an under-13 year is refused with the decided wording and nothing is stored, and so is an
 *   under-18 year while adults_only is on (the March test);
 * - with the month picker and the tooltip open, axe finds no serious issue at 390, 768 and 1440 px.
 * Test data: synthetic @example.com addresses; nothing is stored, which the test checks.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { runSql } from './support/database';

/** A year that makes someone this old by year, this year. */
const yearsAgo = (years: number) => String(new Date().getFullYear() - years);

/** Opens the sign-up form in English with the seeded working invite. */
async function openForm(page: Page) {
  await page.addInitScript(() => localStorage.setItem('interface-language', 'en'));
  await page.goto('/join/PERSONAS-TEST-INVITE');
  await expect(page.getByRole('form', { name: 'Join with email' })).toBeVisible();
}

/** Fills everything but the year. */
async function fillTheRest(page: Page, address: string) {
  await page.getByLabel('Email', { exact: true }).fill(address);
  await page.getByLabel('Password', { exact: true }).fill('a long and private passphrase');
  await page.getByLabel('Confirm password').fill('a long and private passphrase');
  await page.getByRole('checkbox').check();
}

test('the month appears only for a year that leaves the age unclear at 13 or 16', async ({
  page,
}) => {
  await openForm(page);
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption(yearsAgo(16));
  await expect(page.getByRole('combobox', { name: 'Month of birth' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption(yearsAgo(13));
  await expect(page.getByRole('combobox', { name: 'Month of birth' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption(yearsAgo(30));
  await expect(page.getByRole('combobox', { name: 'Month of birth' })).toHaveCount(0);
});

test('the "why we ask" tooltip opens on focus and closes with Escape', async ({ page }) => {
  await openForm(page);
  const button = page.getByRole('button', { name: 'Why we ask for your year of birth' });
  await button.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await expect(button).toBeFocused();
});

test('an under-13 year is refused and nothing is stored', async ({ page }) => {
  const address = `under13-${Date.now()}@example.com`;
  await openForm(page);
  await fillTheRest(page, address);
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption(yearsAgo(10));
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByText('We don’t keep anything you typed. You can try again once you turn 13.'),
  ).toBeVisible();
  expect(runSql(`select count(*) from auth.users where email = '${address}'`)).toBe('0');
});

test('while adults_only is on, an under-18 year is refused kindly and nothing is stored', async ({
  page,
}) => {
  const address = `teen-${Date.now()}@example.com`;
  await openForm(page);
  await fillTheRest(page, address);
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption(yearsAgo(17));
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(/This early test is for invited adults only/)).toBeVisible();
  expect(runSql(`select count(*) from auth.users where email = '${address}'`)).toBe('0');
});

for (const width of [390, 768, 1440]) {
  test(`axe: the month picker and the open tooltip at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openForm(page);
    await page.getByRole('combobox', { name: 'Year of birth' }).selectOption(yearsAgo(13));
    await page.getByRole('button', { name: 'Why we ask for the month' }).focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    // Let the page's entrance animation finish, so colours are measured at full strength
    // (mid-fade, the eyebrow measured 4.48:1 in CI).
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}
