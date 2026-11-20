/**
 * Unit tests for the browser bar colour (the simplified design, bundle CALM-1): the phone's bars
 * take the page colour now in force, never black. Who runs it: `npm test` (Vitest, jsdom).
 * A small style sheet stands in for tokens.css: the same selectors and page colours, so the
 * tests follow the attributes the way the real page does.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { matchBrowserBarsToPage, readPageColour } from './browserBarColour';
import { applyHighContrast } from './highContrast';
import { applyLook } from './looks';
import { applyTheme } from './theme';

/** The page colours from src/styles/tokens.css that these tests use. */
const pageColours = {
  lilacDay: '#f3eefb',
  night: '#111113',
  sorbetDay: '#fff1ea',
  highContrastDay: '#ffffff',
  staffDay: '#f3ece0',
};

/** A stand-in for tokens.css: --paper by day, at night, in Sorbet and in high contrast. */
const tokensStandIn = `
  :root, [data-theme='light'] { --paper: ${pageColours.lilacDay}; }
  [data-theme='night'] { --paper: ${pageColours.night}; }
  [data-theme='light'][data-look='sorbet'] { --paper: ${pageColours.sorbetDay}; }
  :root[data-contrast='more'][data-theme='light'] { --paper: ${pageColours.highContrastDay}; }
  [data-area='staff'] { --paper: ${pageColours.staffDay}; }
  [data-theme='night'] [data-area='staff'] { --paper: ${pageColours.night}; }
`;

/**
 * Adds the two theme-color metas index.html starts with.
 *
 * @returns the light device's meta and the dark device's meta
 */
function addThemeColourMetas(): [HTMLMetaElement, HTMLMetaElement] {
  const forLightDevice = document.createElement('meta');
  forLightDevice.name = 'theme-color';
  forLightDevice.content = pageColours.lilacDay;
  forLightDevice.media = '(prefers-color-scheme: light)';
  const forDarkDevice = document.createElement('meta');
  forDarkDevice.name = 'theme-color';
  forDarkDevice.content = pageColours.night;
  forDarkDevice.media = '(prefers-color-scheme: dark)';
  document.head.append(forLightDevice, forDarkDevice);
  return [forLightDevice, forDarkDevice];
}

/**
 * Adds the stand-in for tokens.css.
 *
 * @returns the style element, so a test can take it away again
 */
function addTokens(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = tokensStandIn;
  document.head.append(style);
  return style;
}

let metas: [HTMLMetaElement, HTMLMetaElement];
let tokens: HTMLStyleElement;

beforeEach(() => {
  metas = addThemeColourMetas();
  tokens = addTokens();
  // Set straight on <html>, not through applyTheme, so the metas start as index.html has them.
  document.documentElement.dataset.theme = 'light';
});

afterEach(() => {
  metas.forEach((meta) => {
    meta.remove();
  });
  tokens.remove();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.look;
  delete document.documentElement.dataset.contrast;
  window.localStorage.clear();
});

describe('the browser bar colour', () => {
  it('reads the page colour now in force from <html>', () => {
    expect(readPageColour()).toBe(pageColours.lilacDay);
  });

  it('gives both bars the page colour by day', () => {
    expect(matchBrowserBarsToPage()).toBe(pageColours.lilacDay);
    expect(metas.map((meta) => meta.content)).toEqual([pageColours.lilacDay, pageColours.lilacDay]);
  });

  it('gives a reader in night mode on a light phone the night page colour', () => {
    document.documentElement.dataset.theme = 'night';
    matchBrowserBarsToPage();
    // The light device's meta is the one a light phone uses: it must say night too.
    expect(metas.map((meta) => meta.content)).toEqual([pageColours.night, pageColours.night]);
  });

  it("gives a look its own page colour, so Sorbet's bars are peach", () => {
    document.documentElement.dataset.look = 'sorbet';
    matchBrowserBarsToPage();
    expect(metas.map((meta) => meta.content)).toEqual([
      pageColours.sorbetDay,
      pageColours.sorbetDay,
    ]);
  });

  it("keeps index.html's colours while the style sheet has not loaded", () => {
    tokens.remove();
    expect(matchBrowserBarsToPage()).toBeNull();
    expect(metas.map((meta) => meta.content)).toEqual([pageColours.lilacDay, pageColours.night]);
  });

  it('changes nothing on a page without a theme-color meta', () => {
    metas.forEach((meta) => {
      meta.remove();
    });
    expect(matchBrowserBarsToPage()).toBeNull();
  });
});

describe('the bars follow every change of the page colour', () => {
  it('follows the theme when night mode is switched on and off', () => {
    applyTheme('night');
    expect(metas[0].content).toBe(pageColours.night);
    applyTheme('light');
    expect(metas[0].content).toBe(pageColours.lilacDay);
  });

  it('follows the look the member picks', () => {
    applyLook('sorbet');
    expect(metas[1].content).toBe(pageColours.sorbetDay);
  });

  it('follows high contrast when it is turned on and off', () => {
    applyHighContrast(true);
    expect(metas[0].content).toBe(pageColours.highContrastDay);
    applyHighContrast(false);
    expect(metas[0].content).toBe(pageColours.lilacDay);
  });
});

describe("the staff area's own page colour", () => {
  /**
   * Adds the staff frame, which sets --paper again (StaffLayout's data-area="staff").
   *
   * @returns the frame, so a test can take it away again
   */
  function addStaffFrame(): HTMLDivElement {
    const frame = document.createElement('div');
    frame.dataset.area = 'staff';
    document.body.append(frame);
    return frame;
  }

  it("gives both bars the staff area's beige while the staff frame is on the page", () => {
    const frame = addStaffFrame();
    expect(matchBrowserBarsToPage()).toBe(pageColours.staffDay);
    expect(metas.map((meta) => meta.content)).toEqual([pageColours.staffDay, pageColours.staffDay]);
    frame.remove();
  });

  it('follows night mode inside the staff area', () => {
    const frame = addStaffFrame();
    applyTheme('night');
    expect(metas[0].content).toBe(pageColours.night);
    applyTheme('light');
    expect(metas[0].content).toBe(pageColours.staffDay);
    frame.remove();
  });

  it("goes back to the member's page colour once the staff frame has gone", () => {
    const frame = addStaffFrame();
    matchBrowserBarsToPage();
    frame.remove();
    expect(matchBrowserBarsToPage()).toBe(pageColours.lilacDay);
    expect(metas[1].content).toBe(pageColours.lilacDay);
  });
});
