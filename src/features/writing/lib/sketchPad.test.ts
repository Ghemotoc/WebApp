/**
 * The sketch pad's drawing rules (story S1-E3-11).
 */
import { describe, expect, it } from 'vitest';

import {
  KEYBOARD_STEP,
  SKETCH_HEIGHT,
  SKETCH_WIDTH,
  hasInk,
  keyboardMove,
  sheetPointFrom,
} from './sketchPad';

describe('the sketch pad', () => {
  it('maps a pointer on a shrunken canvas to the full sheet and keeps it on the sheet', () => {
    const box = { left: 10, top: 20, width: 320, height: 120 };
    expect(sheetPointFrom(170, 80, box)).toEqual({ x: SKETCH_WIDTH / 2, y: SKETCH_HEIGHT / 2 });
    expect(sheetPointFrom(-50, 500, box)).toEqual({ x: 0, y: SKETCH_HEIGHT });
    expect(sheetPointFrom(5, 5, { ...box, width: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('moves the keyboard pen one step per arrow and stops at the edge', () => {
    expect(keyboardMove('ArrowRight', { x: 100, y: 100 })).toEqual({
      x: 100 + KEYBOARD_STEP,
      y: 100,
    });
    expect(keyboardMove('ArrowUp', { x: 100, y: 5 })).toEqual({ x: 100, y: 0 });
    expect(keyboardMove('Enter', { x: 100, y: 100 })).toBeNull();
  });

  it('counts only pen strokes as ink, so an eraser-only sheet is still empty', () => {
    expect(hasInk([])).toBe(false);
    expect(hasInk([{ tool: 'eraser', colour: 'black', points: [{ x: 1, y: 1 }] }])).toBe(false);
    expect(hasInk([{ tool: 'pen', colour: 'red', points: [{ x: 1, y: 1 }] }])).toBe(true);
  });
});
