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
import { yearRoundLooks } from '../src/lib/looks';
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
  [...yearRoundLooks]
    .filter((look) => look !== 'lilac')
    .map((look) => [look, readTokenBlock(`[data-look-swatch='${look}']`)] as const),
);

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

  it('uses the Lilac mist colours of the approved design by day, on the flat Isabelline page (bundle G1; CALM-1b; flat themes, 23 Nov 2026)', () => {
    expect(themes.light.get('paper')).toBe('#f4f0ec');
    expect(themes.light.get('ink')).toBe('#24133a');
    expect(themes.light.get('heading')).toBe('#2a0e33');
    expect(themes.light.get('body')).toBe('#4a3e60');
    expect(themes.light.get('link')).toBe('#3d4290');
    expect(themes.light.get('control-border')).toBe('#725f88');
    expect(themes.light.get('focus-ring')).toBe('#48125d');
  });

  it('takes the canvas v38 muted text, edges and pressed quiet button at night and in staff (CALM-1b)', () => {
    // NIGHT-2 (Robert, 22 Nov 2026) set the muted text and the control edges again.
    expect(themes.night.get('body')).toBe('#b4b4ba');
    expect(themes.night.get('control-border')).toBe('#8e8e96');
    expect(themes.night.get('pill-gold-text')).toBe('#fff4e4');
    expect(themes.night.get('quiet-pressed-bg')).toBe('#f2f2f3');
    expect(themes.night.get('quiet-pressed-text')).toBe('#0e0e10');
    expect(themes.staffLight.get('body')).toBe('#4f443a');
  });

  it('draws eyebrows in the heading colour by day and white at night, never gold (one colour set for text, Robert, 23 Nov 2026)', () => {
    expect(themes.light.get('eyebrow')).toBe('#2a0e33');
    expect(themes.night.get('eyebrow')).toBe('#f7f7f8');
  });

  it('turns the interface black, white and grey at night, with Valentino main buttons (NIGHT-1; Robert, 23 Nov 2026)', () => {
    expect(themes.night.get('paper')).toBe('#0e0e10');
    expect(themes.night.get('ink')).toBe('#e8e8ea');
    expect(themes.night.get('plum-to')).toBe('#7b3a91');
    expect(themes.night.get('accent')).toBe('#c4a6ce');
    // No cobalt is left on the main action (the sky genre band keeps its own deep blue).
    expect(themes.night.get('plum-hover-to')).not.toBe('#1a5bc4');
  });

  it('draws night as one flat page with solid grey boxes in four steps (NIGHT-2, Robert, 22 Nov 2026)', () => {
    // Page < box < raised < field, all solid: no see-through glass, no galaxy picture.
    expect(themes.night.get('surface')).toBe('#18181b');
    expect(themes.night.get('surface-box')).toBe('#18181b');
    expect(themes.night.get('surface-glass')).toBe('#18181b');
    expect(themes.night.get('tint')).toBe('#222226');
    expect(themes.night.get('field')).toBe('#1d1d21');
    expect(themes.night.get('line-box')).toBe('#2a2a2f');
    expect(themes.night.get('story-paper')).toBe('#141416');
    // Soft white text that still reads at 7:1 or more on a box, so long reading doesn't glare.
    const box = themes.night.get('surface') ?? '';
    expect(contrastRatio(themes.night.get('ink') ?? '', box)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(themes.night.get('body') ?? '', box)).toBeGreaterThanOrEqual(7);
  });

  it('draws the main button in one flat colour, plum by day and Valentino at night for members (CALM-1; 23 Nov 2026)', () => {
    // Robert, 20 Nov 2026: flat plum #48125D, replacing the 11 Nov Revolver button.
    expect(themes.light.get('plum-from')).toBe('#48125d');
    expect(themes.light.get('plum-to')).toBe('#48125d');
    expect(themes.light.get('plum-hover-from')).toBe('#672786');
    expect(themes.light.get('plum-hover-to')).toBe('#672786');
    expect(themes.night.get('plum-from')).toBe('#7b3a91');
    expect(themes.night.get('plum-to')).toBe('#7b3a91');
    expect(themes.night.get('plum-hover-from')).toBe('#8f4fa6');
    expect(themes.night.get('plum-hover-to')).toBe('#8f4fa6');
    // White labels on the button and its hover (WCAG 2.2, 1.4.3).
    expect(contrastRatio('#ffffff', '#7b3a91')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', '#8f4fa6')).toBeGreaterThanOrEqual(4.5);
  });

  it('draws staff at night in pure black and grey, with amber kept for warnings (staff night, Robert, 22 Nov 2026)', () => {
    const staffNight = themes.staffNight;
    // Black page, grey cards and a near-white main button with dark text: no cobalt.
    expect(staffNight.get('paper')).toBe('#000000');
    expect(staffNight.get('surface')).toBe('#161616');
    expect(staffNight.get('plum-to')).toBe('#f5f5f5');
    expect(staffNight.get('on-plum')).toBe('#111113');
    // Amber #FFC98A is the only hue: warnings, errors and destructive actions.
    expect(staffNight.get('warning-text')).toBe('#ffc98a');
    expect(staffNight.get('error-text')).toBe('#ffc98a');
    expect(staffNight.get('destructive')).toBe('#ffc98a');
    // Every other colour the staff night block sets is a grey: its red, green and blue are within
    // 8 of each other (#111113 and #8E8E94 are the cool greys the member night uses too).
    const hues = [...staffNightTokens.values()]
      .filter((value) => /^#[0-9a-f]{6}$/i.test(value))
      .filter((value) => value.toLowerCase() !== '#ffc98a')
      .filter((value) => {
        const channels = [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16));
        return Math.max(...channels) - Math.min(...channels) > 8;
      });
    expect(hues).toEqual([]);
  });

  it("draws the thread in each look's own accent by day and soft white at night (CALM-1, NIGHT-2)", () => {
    expect(themes.light.get('thread')).toBe('#672786');
    expect(themes.night.get('thread')).toBe('#e8e8ea');
    expect(themes.staffLight.get('thread')).toBe(themes.staffLight.get('accent'));
    for (const [look, tokens] of lookTokens) {
      const day = resolveReferences(layered(lightTokens, tokens));
      expect({ look, thread: day.get('thread') }).toEqual({ look, thread: day.get('accent') });
    }
  });

  it('draws every page as one flat colour, with no mesh or blobs in any theme (Robert, 23 Nov 2026)', () => {
    // The mesh and blob tokens are gone, so nothing can paint a gradient behind the page.
    expect(tokensCss).not.toMatch(/--(mesh|blob)-/);
    expect(tokensCss).not.toContain('--night-sky');
    // Every band's two ends are the same colour, by day, at night and in high contrast.
    for (const tokens of [themes.light, themes.night]) {
      for (const tone of ['plum', 'sage', 'gold', 'sky', 'neutral', 'blush']) {
        expect({ tone, to: tokens.get(`band-${tone}-to`) }).toEqual({
          tone,
          to: tokens.get(`band-${tone}-from`),
        });
      }
    }
  });

  it('keeps text, headings, meta lines and links readable on every theme page (flat themes)', () => {
    const looksByDay = new Map([
      ['lilac', themes.light],
      ...[...lookTokens].map(
        ([look, tokens]) => [look, resolveReferences(layered(lightTokens, tokens))] as const,
      ),
    ]);
    const failing = [...looksByDay].flatMap(([look, day]) =>
      ['ink', 'heading', 'body', 'meta', 'link', 'accent']
        .map((text) => ({
          text,
          ratio: contrastRatio(day.get(text) ?? '', day.get('paper') ?? ''),
        }))
        .filter(({ ratio }) => ratio < 4.5)
        .map(({ text, ratio }) => `${look}: ${text} on its page ${ratio.toFixed(2)}`),
    );
    expect(failing).toEqual([]);
  });

  it('keeps each theme colour at night, with white labels and accent text that read (Robert, 23 Nov 2026)', () => {
    for (const look of yearRoundLooks.filter((name) => name !== 'lilac')) {
      const night = resolveReferences(
        layered(nightTokens, readTokenBlock(`[data-theme='night'][data-look='${look}']`)),
      );
      const day = resolveReferences(layered(lightTokens, lookTokens.get(look) ?? new Map()));
      // The button is the theme's own colour, the same as by day.
      expect({ look, button: night.get('plum-to') }).toEqual({ look, button: day.get('plum-to') });
      // Its white label reads on the button and on its hover; the accent reads on the night box.
      const box = night.get('surface-box') ?? '';
      const readable = {
        label: contrastRatio('#ffffff', night.get('plum-to') ?? '') >= 4.5,
        hoverLabel: contrastRatio('#ffffff', night.get('plum-hover-to') ?? '') >= 4.5,
        accent: contrastRatio(night.get('accent') ?? '', box) >= 4.5,
        logo: contrastRatio(night.get('logo') ?? '', night.get('paper') ?? '') >= 4.5,
      };
      expect({ look, readable }).toEqual({
        look,
        readable: { label: true, hoverLabel: true, accent: true, logo: true },
      });
      expect({ look, failing: failingPairs(night) }).toEqual({ look, failing: [] });
    }
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
    // The glass fills and rims are see-through by day, so the reader above skips them there; at
    // night they are solid greys (NIGHT-2), and the night page colour lives only at night. The
    // night block also keeps --surface-box-solid, the box's solid look-alike from CALM-1c.
    const solidOnlyAtNight = new Set(['field', 'glass-border', 'lg-rim', 'nav-glass']);
    const nightKeys = [...themes.night.keys()].filter((name) => !solidOnlyAtNight.has(name));
    const lightKeys = [...themes.light.keys(), 'surface-box-solid'];
    expect(nightKeys.sort()).toEqual(lightKeys.sort());
  });

  it('keeps muted text and links readable on the box surface by day (CALM-1c)', () => {
    const box = themes.light.get('surface-box') ?? '';
    expect(contrastRatio(themes.light.get('body') ?? '', box)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(themes.light.get('link') ?? '', box)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(themes.light.get('heading') ?? '', box)).toBeGreaterThanOrEqual(7);
  });

  it('keeps muted text readable on the night box surface (CALM-1c)', () => {
    const box = themes.night.get('surface-box-solid') ?? '';
    expect(contrastRatio(themes.night.get('body') ?? '', box)).toBeGreaterThanOrEqual(4.5);
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
    for (const tokens of lookTokens.values()) {
      const leaking = [...tokens.keys()].filter((name) => !staffLightTokens.has(name));
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
