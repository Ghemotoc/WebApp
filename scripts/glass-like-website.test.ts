/**
 * glass-like-website: guards the liquid glass that GLASS-2 copied from the main website
 * (Robert, 11 Nov 2026: "check the Engage Grow Hub and replicate").
 *
 * It reads the two style files as text and checks the rules a later change could quietly drop:
 * the main look's deep plum action buttons with cream text, a lighter hover and press colour in
 * every look, the floating bars and cards as blurred glass, the coloured bands as glass, and the
 * staff area kept flat. Colour contrast itself is tested in token-contrast.test.ts.
 * Who runs it: Vitest (npm test). What it reads: src/styles/tokens.css and src/styles/index.css.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** Reads one style file next to this script's folder. */
function readStyles(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../src/styles/${name}`, import.meta.url)), 'utf8');
}

const tokensCss = readStyles('tokens.css');
const indexCss = readStyles('index.css');

/** The text of the first block whose selector list starts with the given text. */
function blockAfter(css: string, selectorStart: string): string {
  const start = css.indexOf(selectorStart);
  if (start === -1) throw new Error(`No block starts with ${selectorStart}`);
  return css.slice(start, css.indexOf('}', start));
}

describe('the main website glass on this app (GLASS-2)', () => {
  it("gives the main look's action buttons the website's deep plum and cream text", () => {
    const mainLook = blockAfter(tokensCss, ':root,');
    expect(mainLook).toContain('--plum-from: #2a0e33;');
    expect(mainLook).toContain('--plum-to: #2a0e33;');
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
    const mainButton = blockAfter(indexCss, '@utility button-main');
    expect(indexCss).toContain("&[aria-current='page']");
    expect(indexCss).toContain('var(--plum-hover-from), var(--plum-hover-to)');
    expect(mainButton).toContain('var(--lg-dark-sheen)');
  });

  it('draws the floating bars as the website navbar island: blurred near-solid glass', () => {
    const floatingBar = blockAfter(indexCss, '@utility glass-float');
    expect(floatingBar).toContain('background-image: var(--lg-float-bg);');
    expect(floatingBar).toContain('backdrop-filter: var(--lg-blur);');
  });

  it('draws member cards and the coloured bands as glass', () => {
    expect(indexCss).toContain('background-image: var(--lg-card-bg);');
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
