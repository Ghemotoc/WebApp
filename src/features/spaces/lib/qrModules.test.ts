/**
 * Tests for qrModules (bundle 14d IDEAS-3, part b): the class link's QR code is worked out in the
 * browser and drawn as one SVG path.
 */
import { describe, expect, it } from 'vitest';

import { qrModulesFor, qrPathFor } from './qrModules';

const link = 'https://site.example/class/ABCD-EFGH-JKLM';

describe('qrModulesFor', () => {
  it('makes a square code with the three corner finder squares', () => {
    const modules = qrModulesFor(link);
    const size = modules.length;
    expect(size).toBeGreaterThanOrEqual(21);
    expect(modules.every((row) => row.length === size)).toBe(true);
    // Each finder square's outer corner is dark: top left, top right, bottom left.
    expect(modules[0]?.[0]).toBe(true);
    expect(modules[0]?.[size - 1]).toBe(true);
    expect(modules[size - 1]?.[0]).toBe(true);
  });

  it('gives the same code for the same link', () => {
    expect(qrModulesFor(link)).toEqual(qrModulesFor(link));
  });

  it('refuses an empty link instead of drawing a code that scans as nothing', () => {
    expect(() => qrModulesFor('')).toThrow('needs some text');
  });
});

describe('qrPathFor', () => {
  it('draws one small square per dark square, moved in by the quiet zone', () => {
    const path = qrPathFor(
      [
        [true, false],
        [false, true],
      ],
      4,
    );
    expect(path).toBe('M4 4h1v1h-1zM5 5h1v1h-1z');
  });
});
