/**
 * Tests public/theme-init.js, the script that marks <html> before the page draws, as written and
 * as the build shrinks it (vite.config.ts, shrinkThemeInitPlugin; bundle CONTRAST-1), and the
 * colour it gives a phone browser's own bars (bundle CALM-1).
 *
 * Why here: the file is plain JavaScript outside src/, loaded by index.html, so nothing imports
 * it. This test runs its text against a pretend window and document, in plain Node.
 * What it proves: the written file and the shrunk file set the same attributes and the same bar
 * colours, for a first visit, for remembered choices (night, a look, less motion, high contrast),
 * for a device that asks for dark mode or more contrast, and when storage is blocked; both
 * theme-color metas get the page colour before the style sheet loads and once it has; a page
 * without the metas is left alone; and the plain first-paint colours in index.html and
 * theme-init.js are the day and night --paper of src/styles/tokens.css.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { minifySync } from 'vite';
import { describe, expect, it } from 'vitest';

/**
 * Reads a file of the project as text.
 *
 * @param path - the file's path from the project's root
 * @returns the file's text
 */
function projectFile(path: string): string {
  return readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');
}

const written = projectFile('public/theme-init.js');
const shrunk = minifySync('theme-init.js', written);
const tokensCss = projectFile('src/styles/tokens.css');
const indexHtml = projectFile('index.html');

/**
 * Reads --paper from one block of tokens.css.
 *
 * @param selector - the block's last selector line, exactly as written, for example
 *   [data-theme='night']
 * @returns the block's page colour, "#rrggbb"
 * Errors: throws when tokens.css has no such block, or the block sets no --paper.
 */
function paperIn(selector: string): string {
  const escapedSelector = selector.replace(/[[\]]/g, '\\$&');
  const startIndex = tokensCss.search(new RegExp(`(^|\\n)${escapedSelector}\\s*\\{`));
  if (startIndex === -1) throw new Error(`tokens.css has no ${selector} block.`);
  const block = tokensCss.slice(startIndex, tokensCss.indexOf('\n}', startIndex));
  const paper = /--paper:\s*(#[0-9a-f]{6})\s*;/i.exec(block)?.[1];
  if (paper === undefined) throw new Error(`The ${selector} block sets no --paper.`);
  return paper;
}

/** The page colours tokens.css gives by day and at night, in Lilac mist (the default look). */
const dayPaper = paperIn("[data-theme='light']");
const nightPaper = paperIn("[data-theme='night']");

/**
 * The page colour the loaded style sheet gives, as tokens.css works it out for the attributes on
 * <html> (the staff area's own colours on its frame).
 *
 * @param attributes - the attributes theme-init.js set on <html>
 * @param onStaffFrame - true when the colour is read from the staff area's frame
 * @returns the page colour, "#rrggbb"
 */
function paperFromTokens(attributes: Record<string, string>, onStaffFrame: boolean): string {
  const isNight = attributes['data-theme'] === 'night';
  const area = onStaffFrame ? " [data-area='staff']" : '';
  if (attributes['data-contrast'] === 'more') {
    if (onStaffFrame)
      return paperIn(
        isNight
          ? `[data-contrast='more'][data-theme='night']${area}`
          : `[data-contrast='more']${area}`,
      );
    return paperIn(`[data-contrast='more'][data-theme='${isNight ? 'night' : 'light'}']`);
  }
  if (isNight) return paperIn(`[data-theme='night']${area}`);
  if (onStaffFrame) return paperIn("[data-area='staff']");
  const look = attributes['data-look'] ?? 'lilac';
  return look === 'lilac' ? dayPaper : paperIn(`[data-look-swatch='${look}']`);
}

/** What one pretend device remembers and asks for, and the page it opens. */
interface Device {
  /** localStorage contents; null means storage is blocked and every read throws. */
  stored: Record<string, string> | null;
  /** The media queries that are true on this device. */
  matching: string[];
  /** False for a page without theme-color metas (true when left out). */
  hasMetas?: boolean;
  /** True for a staff page, whose frame paints its own page colour (false when left out). */
  isStaffPage?: boolean;
}

/** What the script did to one pretend page. */
interface FirstPaint {
  /** The attributes the script set on <html>. */
  attributes: Record<string, string>;
  /** Both metas' colours before the style sheet has loaded (empty without metas). */
  barsBeforeLoad: string[];
  /** Both metas' colours once the page has loaded (empty without metas). */
  barsAfterLoad: string[];
}

/** A pretend theme-color meta that keeps the colour it is given. */
interface PretendMeta {
  content: string;
  setAttribute(name: string, value: string): void;
}

/**
 * Makes the two theme-color metas index.html starts with.
 *
 * @returns the light device's meta and the dark device's meta
 */
function pretendMetas(): PretendMeta[] {
  return ['light', 'dark'].map((device) => ({
    content: device === 'light' ? dayPaper : nightPaper,
    setAttribute(name: string, value: string) {
      if (name === 'content') this.content = value;
    },
  }));
}

/**
 * Runs the script's text on a pretend device, then fires the page's load event.
 *
 * @param code - the script, written or shrunk
 * @param device - what the device remembers and asks for
 * @returns the attributes and the bar colours before and after the style sheet loaded
 */
function firstPaintBy(code: string, device: Device): FirstPaint {
  const attributes: Record<string, string> = {};
  const metas = device.hasMetas === false ? [] : pretendMetas();
  const staffFrame = { isStaffFrame: true };
  const loadListeners: (() => void)[] = [];
  let styleSheetLoaded = false;
  const pretendWindow = {
    localStorage: {
      getItem(key: string): string | null {
        if (device.stored === null) throw new Error('Storage is blocked.');
        return device.stored[key] ?? null;
      },
    },
    matchMedia: (query: string) => ({ matches: device.matching.includes(query) }),
    // Before the load event the style sheet has not arrived, so --paper reads as empty.
    getComputedStyle: (element: object) => ({
      getPropertyValue: (name: string) =>
        styleSheetLoaded && name === '--paper'
          ? paperFromTokens(attributes, element === staffFrame)
          : '',
    }),
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'load') loadListeners.push(listener);
    },
  };
  const pretendDocument = {
    documentElement: {
      setAttribute(name: string, value: string) {
        attributes[name] = value;
      },
      getAttribute: (name: string) => attributes[name] ?? null,
    },
    querySelectorAll: (selector: string) => (selector === 'meta[name="theme-color"]' ? metas : []),
    querySelector: (selector: string) =>
      device.isStaffPage === true && selector === '[data-area="staff"]' ? staffFrame : null,
  };
  // The script is our own file, run with stand-ins for the two globals it reads.
  new Function('window', 'document', code)(pretendWindow, pretendDocument);
  const barsBeforeLoad = metas.map((meta) => meta.content);
  styleSheetLoaded = true;
  loadListeners.forEach((listener) => {
    listener();
  });
  return { attributes, barsBeforeLoad, barsAfterLoad: metas.map((meta) => meta.content) };
}

