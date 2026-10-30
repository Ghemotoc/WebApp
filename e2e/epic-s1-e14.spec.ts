/**
 * Epic check for S1-E14, Legal pages and compliance (story S1-E14-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's journey across S1-E14-01 to 04 in a real browser.
 * - A visitor opens the Legal centre from the footer, moves through all five documents with the
 *   tabs (terms, privacy notice, community guidelines, contact and company details, accessibility
 *   statement), finds "Write to us" on the contact page, and at no point gets a cookie.
 * - adult_writer does the same signed in and reaches the Contact us form with their account.
 * The axe runs for each screen live in each story's own spec (legal, contact, contact-form,
 * accessibility-statement). Test data: seed personas only; adult_writer's language is set to
 * English for the walk and put back afterwards.
 */
import { expect, test, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The five documents' tab names in English, in the board's order. */
const documentTabs = [
  'Terms',
  'Privacy notice',
  'Community guidelines',
  'Contact',
  'Accessibility',
];

/** Walks the five tabs, checking each document opens and no cookie appears. */
async function walkTheLegalCentre(page: Page): Promise<void> {
  await page.getByRole('contentinfo').getByRole('link', { name: 'Terms' }).click();
  const tabs = page.getByRole('navigation', { name: 'Legal documents' });
  for (const tab of documentTabs) {
    await tabs.getByRole('link', { name: tab, exact: true }).click();
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    expect(await page.context().cookies(), `cookies on ${tab}`).toEqual([]);
  }
  await expect(page).toHaveURL(/\/legal\/accessibility$/);
}

test.describe('epic S1-E14 journeys', () => {
  test.afterAll(() => {
    runSql(`update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
  });

  test('a visitor reads every legal document and finds how to write to us', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/');
    await walkTheLegalCentre(page);
    await page.goto('/legal/contact');
    await page.getByRole('link', { name: 'Write to us' }).click();
    await expect(page.getByRole('heading', { name: 'Write to us' })).toBeVisible();
  });

  test('a member reads the documents and reaches the Contact us form', async ({ page }) => {
    runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/');
    await walkTheLegalCentre(page);
    await page.getByRole('contentinfo').getByRole('link', { name: 'Contact us' }).click();
    await expect(page).toHaveURL(/\/contact$/);
    expect(await page.context().cookies()).toEqual([]);
  });
});
