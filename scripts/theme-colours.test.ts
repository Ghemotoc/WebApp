/**
 * The theme colour rule (the flat themes bundle; Robert, 23 Nov 2026, 18:09 to 18:19 UTC; design
 * system v25 and v26): each of the five themes beside Lilac mist is two colours, its page and its
 * button colour m, and every other accent is worked out from m the same way. tokens.css writes the
 * results out as plain colours, so the contrast test (token-contrast.test.ts) can measure them;
 * this test checks that each written colour is what the rule gives, so a hand edit to one value
 * can't quietly break the family.
 *
 * It reads src/styles/tokens.css from disk, so it lives in scripts/ and runs in plain Node.
 * Who runs it: Vitest, with the rest of npm test. What it calls: nothing outside this file.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const tokensCss = readFileSync(
  fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)),
  'utf8',
);

/** Each theme's page colour and button colour m, as Robert picked them (23 Nov 2026). */
const themeColours = {
  sorbet: { page: '#fdeee7', button: '#c2412d' },
  seaglass: { page: '#e4f3f0', button: '#0f766e' },
  pistachio: { page: '#eff5e1', button: '#4d7c0f' },
  candy: { page: '#fce8f1', button: '#c0266d' },
  tmc: { page: '#faf2e4', button: '#9f1239' },
} as const;

/**
 * Mixes two colours the way CSS color-mix(in srgb, first share, second) does, rounding each
 * channel to the nearest whole number (halves round up).
 *
 * @param first - the colour that keeps `share`, "#rrggbb"
 * @param share - how much of the first colour stays, from 0 to 1
 * @param second - the colour it is mixed with, "#rrggbb"
 * @returns the mixed colour, "#rrggbb"
 */
function mix(first: string, share: number, second: string): string {
  const channelsOf = (hex: string) =>
    [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const firstChannels = channelsOf(first);
  const secondChannels = channelsOf(second);
  const mixed = firstChannels.map((channel, index) =>
    Math.round(channel * share + (secondChannels[index] ?? 0) * (1 - share)),
  );
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Reads the plain colours one block of tokens.css sets.
 *
 * @param selector - the block's last selector line, exactly as written
 * @returns token name → "#rrggbb"
 * Errors: throws when tokens.css has no such block.
 */
function readBlock(selector: string): Map<string, string> {
  const escaped = selector.replace(/[[\]]/g, '\\$&');
  const startIndex = tokensCss.search(new RegExp(`(^|\\n)${escaped}\\s*\\{`));
  if (startIndex === -1) throw new Error(`tokens.css has no ${selector} block.`);
  const block = tokensCss.slice(startIndex, tokensCss.indexOf('\n}', startIndex));
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (match[1] !== undefined && match[2] !== undefined) tokens.set(match[1], match[2]);
  }
  return tokens;
}

/**
 * What the rule gives for one theme by day: each token name and its colour.
 *
 * @param page - the theme's page colour
 * @param button - the theme's button colour m
 * @returns token name → "#rrggbb"
 */
function dayColoursFor(page: string, button: string): Record<string, string> {
  const white = '#ffffff';
  const black = '#000000';
  const accentText = mix(button, 0.85, black);
  const hover = mix(button, 0.82, black);
  return {
    paper: page,
    surface: mix(button, 0.03, white),
    tint: mix(button, 0.12, white),
    panel: mix(button, 0.09, white),
    'panel-border': mix(button, 0.22, white),
    accent: accentText,
    link: accentText,
    logo: accentText,
    'link-hover': hover,
    'plum-from': button,
    'plum-to': button,
    'plum-hover-from': hover,
    'plum-hover-to': hover,
    primary: button,
    'chip-on': button,
    'focus-ring': button,
    border: mix(button, 0.22, white),
    hairline: mix(button, 0.12, white),
    'dashed-border': mix(button, 0.38, white),
    'control-border': mix(button, 0.6, '#333333'),
    'info-bg': mix(button, 0.12, white),
    'info-border': mix(button, 0.35, white),
    'info-text': mix(button, 0.7, black),
  };
}

/**
 * What the rule gives for one theme at night.
 *
 * @param button - the theme's button colour m
 * @returns token name → "#rrggbb"
 */
function nightColoursFor(button: string): Record<string, string> {
  const hover = mix(button, 0.82, '#000000');
  const accentText = mix(button, 0.55, '#ffffff');
  return {
    'plum-from': button,
    'plum-to': button,
    'plum-hover-from': hover,
    'plum-hover-to': hover,
    accent: accentText,
    logo: accentText,
  };
}

describe('theme colours worked out from one button colour', () => {
  it('writes every day colour of each theme as the rule gives it', () => {
    for (const [look, { page, button }] of Object.entries(themeColours)) {
      const written = readBlock(`[data-look-swatch='${look}']`);
      const expected = dayColoursFor(page, button);
      const differing = Object.entries(expected)
        .filter(([name, colour]) => written.get(name) !== colour)
        .map(([name, colour]) => `${look} --${name}: ${written.get(name)} (rule: ${colour})`);
      expect(differing).toEqual([]);
    }
  });

  it('keeps each theme colour on black at night, as the rule gives it', () => {
    for (const [look, { button }] of Object.entries(themeColours)) {
      const written = readBlock(`[data-theme='night'][data-look='${look}']`);
      const expected = nightColoursFor(button);
      const differing = Object.entries(expected)
        .filter(([name, colour]) => written.get(name) !== colour)
        .map(([name, colour]) => `${look} night --${name}: ${written.get(name)} (rule: ${colour})`);
      expect(differing).toEqual([]);
    }
  });

  it('mixes the way CSS does: a colour mixed with itself stays the same', () => {
    expect(mix('#48125d', 0.6, '#48125d')).toBe('#48125d');
    expect(mix('#000000', 0.5, '#ffffff')).toBe('#808080');
  });
});