const devices: Record<string, Device> = {
  'a first visit': { stored: {}, matching: [] },
  'a device in dark mode': { stored: {}, matching: ['(prefers-color-scheme: dark)'] },
  'remembered choices': {
    stored: {
      'theme-preference': 'night',
      'theme-shown-look': 'candy',
      'less-motion': 'on',
      'high-contrast': 'on',
    },
    matching: [],
  },
  'switches left off': {
    stored: { 'less-motion': 'off', 'high-contrast': 'off', 'theme-shown-look': 'neon' },
    matching: [],
  },
  'a device that asks for more contrast': { stored: {}, matching: ['(prefers-contrast: more)'] },
  'blocked storage': { stored: null, matching: ['(prefers-contrast: more)'] },
  'a remembered look by day': { stored: { 'theme-shown-look': 'sorbet' }, matching: [] },
  'high contrast by day': { stored: { 'high-contrast': 'on' }, matching: [] },
  'a staff page': { stored: {}, matching: [], isStaffPage: true },
  'a page without theme-color metas': { stored: {}, matching: [], hasMetas: false },
};

/**
 * Picks one of the pretend devices above.
 *
 * @param name - the device's name in the list
 * @returns the device
 * Errors: throws when the list has no device of that name.
 */
function device(name: string): Device {
  const found = devices[name];
  if (found === undefined) throw new Error(`No pretend device called "${name}".`);
  return found;
}

describe('public/theme-init.js', () => {
  it('shrinks without errors to well under the written size', () => {
    expect(shrunk.errors).toEqual([]);
    expect(shrunk.code.length).toBeLessThan(written.length / 2);
  });

  for (const [name, pretendDevice] of Object.entries(devices)) {
    it(`sets the same attributes and bar colours written and shrunk: ${name}`, () => {
      expect(firstPaintBy(shrunk.code, pretendDevice)).toEqual(
        firstPaintBy(written, pretendDevice),
      );
    });
  }

  it('marks a first visit light, in Lilac mist, with nothing else', () => {
    expect(firstPaintBy(written, device('a first visit')).attributes).toEqual({
      'data-theme': 'light',
      'data-look': 'lilac',
    });
  });

  it('marks remembered choices: night, the look, less motion and high contrast', () => {
    expect(firstPaintBy(written, device('remembered choices')).attributes).toEqual({
      'data-theme': 'night',
      'data-look': 'candy',
      'data-motion': 'less',
      'data-contrast': 'more',
    });
  });

  it('marks high contrast for a device that asks for it, even with storage blocked', () => {
    const { attributes } = firstPaintBy(written, device('blocked storage'));
    expect(attributes['data-contrast']).toBe('more');
    expect(attributes['data-motion']).toBeUndefined();
  });
});

