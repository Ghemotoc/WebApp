/**
 * The CI contrast test (story S1-E1-03 acceptance criterion: "Given any text and background token
 * pair, when the contrast test runs in CI, then it meets WCAG 2.2 AA"), in light and night mode.
 *
 * It reads the real values from src/styles/tokens.css, so the test and the app can never disagree.
 * It lives in scripts/ because it reads a file from disk, which runs in plain Node.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../src/lib/contrast';
import { contrastPairs } from '../src/styles/contrast-pairs';

const tokensCss = readFileSync(
  fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)),
  'utf8',
);

/**
 * Reads the "--name: #hex;" declarations from the block for one theme.
 *
 * @param themeName - 'light' or 'night', as in [data-theme="night"] (either quote style)
 * @returns token name → hex colour
 * Errors: throws when tokens.css has no block for that theme.
 */
function readTokenBlock(themeName: string): Map<string, string> {
  const blockOpening = new RegExp(`\\[data-theme=['"]${themeName}['"]\\]\\s*\\{`);
  const startIndex = tokensCss.search(blockOpening);
  if (startIndex === -1) throw new Error(`tokens.css has no [data-theme="${themeName}"] block.`);
  const block = tokensCss.slice(startIndex, tokensCss.indexOf('\n}', startIndex));
  const tokens = new Map<string, string>();

  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (match[1] !== undefined && match[2] !== undefined) tokens.set(match[1], match[2]);
  }
  return tokens;
}

const themes = {
  light: readTokenBlock('light'),
  night: readTokenBlock('night'),
};

/**
 * Lists the pairs in one theme that fall below their minimum ratio.
 *
 * @param tokens - the theme's token values
 * @returns one line per failing pair (empty when all pass)
 */
function failingPairs(tokens: Map<string, string>): string[] {
  return contrastPairs.flatMap((pair) => {
    const foreground = tokens.get(pair.foreground);
    const background = tokens.get(pair.background);
    if (foreground === undefined || background === undefined) {
      return [`${pair.foreground} on ${pair.background}: token missing`];
    }
    const ratio = contrastRatio(foreground, background);
    return ratio < pair.minimumRatio
      ? [`${pair.foreground} on ${pair.background} (${pair.usedFor}): ${ratio.toFixed(2)}`]
      : [];
  });
}

describe('design token contrast', () => {
  it('every token pair meets WCAG 2.2 AA in light mode', () => {
    expect(failingPairs(themes.light)).toEqual([]);
  });

  it('every token pair meets WCAG 2.2 AA in night mode, with the same rules', () => {
    expect(failingPairs(themes.night)).toEqual([]);
  });

  it('uses the colours the story names in light mode', () => {
    expect(themes.light.get('paper')).toBe('#faf8f5');
    expect(themes.light.get('heading')).toBe('#481c5f');
    expect(themes.light.get('link')).toBe('#672786');
    expect(themes.light.get('ink')).toBe('#26142e');
    expect(themes.light.get('body')).toBe('#5c4965');
    expect(themes.light.get('gold')).toBe('#e6c24c');
    expect(themes.light.get('eyebrow')).toBe('#815e18');
  });

  it('never uses gold as small text on light backgrounds (it reaches only about 1.6:1 on paper)', () => {
    const textTokensOnLight = contrastPairs
      .filter((pair) => pair.minimumRatio === 4.5)
      .map((pair) => themes.light.get(pair.foreground));

    expect(textTokensOnLight).not.toContain(themes.light.get('gold'));
  });

  it('defines the same tokens in both themes', () => {
    expect([...themes.night.keys()].sort()).toEqual([...themes.light.keys()].sort());
  });
});
