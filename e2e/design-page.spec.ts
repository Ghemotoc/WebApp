/**
 * The design system page and the app shell in a real browser (story S1-E1-03).
 *
 * Who runs it: `npm run test:e2e`, and CI (the "e2e" job), against a build with the /design page
 * included, as on staging.
 * What it proves: axe finds no serious or critical WCAG 2.2 AA issue at 390, 768 and 1440 px in
 * light and night mode; nothing scrolls sideways (CLAUDE.md rule 21); night mode follows the
 * device and the footer drop-down overrides it; reduce motion removes animations; the fonts are
 * the four the DoD names; shelves show arrows only when they overflow and disable them at the
 * ends; drop-downs are only as wide as their longest option.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** The three widths every screen is checked at, with a typical height for each. */
const screenSizes = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

/**
 * Waits until every animation on the page has finished, so axe measures final colours (a heading
 * that is still fading in would read as low contrast).
 */
async function waitForAnimations(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState === 'finished'),
  );
}

/** Runs axe for WCAG 2.0 to 2.2 A and AA and returns the serious and critical issues. */
async function seriousAccessibilityIssues(page: Page) {
  // Reduce motion turns off the entrance fade at once (src/styles/index.css), so axe reads final
  // colours even if the page rendered after waitForAnimations looked (TOOL-2).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await waitForAnimations(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`,
    );
}

for (const colorScheme of ['light', 'dark'] as const) {
  for (const size of screenSizes) {
    test(`/design has no serious accessibility issues and no sideways scroll at ${size.width} px, device in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize(size);
      await page.goto('/design');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Following the device: dark mode on the device means night mode on the page.
      const expectedTheme = colorScheme === 'dark' ? 'night' : 'light';
      await expect(page.locator('html')).toHaveAttribute('data-theme', expectedTheme);
      expect(await seriousAccessibilityIssues(page)).toEqual([]);

      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(size.width);
    });
  }
}

test('the footer drop-down switches to night mode and the choice survives a reload', async ({
  page,
}) => {
  await page.goto('/design');
  await page.getByRole('combobox', { name: 'Mod' }).selectOption('night');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
});

test('a chosen Light mode wins over a device in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/design');
  await page.getByRole('combobox', { name: 'Mod' }).selectOption('light');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('reduce motion removes the entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/design');

  const animationName = await page
    .locator('header.tmc-rise')
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animationName).toBe('none');
});

test('headings, body, eyebrows and handwriting use the fonts from the DoD', async ({ page }) => {
  await page.goto('/design');
  const fontOf = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element));

  expect((await fontOf('h1')).fontFamily).toContain('Funnel Display');
  expect((await fontOf('body')).fontFamily).toContain('Inter');
  // Eyebrows: Inter Bold, 11 px, capitals, 0.18em, black (the liquid glass design, 7 Nov 2026).
  const eyebrow = await fontOf('[data-testid="type-samples"] p.eyebrow');
  expect(eyebrow.fontFamily).toContain('Inter');
  expect(eyebrow.fontSize).toBe('11px');
  expect(eyebrow.fontWeight).toBe('700');
  expect(eyebrow.textTransform).toBe('uppercase');
  expect(eyebrow.letterSpacing).toBe('1.98px');
  expect((await fontOf('[data-testid="type-samples"] p.font-hand')).fontFamily).toContain(
    'Playwrite CU',
  );
});

test('a row that fits has no arrows; a long one shows five whole covers, no fade, and arrows dimmed at each end', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/design');

  // The short row (3 stories) fits on a wide screen: no arrows (CALM-4).
  await expect(page.getByTestId('short-shelf').getByRole('button')).toHaveCount(0);

  // The long row overflows: at the start Previous is dimmed and Next isn't.
  const longShelf = page.getByTestId('long-shelf');
  const back = longShelf.getByRole('button', { name: 'Înapoi în În tendințe' });
  const forward = longShelf.getByRole('button', { name: 'Mai departe în În tendințe' });
  await expect(back).toHaveAttribute('aria-disabled', 'true');
  await expect(forward).not.toHaveAttribute('aria-disabled', 'true');

  // No fade: the row has no mask (Robert, 20 Nov 2026: the fade was visual overload).
  const row = longShelf.getByRole('region', { name: /se derulează lateral/ });
  expect(await row.evaluate((element) => getComputedStyle(element).maskImage)).toBe('none');

  // Five whole covers in view: the sixth starts past the row's right edge.
  const places = await row.evaluate((element) => {
    const rowBox = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll('li')).map((item) => {
      const box = item.getBoundingClientRect();
      return { left: box.left - rowBox.left, right: box.right - rowBox.left, width: rowBox.width };
    });
  });
  expect(places[4]?.right ?? 0).toBeLessThanOrEqual((places[4]?.width ?? 0) + 1);
  expect(places[5]?.left ?? 0).toBeGreaterThanOrEqual((places[5]?.width ?? 0) - 1);

  // One press moves one screenful: the sixth cover starts the row.
  await forward.click();
  await expect(back).not.toHaveAttribute('aria-disabled', 'true');
  await expect
    .poll(() =>
      row.evaluate((element) => {
        const sixth = element.querySelectorAll('li')[5];
        return Math.round(
          (sixth?.getBoundingClientRect().left ?? 0) - element.getBoundingClientRect().left,
        );
      }),
    )
    .toBe(0);
  await row.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
  await expect(forward).toHaveAttribute('aria-disabled', 'true');

  // 25 stories: 20 covers, then the View more card, and "Vezi 25" beside the heading.
  await expect(
    longShelf.getByRole('link', { name: 'Vezi mai multe 25 în În tendințe' }),
  ).toBeVisible();
  await expect(longShelf.getByRole('link', { name: 'Vezi 25 în În tendințe' })).toBeVisible();
});

test('a row on a phone shows two whole covers and the edge of a third, with no arrows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/design');

  const longShelf = page.getByTestId('long-shelf');
  await expect(longShelf.getByRole('button', { name: /Mai departe în/ })).toBeHidden();
  const row = longShelf.getByRole('region', { name: /se derulează lateral/ });
  const places = await row.evaluate((element) => {
    const rowBox = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll('li'))
      .slice(0, 3)
      .map((item) => {
        const box = item.getBoundingClientRect();
        return {
          left: box.left - rowBox.left,
          right: box.right - rowBox.left,
          width: rowBox.width,
        };
      });
  });
  // The second cover ends inside the row; the third starts inside it and runs past the edge.
  const [, second, third] = places;
  if (second === undefined || third === undefined) throw new Error('The row has fewer than 3.');
  expect(second.right).toBeLessThanOrEqual(second.width + 1);
  expect(third.left).toBeLessThan(third.width);
  expect(third.right).toBeGreaterThan(third.width);
});

test('a drop-down is only as wide as its longest option, never stretched', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/design');

  const selectWidth = await page
    .getByRole('combobox', { name: 'Sortează după' })
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(selectWidth).toBeLessThan(400);
});

test('the /design page asks search engines not to index it', async ({ page }) => {
  await page.goto('/design');

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});
