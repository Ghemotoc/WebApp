/**
 * The colour of a phone browser's own bars: keeps the theme-color metas in index.html in step with
 * the page colour now in force (the simplified design, bundle CALM-1).
 *
 * Why (Robert, 20 Nov 2026, 13:10 UTC: "at the moment it shows black on website on phone"): a
 * phone browser paints its status bar and toolbars in the theme-color the page names, and in
 * black (dark mode) or white when it names none. index.html names #f3eefb for a light device and
 * #111113 for a dark one, but the member can pick night on a light phone, light on a dark one, or
 * a look with its own page colour (Sorbet's peach, for example). So whenever the theme, the look
 * or high contrast changes, both metas are set to --paper as tokens.css works it out on <html>:
 * a reader in night mode on a light phone then gets #111113, and Sorbet gets its own colour.
 *
 * Who calls it: applyTheme (src/lib/theme.ts), applyLook (src/lib/looks.ts) and applyHighContrast
 * (src/lib/highContrast.ts), each right after it changes its attribute on <html>.
 * public/theme-init.js repeats this before the page draws (it can't import modules); keep the
 * meta's name and the token name the same in both files.
 * What it changes: the content of every <meta name="theme-color"> in the page's <head>.
 */

/** The CSS selector for the theme-color metas: one for light devices, one for dark ones. */
export const THEME_COLOUR_META_SELECTOR = 'meta[name="theme-color"]';

/** The page colour token in src/styles/tokens.css. */
export const PAGE_COLOUR_TOKEN = '--paper';

/**
 * Reads the page colour now in force: --paper on <html>, as tokens.css works it out for the
 * theme, the look and high contrast on show.
 *
 * @param root - the element to read it from; <html> unless a test passes another
 * @returns the colour as written in tokens.css (for example "#f3eefb"), or an empty string while
 *   the style sheet has not loaded yet
 */
export function readPageColour(root: HTMLElement = document.documentElement): string {
  return getComputedStyle(root).getPropertyValue(PAGE_COLOUR_TOKEN).trim();
}

/**
 * Sets every theme-color meta to the page colour now in force, so the phone's bars match the page
 * instead of showing black. Safe to call at any time: before the style sheet has loaded, or on a
 * page with no theme-color meta, it changes nothing.
 *
 * @returns the colour the metas now name, or null when nothing was changed (no style sheet yet,
 *   no meta, or no page at all, as in a test without a DOM)
 */
export function matchBrowserBarsToPage(): string | null {
  // Step 1: outside a browser (a server render or a Node test) there are no bars to colour.
  if (typeof document === 'undefined') return null;

  // Step 2: the page colour. It is empty until tokens.css has loaded; the metas then keep the
  // colours index.html gave them, which are the right ones for a light or dark device.
  const pageColour = readPageColour();
  if (pageColour === '') return null;

  // Step 3: both metas get the same colour, because the member's choice beats the device's
  // light or dark setting that each meta's media query follows.
  const metas = document.querySelectorAll<HTMLMetaElement>(THEME_COLOUR_META_SELECTOR);
  if (metas.length === 0) return null;
  metas.forEach((meta) => {
    meta.content = pageColour;
  });
  return pageColour;
}
