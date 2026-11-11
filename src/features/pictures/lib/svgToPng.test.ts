/**
 * Tests for svgToPng's drawing size (bundle G13b): a crest SVG is redrawn at most 1,024 px on its
 * longest side, keeping its shape. The drawing itself needs a real browser and is covered by
 * e2e/certificates.spec.ts.
 */
import { describe, expect, it } from 'vitest';

import { drawingSize } from './svgToPng';

describe('svgToPng drawing size', () => {
  it('a wide crest keeps its shape with 1,024 px across', () => {
    expect(drawingSize(200, 100)).toEqual({ width: 1024, height: 512 });
  });

  it('a tiny crest is drawn large enough to print sharply', () => {
    expect(drawingSize(16, 32)).toEqual({ width: 512, height: 1024 });
  });

  it('an SVG with no size of its own is drawn as a square', () => {
    expect(drawingSize(0, 0)).toEqual({ width: 1024, height: 1024 });
  });
});
