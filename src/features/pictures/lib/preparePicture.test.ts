/**
 * Preparing a picture before upload: the size and type rules (story S1-E3-09 criterion 2). The
 * redrawing itself needs a real browser and is covered by e2e/chapter-pictures.spec.ts.
 */
import { describe, expect, it } from 'vitest';

import { endingForPreparedType, fallbackTypeFor, fittedSize } from './preparePicture';

describe('preparePicture rules', () => {
  it('makes a big picture smaller on its longest side and keeps its shape', () => {
    expect(fittedSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fittedSize(1000, 5000, 1600)).toEqual({ width: 320, height: 1600 });
  });

  it('never makes a small picture bigger', () => {
    expect(fittedSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fittedSize(1, 1, 1600)).toEqual({ width: 1, height: 1 });
  });

  it('falls back to PNG for a PNG, so transparency stays, and JPEG for the rest', () => {
    expect(fallbackTypeFor('image/png')).toBe('image/png');
    expect(fallbackTypeFor('image/jpeg')).toBe('image/jpeg');
    expect(fallbackTypeFor('image/webp')).toBe('image/jpeg');
  });

  it('names the file after its new type', () => {
    expect(endingForPreparedType('image/webp')).toBe('webp');
    expect(endingForPreparedType('image/png')).toBe('png');
    expect(endingForPreparedType('image/jpeg')).toBe('jpg');
  });
});
