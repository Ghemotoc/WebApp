/**
 * glass-like-website: guards the liquid glass that GLASS-2 copied from the main website
 * (Robert, 11 Nov 2026: "check the Engage Grow Hub and replicate").
 *
 * It reads the two style files as text and checks the rules a later change could quietly drop:
 * the main look's plum action buttons with cream text (flat plum #48125D since the simplified
 * design, Robert, 20 Nov 2026; bundle CALM-1; drawn flat with no sheen and the quiet button as the
 * tint since CALM-2), a lighter hover and press colour in every look, the nav bars as the one
 * blurred glass left (the flat themes bundle, Robert, 23 Nov 2026: no glass except nav bars), the
 * coloured bands flat, and the staff area kept flat. Colour contrast itself is tested in token-contrast.test.ts.
 * Who runs it: Vitest (npm test). What it reads: src/styles/tokens.css, src/styles/index.css and
 * every component file under src/ (for a blur of its own).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** Reads one style file next to this script's folder. */
function readStyles(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../src/styles/${name}`, import.meta.url)), 'utf8');
}

const tokensCss = readStyles('tokens.css');
const indexCss = readStyles('index.css');

/** Every component file under src/ (tests left out), with its text. */
const componentSources = readdirSync(fileURLToPath(new URL('../src', import.meta.url)), {
  recursive: true,
  encoding: 'utf8',
})
  .filter((path) => path.endsWith('.tsx') && !path.endsWith('.test.tsx'))
  .map((path) => ({
    path,
    source: readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), 'utf8'),
  }));

/** The text of the first block whose selector list starts with the given text. */
function blockAfter(css: string, selectorStart: string): string {
  const start = css.indexOf(selectorStart);
  if (start === -1) throw new Error(`No block starts with ${selectorStart}`);
  return css.slice(start, css.indexOf('}', start));
}

describe('the main website glass on this app (GLASS-2)', () => {
  it("gives the main look's action buttons one flat plum and cream text", () => {
    const mainLook = blockAfter(tokensCss, ':root,');
    // Robert, 20 Nov 2026: flat plum #48125D, replacing the 11 Nov Revolver #2A0E33 (CALM-1).
    expect(mainLook).toContain('--plum-from: #48125d;');
    expect(mainLook).toContain('--plum-to: #48125d;');
    expect(mainLook).toContain('--on-plum: #fbf7ec;');
    expect(mainLook).toContain('--plum-hover-from: #672786;');
  });

  it('gives every look that sets its own button colours a hover and press colour', () => {
    // Step 1: count the blocks that set the button gradient, then the ones with a hover colour.
    const buttonBlocks = tokensCss.match(/--plum-from: #[0-9a-f]{6};/g) ?? [];
    const hoverBlocks = tokensCss.match(/--plum-hover-from: #[0-9a-f]{6};/g) ?? [];
    expect(hoverBlocks.length).toBe(buttonBlocks.length);
  });

  it('turns the main button to its hover colour on hover, press and the current page', () => {
    expect(indexCss).toContain("&[aria-current='page']");
    // One flat hover colour, no gradient (the flat themes bundle, Robert, 23 Nov 2026).
    const mainButton = blockAfter(indexCss, '@utility button-main');
    expect(mainButton).toContain('background-color: var(--plum-hover-to);');
    expect(mainButton).toContain('background-image: none;');
  });

  it('draws the main button flat and the quiet button as the tint with no edge (CALM-2)', () => {
    // Robert, 20 Nov 2026, 10:07 to 10:18 UTC: no sheen, rim or coloured shadow on the main
    // button; the quiet button has no edge, blur or shadow.
    const mainButton = blockAfter(indexCss, '@utility button-main');
    expect(mainButton).not.toContain('var(--lg-dark-sheen)');
    expect(mainButton).toContain('box-shadow: none;');
    const quietButton = blockAfter(indexCss, '@utility button-glass');
    expect(quietButton).toContain('background-color: var(--tint);');
    expect(quietButton).toContain('box-shadow: none;');
  });

  it('draws the floating bars as the website navbar island: blurred near-solid glass', () => {
    const floatingBar = blockAfter(indexCss, '@utility glass-float');
    // Lilac mist by day paints its Isabelline bar through --nav-bar-bg (CALM-1c, Robert, 26 Nov
    // 2026); every other look keeps the near-white glass of --lg-float-bg.
    expect(floatingBar).toContain('background-image: var(--nav-bar-bg, var(--lg-float-bg));');
    expect(floatingBar).toContain('backdrop-filter: var(--nav-blur);');
  });

  it('blurs nothing but the nav bars (no glass except nav bars, Robert, 23 Nov 2026)', () => {
    // Every blur in the style sheet is either none or the nav bars' own frosting.
    const blurs = [...indexCss.matchAll(/(?<!-)backdrop-filter:\s*([^;]+);/g)].map(
      (match) => match[1],
    );
    expect(blurs.filter((value) => value !== 'none' && value !== 'var(--nav-blur)')).toEqual([]);
    // Boxes never blur by day; the nav bars do.
    const dayBlock = blockAfter(tokensCss, "[data-theme='light'] {");
    expect(dayBlock).toContain('--lg-blur: none;');
    expect(dayBlock).toContain('--nav-blur: blur(24px) saturate(180%);');
    // No component asks for a blur of its own.
    expect(componentSources.filter(({ source }) => /backdrop-blur-\[/.test(source))).toEqual([]);
  });

  it('draws the coloured bands flat', () => {
    expect(indexCss).toContain('.glass-band-deep');
    expect(indexCss).toContain('.glass-band-tint');
  });

  it('draws the logo and wordmark in Revolver in the main look (LOGO-2)', () => {
    const mainLook = blockAfter(tokensCss, ':root,');
    expect(mainLook).toContain('--logo: #2a0e33;');
  });

  it('keeps the staff area flat: no blur on its bars', () => {
    const staffBar = blockAfter(indexCss, "[data-area='staff'] .glass-float");
    expect(staffBar).toContain('backdrop-filter: none;');
    expect(staffBar).toContain('background-image: none;');
  });
});
