/**
 * Smoke test of the home page in a real browser, with axe accessibility checks (story S1-E1-01).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (the "e2e" job).
 * What it proves: the built app opens in Romanian with the product name from the brand config, and
 * axe finds no serious or critical WCAG 2.2 AA issue at the three widths every screen is checked at
 * (390, 768 and 1440 px; CLAUDE.md rule 21).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { brand } from '../src/config/brand';

/** The three widths every screen is checked at, with a typical height for each. */
const screenSizes = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

test('the home page opens in Romanian and shows the product name from the brand config', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    `Bun venit la ${brand.productName}`,
  );
  await expect(page).toHaveTitle(brand.productName);
});

for (const size of screenSizes) {
  test(`the home page has no serious or critical accessibility issues and no sideways scroll at ${size.width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Let the heading finish fading in, so axe measures its final colours.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState === 'finished'),
    );

    // axe checks the page against WCAG 2.0, 2.1 and 2.2, levels A and AA.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const seriousIssues = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(seriousIssues).toEqual([]);

    // Nothing may scroll sideways at any width (CLAUDE.md rule 21).
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(size.width);
  });
}

test('an unknown address shows "page not found" in the reader’s language, not an error page', async ({
  page,
}) => {
  await page.goto('/some/page/that/does/not/exist');

  // The interface opens in Romanian (decided 17 Oct 2026, 11:48); S1-E2-QA added this page.
  await expect(page).toHaveURL('/some/page/that/does/not/exist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nu găsim pagina asta');
});
