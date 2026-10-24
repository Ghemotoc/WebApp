/**
 * Tests for the doodles on /design (Lane B, "Design: doodles take their colours from the tokens",
 * 23 Oct 2026). Proves: the three sample doodles render in a light panel and a night panel, every
 * colour in them is a --doodle-* token that resolves in both themes, the fallback is the light
 * value, and night resolves to a different colour. jsdom can't resolve CSS variables itself, so
 * the test resolves each var() against the real tokens.css; e2e/doodles.spec.ts does the same in
 * a browser.
 */
// The app's tsconfig has no Node types (browser code); this test reads a file, so it asks for them.
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DoodleSection } from './DoodleSection';

// Read from disk, as scripts/token-contrast.test.ts does: a `?raw` import would hand us the file
// after Tailwind's Vite plugin rewrote it (quotes dropped, blocks merged), not the file itself.
// Vitest runs from the repository root; in jsdom import.meta.url isn't a file URL, so the path
// starts from the working directory.
const tokensCss = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');

/**
 * Reads the --doodle-* tokens of one theme from tokens.css.
 *
 * @param theme - 'light' or 'night'
 * @returns token name → hex colour
 */
function readDoodleTokens(theme: 'light' | 'night'): Map<string, string> {
  const blockOpening = new RegExp(`\\[data-theme=['"]${theme}['"]\\]\\s*\\{`);
  const startIndex = tokensCss.search(blockOpening);
  const block = tokensCss.slice(startIndex, tokensCss.indexOf('\n}', startIndex));
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/--(doodle-[a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (match[1] !== undefined && match[2] !== undefined) tokens.set(match[1], match[2]);
  }
  return tokens;
}

/** One colour reference found in a drawn doodle. */
interface ColourReference {
  token: string;
  fallback: string;
}

/**
 * Lists every var(--doodle-…, #hex) reference inside a panel's drawings.
 *
 * @param panel - the element that carries data-theme
 * @returns the references, in document order
 */
function colourReferences(panel: HTMLElement): ColourReference[] {
  const references: ColourReference[] = [];
  for (const element of panel.querySelectorAll<SVGElement>('svg [style]')) {
    const style = element.getAttribute('style') ?? '';
    for (const match of style.matchAll(/var\(--(doodle-[a-z-]+),\s*(#[0-9a-f]{6})\)/g)) {
      if (match[1] !== undefined && match[2] !== undefined) {
        references.push({ token: match[1], fallback: match[2] });
      }
    }
  }
  return references;
}

const lightTokens = readDoodleTokens('light');
const nightTokens = readDoodleTokens('night');

describe('the doodles on /design', () => {
  it('shows the three sample doodles in a light panel and a night panel', () => {
    render(<DoodleSection />);

    expect(
      within(screen.getByTestId('doodle-samples-light')).getAllByRole('listitem'),
    ).toHaveLength(3);
    expect(
      within(screen.getByTestId('doodle-samples-night')).getAllByRole('listitem'),
    ).toHaveLength(3);
  });

  it('loads the full sheet of 98 doodles only when asked, without the cover backgrounds', async () => {
    render(<DoodleSection />);
    expect(screen.queryByTestId('doodle-sheet')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'doodles.showAll' }));

    const sheet = await screen.findByTestId('doodle-sheet');
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(98);
  });

  it('hides each drawing from screen readers and names it once, in the caption', () => {
    render(<DoodleSection />);
    const [firstTile] = within(screen.getByTestId('doodle-samples-light')).getAllByRole('listitem');

    expect(firstTile?.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    expect(firstTile).toHaveTextContent('peeking cat');
  });

  for (const theme of ['light', 'night'] as const) {
    it(`every colour in the ${theme} panel resolves to a ${theme} doodle token`, () => {
      render(<DoodleSection />);
      const tokens = theme === 'light' ? lightTokens : nightTokens;
      const references = colourReferences(screen.getByTestId(`doodle-samples-${theme}`));

      expect(references.length).toBeGreaterThan(0);
      for (const reference of references) {
        expect(tokens.get(reference.token)).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  }

  it('keeps the light value as the fallback and draws a different colour at night', () => {
    render(<DoodleSection />);
    const references = colourReferences(screen.getByTestId('doodle-samples-light'));

    for (const reference of references) {
      expect(reference.fallback).toBe(lightTokens.get(reference.token));
      expect(nightTokens.get(reference.token)).not.toBe(lightTokens.get(reference.token));
    }
  });
});
