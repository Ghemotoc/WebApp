// @vitest-environment jsdom
/**
 * brand-files: guards the bundled logo files in public/brand (bundle LOGO-2).
 *
 * The in-app logo is drawn by using emblem-light.svg as a CSS mask, and the tab icon is the file
 * itself. A browser draws nothing at all from an SVG that isn't well-formed XML (for example a
 * comment holding two hyphens in a row), so this reads each file and checks it parses, keeps
 * its colour and stays small.
 * Who runs it: Vitest (npm test). What it reads: public/brand/*.svg.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/** Reads one file from public/brand (Vitest runs from the repository root). */
function readBrandFile(name: string): string {
  return readFileSync(join(process.cwd(), 'public', 'brand', name), 'utf8');
}

/** Each bundled emblem and the colour Robert gave it (11 Nov 2026). */
const emblems = [
  { file: 'emblem-light.svg', colour: '#2A0E33' },
  { file: 'emblem-dark.svg', colour: '#EBEBEB' },
  { file: 'emblem-stamp.svg', colour: '#000000' },
];

describe('the bundled logo files (LOGO-2)', () => {
  it.each(emblems)('$file is well-formed SVG in its colour and under 10 kB', ({ file, colour }) => {
    const text = readBrandFile(file);
    // Step 1: a comment may not hold "--" inside it, or the whole file is broken XML.
    const comments = text.match(/<!--([\s\S]*?)-->/g) ?? [];
    for (const comment of comments) expect(comment.slice(4, -3)).not.toContain('--');
    // Step 2: it parses as an SVG document.
    const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.nodeName).toBe('svg');
    // Step 3: one traced path in the right colour, small enough for every page load.
    expect(text).toContain(`fill="${colour}"`);
    expect(text.length).toBeLessThan(10_000);
  });
});
