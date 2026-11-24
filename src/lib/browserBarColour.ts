/**
 * The colour of a phone browser's own bars: keeps the theme-color metas in index.html in step with
 * the page colour now in force (the simplified design, bundle CALM-1).
 *
 * Why (Robert, 20 Nov 2026, 13:10 UTC: "at the moment it shows black on website on phone"): a
 * phone browser paints its status bar and toolbars in the theme-color the page names, and in
 * black (dark mode) or white when it names none. index.html names #f4f0ec for a light device and
 * #0e0e10 for a dark one, but the member can pick night on a light phone, light on a dark one, or
 * a look with its own page colour (Sorbet's peach, for example). So whenever the theme, the look
 * or high contrast changes, both metas are set to --paper as tokens.css works it out on <html>:
 * a reader in night mode on a light phone then gets #0e0e10, and Sorbet gets its own colour.
 *
 * The staff area paints its own flat beige (or its own night and high contrast colours) over the
 * member's page: its frame carries data-area="staff" and sets --paper again (tokens.css). While
 * that frame is on the page, its --paper is the one the bars take.
 *
 * Who calls it: applyTheme (src/lib/theme.ts), applyLook (src/lib/looks.ts) and applyHighContrast
 * (src/lib/highContrast.ts), each right after it changes its attribute on <html>, and
 * StaffBrowserBars (src/features/staff/components/StaffBrowserBars.tsx) when the staff frame
 * appears and goes. public/theme-init.js repeats this before the page draws (it can't import
 * modules); keep the meta's name, the staff area's selector and the token name the same in both
 * files.
 * What it changes: the content of every <meta name="theme-color"> in the page's <head>.
 */

/** The CSS selector for the theme-color metas: one for light devices, one for dark ones. */
export const THEME_COLOUR_META_SELECTOR = 'meta[name="theme-color"]';

/** The page colour token in src/styles/tokens.css. */
export const PAGE_COLOUR_TOKEN = '--paper';

/**
 * The bar colour token in src/styles/tokens.css: set only at night, to the flat night page
 * colour (Robert, 20 Nov 2026, 16:04 UTC; flat since NIGHT-2).
 */
export const BROWSER_BAR_TOKEN = '--browser-bar';

/** The staff area's frame, which paints its own page colour over the member's (StaffLayout). */
export const STAFF_AREA_SELECTOR = '[data-area="staff"]';

/**
 * Finds the element whose --paper paints the page now.
 *
 * @returns the staff area's frame while a staff page is on screen, <html> everywhere else
 */
function pageColourElement(): HTMLElement {
  return document.querySelector<HTMLElement>(STAFF_AREA_SELECTOR) ?? document.documentElement;
}

/**
 * Reads the page colour now in force: --paper as tokens.css works it out for the theme, the look
 * and high contrast on show, in the staff area's own colours on a staff page.
 *
 * @param root - the element to read it from; the staff frame or <html> unless a test passes
 *   another
 * @returns the colour as written in tokens.css (for example "#f4f0ec"), or an empty string while
 *   the style sheet has not loaded yet
 */
export function readPageColour(root: HTMLElement = pageColourElement()): string {
  // --browser-bar wins where tokens.css sets one (night); every other look uses --paper.
  const style = getComputedStyle(root);
  const barColour = style.getPropertyValue(BROWSER_BAR_TOKEN).trim();
  if (barColour !== '') return barColour;
  return style.getPropertyValue(PAGE_COLOUR_TOKEN).trim();
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
