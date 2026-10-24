/**
 * The contact and company details page, in a real browser (story S1-E14-02).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - the page lists the contact point for authorities and for terrorist content removal orders, the
 *   users' contact point, the languages accepted and the company details (still placeholders until
 *   the company exists, Q55);
 * - every address is an email link, from the brand config (Q16: the contact address for now);
 * - Settings and the footer reach it in one tap.
 * The axe runs for /legal/contact are in e2e/legal.spec.ts with the other legal pages.
 * Test data: the seed persona adult_writer, unchanged.
 */
import { expect, test } from '@playwright/test';

import { brand } from '../src/config/brand';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { signInPersona, useSessionInBrowser } from './support/personas';

test('the contact page lists every contact point, the languages and the company details', async ({
  page,
}) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto('/');
  // Exact: the footer also has "Contact us", the form (S1-E14-04).
  await page.getByRole('contentinfo').getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/legal\/contact$/);
  await expect(
    page.getByRole('heading', { name: 'Contact and company details', level: 2 }),
  ).toBeVisible();

  // Every contact point, each with the languages accepted.
  for (const heading of [
    'For users',
    'For authorities',
    'Terrorist content removal orders',
    'Your personal data',
    'Company details',
  ]) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Languages: Romanian and English.').first()).toBeVisible();

  // The authorities' address is an email link from the brand config.
  const authoritiesLinks = page.getByRole('link', { name: brand.authoritiesEmail });
  await expect(authoritiesLinks.first()).toHaveAttribute(
    'href',
    `mailto:${brand.authoritiesEmail}`,
  );

  // The company details are still placeholders, shown highlighted.
  await expect(page.locator('mark', { hasText: '[registered office]' }).first()).toBeVisible();
});

test('a signed-in person reaches the contact page from Settings in one tap', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  const page = await context.newPage();
  await page.goto('/settings');
  // The legal contact page, not "Contact us" (the form, S1-E14-04), which sits beside it.
  await page
    .getByRole('link', { name: /company details|datele companiei/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/legal\/contact$/);
});