describe("public/theme-init.js gives a phone's bars the page colour (CALM-1)", () => {
  it('gives both bars the day page colour on a first visit, before and after the style sheet loads', () => {
    const paint = firstPaintBy(written, device('a first visit'));
    expect(paint.barsBeforeLoad).toEqual([dayPaper, dayPaper]);
    expect(paint.barsAfterLoad).toEqual([dayPaper, dayPaper]);
  });

  it('gives both bars the night page colour for a device in dark mode', () => {
    const paint = firstPaintBy(written, device('a device in dark mode'));
    expect(paint.barsBeforeLoad).toEqual([nightPaper, nightPaper]);
    expect(paint.barsAfterLoad).toEqual([nightPaper, nightPaper]);
  });

  it('gives a reader who chose night the night colour on both bars, even on a light phone', () => {
    const paint = firstPaintBy(written, { stored: { 'theme-preference': 'night' }, matching: [] });
    expect(paint.barsBeforeLoad).toEqual([nightPaper, nightPaper]);
    expect(paint.barsAfterLoad).toEqual([nightPaper, nightPaper]);
  });

  it("gives a look its own page colour once the style sheet has loaded (Sorbet's peach)", () => {
    const paint = firstPaintBy(written, device('a remembered look by day'));
    expect(paint.barsBeforeLoad).toEqual([dayPaper, dayPaper]);
    expect(paint.barsAfterLoad).toEqual(Array(2).fill(paperIn("[data-look-swatch='sorbet']")));
    expect(paint.barsAfterLoad[0]).not.toBe(dayPaper);
  });

  it('gives high contrast its plain page colour by day and at night once the style sheet has loaded', () => {
    const byDay = firstPaintBy(written, device('high contrast by day'));
    expect(byDay.barsAfterLoad).toEqual(
      Array(2).fill(paperIn("[data-contrast='more'][data-theme='light']")),
    );
    const atNight = firstPaintBy(written, device('remembered choices'));
    expect(atNight.barsBeforeLoad).toEqual([nightPaper, nightPaper]);
    expect(atNight.barsAfterLoad).toEqual(
      Array(2).fill(paperIn("[data-contrast='more'][data-theme='night']")),
    );
  });

  it('colours the bars by the device alone when storage is blocked', () => {
    const paint = firstPaintBy(written, device('blocked storage'));
    expect(paint.barsBeforeLoad).toEqual([dayPaper, dayPaper]);
    expect(paint.barsAfterLoad).toEqual(
      Array(2).fill(paperIn("[data-contrast='more'][data-theme='light']")),
    );
  });

  it("gives a staff page the staff area's own page colour once it has loaded", () => {
    const paint = firstPaintBy(written, device('a staff page'));
    expect(paint.barsAfterLoad).toEqual(Array(2).fill(paperIn("[data-area='staff']")));
  });

  it('leaves a page without theme-color metas alone and still marks <html>', () => {
    const paint = firstPaintBy(written, device('a page without theme-color metas'));
    expect(paint.barsBeforeLoad).toEqual([]);
    expect(paint.barsAfterLoad).toEqual([]);
    expect(paint.attributes['data-theme']).toBe('light');
  });
});

describe('the first-paint colours match tokens.css, day and night (CALM-1)', () => {
  /**
   * Reads the colour of index.html's theme-color meta for a light or a dark device.
   *
   * @param scheme - the device's colour scheme in the meta's media query
   * @returns the meta's colour, or undefined when index.html has no such meta
   */
  function indexHtmlBarColour(scheme: 'light' | 'dark'): string | undefined {
    const meta = new RegExp(
      `<meta name="theme-color" content="(#[0-9a-f]{6})" media="\\(prefers-color-scheme: ${scheme}\\)"`,
      'i',
    );
    return meta.exec(indexHtml)?.[1];
  }

  it("names tokens.css's day and night --paper in index.html's two theme-color metas", () => {
    expect(indexHtmlBarColour('light')).toBe(dayPaper);
    expect(indexHtmlBarColour('dark')).toBe(nightPaper);
  });

  it("uses tokens.css's day and night --paper in theme-init.js before the style sheet loads", () => {
    // Before the load event the script can only use its own two plain colours.
    expect(firstPaintBy(written, device('a first visit')).barsBeforeLoad[0]).toBe(dayPaper);
    expect(firstPaintBy(written, device('a device in dark mode')).barsBeforeLoad[0]).toBe(
      nightPaper,
    );
  });
});
