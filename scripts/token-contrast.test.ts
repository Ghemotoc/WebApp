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
import { seasonalLooks, yearRoundLooks } from '../src/lib/looks';
import { contrastPairs } from '../src/styles/contrast-pairs';

const tokensCss = readFileSync(
  fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)),
  'utf8',
);

/**
 * Reads the "--name: #hex;" declarations from one block of tokens.css.
 *
 * @param selector - the block's selector exactly as written, for example [data-theme='night']
 * @returns token name → hex colour (colours with transparency, such as the glass, are skipped:
 *   the test measures the solid look-alikes, such as --surface)
 * Errors: throws when tokens.css has no block with that selector.
 */
function readTokenBlock(selector: string): Map<string, string> {
  const escapedSelector = selector.replace(/[[\]]/g, '\\$&');
  const blockOpening = new RegExp(`(^|\\n)${escapedSelector}\\s*\\{`);
  const startIndex = tokensCss.search(blockOpening);
  if (startIndex === -1) throw new Error(`tokens.css has no ${selector} block.`);
  const block = tokensCss.slice(startIndex, tokensCss.indexOf('\n}', startIndex));
  const tokens = new Map<string, string>();

  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (match[1] !== undefined && match[2] !== undefined) tokens.set(match[1], match[2]);
  }
  return tokens;
}

/**
 * Lays one set of tokens over another, as the cascade does for an element inside another.
 *
 * @param layers - token sets from the outermost to the innermost
 * @returns the tokens an element in the innermost set ends up with
 */
function layered(...layers: Map<string, string>[]): Map<string, string> {
  return new Map(layers.flatMap((layer) => [...layer]));
}

const lightTokens = readTokenBlock("[data-theme='light']");
const nightTokens = readTokenBlock("[data-theme='night']");
const staffLightTokens = readTokenBlock("[data-area='staff']");
const staffNightTokens = readTokenBlock("[data-theme='night'] [data-area='staff']");

/**
 * The four looks to check: members by day and at night, and the staff area by day and at night
 * (the staff area sits inside the page, so its values lie over the member ones).
 */
const themes = {
  light: lightTokens,
  night: nightTokens,
  staffLight: layered(lightTokens, staffLightTokens),
  staffNight: layered(nightTokens, staffLightTokens, staffNightTokens),
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

/**
 * The looks a member can see by day (bundle G2 THEMES): each look block laid over the day tokens.
 * Lilac mist is the day set itself. Each block is read through its swatch selector, which starts
 * a line in tokens.css ("[data-look-swatch='sorbet'] {").
 */
const lookTokens = new Map(
  [...yearRoundLooks, ...seasonalLooks]
    .filter((look) => look !== 'lilac')
    .map((look) => [look, readTokenBlock(`[data-look-swatch='${look}']`)] as const),
);

describe('design token contrast', () => {
  it('every token pair meets WCAG 2.2 AA in light mode', () => {
    expect(failingPairs(themes.light)).toEqual([]);
  });

  it('every token pair meets WCAG 2.2 AA in night mode, with the same rules', () => {
    expect(failingPairs(themes.night)).toEqual([]);
  });

  it('every token pair meets WCAG 2.2 AA in the staff area, by day and at night', () => {
    expect(failingPairs(themes.staffLight)).toEqual([]);
    expect(failingPairs(themes.staffNight)).toEqual([]);
  });

  it('uses the Lilac mist colours of the approved design by day (bundle G1)', () => {
    expect(themes.light.get('paper')).toBe('#f3eefb');
    expect(themes.light.get('ink')).toBe('#24133a');
    expect(themes.light.get('heading')).toBe('#2a0e33');
    expect(themes.light.get('body')).toBe('#584a6e');
    expect(themes.light.get('link')).toBe('#4b4fa8');
    expect(themes.light.get('focus-ring')).toBe('#48125d');
  });

  it('draws eyebrows black by day and white at night, never gold (Robert, 7 Nov 2026)', () => {
    expect(themes.light.get('eyebrow')).toBe('#141114');
    expect(themes.night.get('eyebrow')).toBe('#ffffff');
  });

  it('turns the whole interface Revolver at night', () => {
    expect(themes.night.get('paper')).toBe('#2a0e33');
  });

  it('keeps purple out of the staff area', () => {
    const staffColours = [...staffLightTokens.values(), ...staffNightTokens.values()];
    expect(staffColours).not.toContain('#672786');
    expect(staffColours).not.toContain('#48125d');
    expect(staffColours).not.toContain('#2a0e33');
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

  it('every look meets WCAG 2.2 AA by day (bundle G2 THEMES)', () => {
    for (const [look, tokens] of lookTokens) {
      expect({ look, failing: failingPairs(layered(lightTokens, tokens)) }).toEqual({
        look,
        failing: [],
      });
    }
  });

  it('keeps white readable on every accent and every accent readable on its page', () => {
    for (const [look, tokens] of lookTokens) {
      const day = layered(lightTokens, tokens);
      const accent = day.get('accent') ?? '';
      expect({ look, onAccent: contrastRatio('#ffffff', accent) >= 4.5 }).toEqual({
        look,
        onAccent: true,
      });
      expect({ look, onPaper: contrastRatio(accent, day.get('paper') ?? '') >= 4.5 }).toEqual({
        look,
        onPaper: true,
      });
    }
  });

  it('keeps the staff area plain whatever look a member picked', () => {
    // Every token a look changes is set again by the staff block, so no look reaches staff pages.
    // The blobs are the one exception: the staff area paints its flat beige over them (index.css).
    const paintedOver = new Set(['blob-1', 'blob-2', 'blob-3']);
    for (const tokens of lookTokens.values()) {
      const leaking = [...tokens.keys()].filter(
        (name) => !staffLightTokens.has(name) && !paintedOver.has(name),
      );
      expect(leaking).toEqual([]);
    }
  });
});
