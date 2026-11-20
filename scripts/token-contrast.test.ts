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
 * Reads the colour tokens from one block of tokens.css: plain colours ("--name: #hex;") and plain
 * references to one other token ("--name: var(--other);", such as "--thread: var(--accent);").
 *
 * @param selector - the block's selector exactly as written, for example [data-theme='night']
 * @returns token name → hex colour, or the text "var(--other)" for a reference, which
 *   resolveReferences answers once the blocks are laid over each other (colours with
 *   transparency, such as the glass, are skipped: the test measures the solid look-alikes, such
 *   as --surface)
 * Errors: throws when tokens.css has no block with that selector.
 */
function readTokenBlock(selector: string): Map<string, string> {
  const escapedSelector = selector.replace(/[[\]]/g, '\\$&');
  const blockOpening = new RegExp(`(^|\\n)${escapedSelector}\\s*\\{`);
  const startIndex = tokensCss.search(blockOpening);
  if (startIndex === -1) throw new Error(`tokens.css has no ${selector} block.`);
  const block = tokensCss.slice(startIndex, tokensCss.indexOf('\n}', startIndex));
  const tokens = new Map<string, string>();

  // Each value is either a hex colour or a reference to one other token.
  const declaration = /--([a-z0-9-]+):\s*(#[0-9a-f]{6}|var\(--[a-z0-9-]+\))\s*;/gi;
  for (const match of block.matchAll(declaration)) {
    if (match[1] !== undefined && match[2] !== undefined) tokens.set(match[1], match[2]);
  }
  return tokens;
}

/**
 * Lays one set of tokens over another, as the cascade does for blocks that apply to one element.
 *
 * @param layers - token sets from the first block to the last
 * @returns the tokens the element ends up with, references not yet answered
 */
function layered(...layers: Map<string, string>[]): Map<string, string> {
  return new Map(layers.flatMap((layer) => [...layer]));
}

/**
 * Follows one token's references to the colour at the end of the chain, for example
 * --thread → --accent → --accent-deep in high contrast.
 *
 * @param tokens - one element's tokens, references included
 * @param name - the token to follow
 * @param visited - the tokens already passed, so a loop ends instead of running for ever
 * @returns the colour, or undefined when the chain ends at a missing token or loops
 */
function followReference(
  tokens: Map<string, string>,
  name: string,
  visited: Set<string>,
): string | undefined {
  const value = tokens.get(name);
  if (value === undefined || visited.has(name)) return undefined;
  const referencedName = /^var\(--([a-z0-9-]+)\)$/i.exec(value)?.[1];
  // A plain colour ends the chain.
  if (referencedName === undefined) return value;
  visited.add(name);
  return followReference(tokens, referencedName, visited);
}

/**
 * Answers every reference in one element's tokens, the way a browser does: "var(--accent)" takes
 * the value --accent has on the same element.
 *
 * @param tokens - one element's tokens, references included
 * @returns the same tokens as colours only; a reference that leads nowhere is left out, so the
 *   pair that needs it reports "token missing"
 */
function resolveReferences(tokens: Map<string, string>): Map<string, string> {
  const resolved = new Map<string, string>();
  for (const name of tokens.keys()) {
    const colour = followReference(tokens, name, new Set());
    if (colour !== undefined) resolved.set(name, colour);
  }
  return resolved;
}

/**
 * The colours of an element inside another, such as the staff area inside the page. The outer
 * element's references are answered there first and reach the inner element as finished colours
 * (so --thread on <html> stays the member accent); then the inner element's own blocks lie over
 * them, and their references are answered with the inner element's colours.
 *
 * @param outer - the outer element's tokens, references included
 * @param innerLayers - the inner element's blocks, from the first in tokens.css to the last
 * @returns the inner element's colours
 */
function inside(
  outer: Map<string, string>,
  ...innerLayers: Map<string, string>[]
): Map<string, string> {
  return resolveReferences(layered(resolveReferences(outer), ...innerLayers));
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
  light: resolveReferences(lightTokens),
  night: resolveReferences(nightTokens),
  staffLight: inside(lightTokens, staffLightTokens),
  staffNight: inside(nightTokens, staffLightTokens, staffNightTokens),
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

/**
 * Mixes a colour with white the way the page mesh does in tokens.css
 * ("color-mix(in srgb, var(--blob-1) 60%, #fff)"; the simplified design, CALM-1).
 *
 * @param hex - the blob colour, "#rrggbb"
 * @param colourShare - how much of the blob stays, from 0 to 1 (0.6 for the mesh)
 * @returns the lifted colour, "#rrggbb"
 */
function liftedWithWhite(hex: string, colourShare: number): string {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const mixed = channels.map((channel) =>
    Math.round(channel * colourShare + 255 * (1 - colourShare)),
  );
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Reads one high contrast block (bundle CONTRAST-1) over the theme and look it lies on. The block
 * sits on the same element (<html>), so its references are answered together with theirs: that
 * is how each look's own deep accent reaches buttons, links, the focus ring and the thread
 * (--thread → --accent → --accent-deep).
 *
 * @param selector - the block's last selector line, exactly as written
 * @param under - the tokens the block lies over (the look by day, or the night set), references
 *   included
 * @returns the colours an element ends up with in high contrast
 */
function highContrastTokens(selector: string, under: Map<string, string>): Map<string, string> {
  return resolveReferences(layered(under, readTokenBlock(selector)));
}

const highContrastLight = "[data-contrast='more'][data-theme='light']";
const highContrastNight = "[data-contrast='more'][data-theme='night']";

/**
 * The lines high contrast must reach: text 7:1 (WCAG 2.2, 1.4.6 Contrast (Enhanced)) where the
 * normal themes reach 4.5:1, and edges 4.5:1 where they reach 3:1 (bundle CONTRAST-1).
 *
 * @param tokens - one high contrast set
 * @returns one line per failing pair (empty when all pass)
 */
function failingHighContrastPairs(tokens: Map<string, string>): string[] {
  return contrastPairs.flatMap((pair) => {
    const foreground = tokens.get(pair.foreground);
    const background = tokens.get(pair.background);
    if (foreground === undefined || background === undefined) {
      return [`${pair.foreground} on ${pair.background}: token missing`];
    }
    const minimumRatio = pair.minimumRatio === 4.5 ? 7 : 4.5;
    const ratio = contrastRatio(foreground, background);
    return ratio < minimumRatio
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

  it('turns the whole interface monochrome at night, with cobalt main buttons and switches (NIGHT-1)', () => {
    expect(themes.night.get('paper')).toBe('#111113');
    expect(themes.night.get('ink')).toBe('#f5f5f5');
    expect(themes.night.get('plum-to')).toBe('#0047ab');
  });

  it('draws the main button in one flat colour, plum by day and cobalt at night (CALM-1)', () => {
    // Robert, 20 Nov 2026: flat plum #48125D, replacing the 11 Nov Revolver button.
    expect(themes.light.get('plum-from')).toBe('#48125d');
    expect(themes.light.get('plum-to')).toBe('#48125d');
    expect(themes.light.get('plum-hover-from')).toBe('#672786');
    expect(themes.light.get('plum-hover-to')).toBe('#672786');
    for (const night of [themes.night, themes.staffNight]) {
      expect(night.get('plum-from')).toBe('#0047ab');
      expect(night.get('plum-to')).toBe('#0047ab');
      expect(night.get('plum-hover-from')).toBe('#2663b8');
      expect(night.get('plum-hover-to')).toBe('#2663b8');
    }
  });

  it("draws the thread in each look's own accent by day and white at night (CALM-1)", () => {
    expect(themes.light.get('thread')).toBe('#672786');
    expect(themes.night.get('thread')).toBe('#f5f5f5');
    expect(themes.staffLight.get('thread')).toBe(themes.staffLight.get('accent'));
    for (const [look, tokens] of lookTokens) {
      const day = resolveReferences(layered(lightTokens, tokens));
      expect({ look, thread: day.get('thread') }).toEqual({ look, thread: day.get('accent') });
    }
  });

  it('lifts the page mesh to the design system colours in Lilac mist (CALM-1)', () => {
    for (const [mesh, blob] of [
      ['lilac', 1],
      ['blue', 2],
      ['peach', 3],
    ] as const) {
      expect(tokensCss).toContain(
        `--mesh-${mesh}: color-mix(in srgb, var(--blob-${blob}) 60%, #fff);`,
      );
    }
    const lifted = ['blob-1', 'blob-2', 'blob-3'].map((blob) =>
      liftedWithWhite(themes.light.get(blob) ?? '', 0.6),
    );
    expect(lifted).toEqual(['#e8e0f9', '#dfe8fa', '#fbe8e2']);
  });

  it('keeps text, headings and meta lines readable on the paler mesh, in every look (CALM-1)', () => {
    const looksByDay = new Map([
      ['lilac', themes.light],
      ...[...lookTokens].map(
        ([look, tokens]) => [look, resolveReferences(layered(lightTokens, tokens))] as const,
      ),
    ]);
    // Each look's three mesh colours, then every text colour on each of them.
    const failing = [...looksByDay].flatMap(([look, day]) =>
      ['blob-1', 'blob-2', 'blob-3'].flatMap((blob) => {
        const mesh = liftedWithWhite(day.get(blob) ?? '', 0.6);
        return ['ink', 'heading', 'body', 'meta']
          .map((text) => ({ text, ratio: contrastRatio(day.get(text) ?? '', mesh) }))
          .filter(({ ratio }) => ratio < 4.5)
          .map(({ text, ratio }) => `${look}: ${text} on ${blob}'s mesh ${ratio.toFixed(2)}`);
      }),
    );
    expect(failing).toEqual([]);
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
      // The look's block lies on <html> with the day block, so references are answered after.
      const day = resolveReferences(layered(lightTokens, tokens));
      expect({ look, failing: failingPairs(day) }).toEqual({
        look,
        failing: [],
      });
    }
  });

  it('keeps white readable on every accent and every accent readable on its page', () => {
    for (const [look, tokens] of lookTokens) {
      const day = resolveReferences(layered(lightTokens, tokens));
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
  it('reaches 7:1 for text and 4.5:1 for edges in high contrast, with every look (CONTRAST-1)', () => {
    const looksByDay = new Map([
      ['lilac', lightTokens],
      ...[...lookTokens].map(([look, tokens]) => [look, layered(lightTokens, tokens)] as const),
    ]);
    for (const [look, day] of looksByDay) {
      const tokens = highContrastTokens(highContrastLight, day);
      expect({ look, failing: failingHighContrastPairs(tokens) }).toEqual({ look, failing: [] });
    }
  });

  it('reaches the same lines in high contrast at night (CONTRAST-1)', () => {
    const tokens = highContrastTokens(highContrastNight, nightTokens);
    expect(failingHighContrastPairs(tokens)).toEqual([]);
  });

  it('draws high contrast on plain white by day and plain black at night (Robert, 13 Nov 2026)', () => {
    const day = highContrastTokens(highContrastLight, lightTokens);
    const night = highContrastTokens(highContrastNight, nightTokens);
    for (const surface of ['paper', 'surface', 'story-paper']) {
      expect({ surface, colour: day.get(surface) }).toEqual({ surface, colour: '#ffffff' });
      expect({ surface, colour: night.get(surface) }).toEqual({ surface, colour: '#000000' });
    }
  });

  it('keeps each theme in high contrast as its own deep accent', () => {
    for (const [look, tokens] of lookTokens) {
      const day = layered(lightTokens, tokens);
      const highContrast = highContrastTokens(highContrastLight, day);
      const deepAccent = day.get('accent-deep');
      for (const name of ['primary', 'link', 'chip-on', 'plum-from', 'focus-ring', 'logo']) {
        expect({ look, name, colour: highContrast.get(name) }).toEqual({
          look,
          name,
          colour: deepAccent,
        });
      }
    }
    // No two themes share a deep accent, so the theme still shows.
    const deepAccents = [...lookTokens.values()].map((tokens) => tokens.get('accent-deep'));
    expect(new Set(deepAccents).size).toBe(deepAccents.length);
  });

  it('gives high contrast the same tokens by day and at night', () => {
    // By day the accent tokens are references to the look's deep accent, so they are not plain
    // colours there; everything the day block sets as a colour, night sets too.
    const dayColourNames = [...readTokenBlock(highContrastLight)]
      .filter(([, value]) => value.startsWith('#'))
      .map(([name]) => name);
    const nightNames = new Set(readTokenBlock(highContrastNight).keys());
    expect(dayColourNames.filter((name) => !nightNames.has(name))).toEqual([]);
  });

  it('reaches the high contrast lines in the staff area too, with no purple', () => {
    const staffDay = layered(
      highContrastTokens(highContrastLight, layered(lightTokens, staffLightTokens)),
      readTokenBlock("[data-contrast='more'] [data-area='staff']"),
    );
    const staffNight = layered(
      highContrastTokens(
        highContrastNight,
        layered(nightTokens, staffLightTokens, staffNightTokens),
      ),
      readTokenBlock("[data-contrast='more'] [data-area='staff']"),
      readTokenBlock("[data-contrast='more'][data-theme='night'] [data-area='staff']"),
    );
    expect(failingHighContrastPairs(staffDay)).toEqual([]);
    expect(failingHighContrastPairs(staffNight)).toEqual([]);
    expect([...staffDay.values()]).not.toContain('#2a0e33');
  });
});
