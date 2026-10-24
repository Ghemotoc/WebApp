/**
 * The doodles in a real browser (Lane B, "Design: doodles take their colours from the tokens",
 * 23 Oct 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI (the "e2e" job), against a build with the /design page.
 * What it proves: drawn inline, every fill in a doodle is one of the --doodle-* token values of
 * the panel it sits in, in the light panel and in the night panel; and switching the page to night
 * mode changes the ink colour of the full sheet. jsdom can't resolve CSS variables, so this is the
 * one test that sees the real colours (the unit test checks the markup and the tokens).
 */
import { expect, test, type Locator } from '@playwright/test';

/**
 * Reads, for one panel, every path fill the browser drew and the panel's own --doodle-* values.
 *
 * @param panel - the element that carries data-theme
 * @returns the distinct fills, and the token values the fills may take
 */
async function drawnColours(panel: Locator): Promise<{ fills: string[]; tokenValues: string[] }> {
  return panel.evaluate((element) => {
    const fills = new Set<string>();
    for (const path of element.querySelectorAll('svg path')) {
      fills.add(getComputedStyle(path).fill);
    }
    // Resolve each token the same way the browser does: paint a probe with it as a colour.
    const tokenNames = [
      'ink',
      'paper',
      'gold',
      'gold-soft',
      'blush',
      'blush-soft',
      'plum-soft',
      'sky-soft',
      'sage-soft',
    ];
    const probe = document.createElement('span');
    element.append(probe);
    const tokenValues = tokenNames.map((name) => {
      probe.style.color = `var(--doodle-${name})`;
      return getComputedStyle(probe).color;
    });
    probe.remove();
    return { fills: [...fills], tokenValues };
  });
}

for (const theme of ['light', 'night'] as const) {
  test(`in the ${theme} panel every doodle fill is one of that theme's doodle tokens`, async ({
    page,
  }) => {
    await page.goto('/design');
    const panel = page.getByTestId(`doodle-samples-${theme}`);
    await expect(panel.locator('svg')).toHaveCount(3);

    const { fills, tokenValues } = await drawnColours(panel);
    expect(fills.length).toBeGreaterThan(1);
    for (const fill of fills) expect(tokenValues).toContain(fill);
  });
}

test('switching the page to night mode recolours the full doodle sheet', async ({ page }) => {
  await page.goto('/design');
  const firstPath = page.getByTestId('doodle-sheet').locator('svg path').first();
  const lightFill = await firstPath.evaluate((path) => getComputedStyle(path).fill);

  await page.getByRole('combobox', { name: 'Temă' }).selectOption('night');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');

  const nightFill = await firstPath.evaluate((path) => getComputedStyle(path).fill);
  expect(nightFill).not.toBe(lightFill);
});
