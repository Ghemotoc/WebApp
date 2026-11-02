/**
 * Tests for the animated picture check (story S1-E8-08 criterion 1: animated images are refused).
 * The files are built here byte by byte, the smallest shape each format needs.
 */
import { describe, expect, it } from 'vitest';

import { isAnimatedPicture } from './animated-picture';

/** A PNG chunk: its length, name, data and a checksum (not checked here, so zeros). */
function pngChunk(name: string, data: number[] = []): number[] {
  const length = [0, 0, 0, data.length];
  return [...length, ...[...name].map((letter) => letter.charCodeAt(0)), ...data, 0, 0, 0, 0];
}

/** A PNG made of the given chunks. */
function png(...chunks: number[][]): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunks.flat()]);
}

/** A WebP chunk: its name, its little-endian length and the data. */
function webpChunk(name: string, data: number[]): number[] {
  return [...[...name].map((letter) => letter.charCodeAt(0)), data.length, 0, 0, 0, ...data];
}

/** A WebP made of the given chunks. */
function webp(...chunks: number[][]): Uint8Array {
  const letters = (text: string) => [...text].map((letter) => letter.charCodeAt(0));
  return new Uint8Array([...letters('RIFF'), 0, 0, 0, 0, ...letters('WEBP'), ...chunks.flat()]);
}

describe('isAnimatedPicture', () => {
  it('a still PNG is a still', () => {
    expect(
      isAnimatedPicture(
        png(pngChunk('IHDR', Array(13).fill(0)), pngChunk('IDAT', [1]), pngChunk('IEND')),
      ),
    ).toBe(false);
  });

  it('a PNG with an animation control chunk before its image data moves', () => {
    expect(
      isAnimatedPicture(
        png(
          pngChunk('IHDR', Array(13).fill(0)),
          pngChunk('acTL', Array(8).fill(0)),
          pngChunk('IDAT', [1]),
        ),
      ),
    ).toBe(true);
  });

  it('a still WebP is a still', () => {
    expect(isAnimatedPicture(webp(webpChunk('VP8 ', [1, 2, 3, 4])))).toBe(false);
    expect(isAnimatedPicture(webp(webpChunk('VP8X', [0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0])))).toBe(
      false,
    );
  });

  it('a WebP whose header says it moves, or with an animation chunk, moves', () => {
    expect(isAnimatedPicture(webp(webpChunk('VP8X', [0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0])))).toBe(
      true,
    );
    expect(isAnimatedPicture(webp(webpChunk('ANIM', [0, 0, 0, 0, 0, 0])))).toBe(true);
  });

  it('a JPEG or a broken file is never taken for a moving picture', () => {
    expect(isAnimatedPicture(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
    expect(isAnimatedPicture(new Uint8Array([]))).toBe(false);
  });
});
