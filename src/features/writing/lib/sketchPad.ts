/**
 * The sketch pad's drawing rules, with no React in them (story S1-E3-11; board 4.3, "Sketch pad").
 *
 * A drawing is a list of strokes. Each stroke is the tool (pen or eraser), its colour and the
 * points it passed through, in the pad's own units (a 1280 × 480 sheet, twice the board's 640 ×
 * 240, so lines stay sharp on high-density screens). Undo takes the last stroke away; Clear
 * empties the list. The eraser paints in the paper's white, so the finished picture is a plain
 * PNG with a white background, ready for the picture rules of S1-E3-09.
 * Who uses it: hooks/useSketchPad.ts (the strokes and the keyboard), components/SketchPadCanvas.tsx
 * (drawing them on the canvas) and DrawingInsertDialog (the finished file).
 */

/** The sheet's size in the pad's own units. */
export const SKETCH_WIDTH = 1280;
export const SKETCH_HEIGHT = 480;

/** The paper colour, which the eraser paints with. */
export const SKETCH_PAPER = '#FFFFFF';

/** The three brand colours from the board: ink, red and blue. */
export const SKETCH_COLOURS = {
  black: '#26142E',
  red: '#8C2B3A',
  blue: '#2E4A8C',
} as const;

/** One of the pen's colours. */
export type SketchColour = keyof typeof SKETCH_COLOURS;

/** The pen draws in its colour; the eraser paints paper. */
export type SketchTool = 'pen' | 'eraser';

/** A point on the sheet. */
export interface SketchPoint {
  x: number;
  y: number;
}

/** One line drawn without lifting the pen. */
export interface SketchStroke {
  tool: SketchTool;
  colour: SketchColour;
  points: SketchPoint[];
}

/** How far one arrow key press draws, in sheet units. */
export const KEYBOARD_STEP = 24;

/** Line widths: the pen as on the board (4 at 640 wide), the eraser wider so it is easy to aim. */
const PEN_WIDTH = 8;
const ERASER_WIDTH = 40;

/**
 * Keeps a point on the sheet.
 *
 * @returns the point, moved inside the edges when it was outside
 */
export function clampToSheet(point: SketchPoint): SketchPoint {
  return {
    x: Math.min(SKETCH_WIDTH, Math.max(0, point.x)),
    y: Math.min(SKETCH_HEIGHT, Math.max(0, point.y)),
  };
}

/**
 * Turns a pointer position on the screen into a point on the sheet, whatever size the canvas is
 * drawn at (the page shrinks it on a phone).
 *
 * @param clientX - the pointer's position on the screen
 * @param clientY - the same, down
 * @param box - the canvas's box on the screen (getBoundingClientRect())
 * @returns the point on the sheet
 */
export function sheetPointFrom(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
): SketchPoint {
  if (box.width === 0 || box.height === 0) return { x: 0, y: 0 };
  return clampToSheet({
    x: ((clientX - box.left) / box.width) * SKETCH_WIDTH,
    y: ((clientY - box.top) / box.height) * SKETCH_HEIGHT,
  });
}

/** The move each arrow key makes. */
const arrowMoves: Record<string, SketchPoint> = {
  ArrowUp: { x: 0, y: -KEYBOARD_STEP },
  ArrowDown: { x: 0, y: KEYBOARD_STEP },
  ArrowLeft: { x: -KEYBOARD_STEP, y: 0 },
  ArrowRight: { x: KEYBOARD_STEP, y: 0 },
};

/**
 * Where an arrow key takes the keyboard pen (the button-free way to draw, DoD: dragging has an
 * alternative).
 *
 * @param key - the KeyboardEvent key
 * @param from - where the keyboard pen is now
 * @returns the new place, or null when the key isn't an arrow
 */
export function keyboardMove(key: string, from: SketchPoint): SketchPoint | null {
  const move = arrowMoves[key];
  if (move === undefined) return null;
  return clampToSheet({ x: from.x + move.x, y: from.y + move.y });
}

/**
 * Draws one stroke. A stroke with one point is a dot.
 *
 * @param context - the canvas's 2D context, already scaled to sheet units
 * @param stroke - the stroke
 */
function drawStroke(context: CanvasRenderingContext2D, stroke: SketchStroke) {
  const [first, ...rest] = stroke.points;
  if (first === undefined) return;
  context.strokeStyle = stroke.tool === 'eraser' ? SKETCH_PAPER : SKETCH_COLOURS[stroke.colour];
  context.lineWidth = stroke.tool === 'eraser' ? ERASER_WIDTH : PEN_WIDTH;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(first.x, first.y);
  // A single point still shows: a line of zero length with round ends is a dot.
  if (rest.length === 0) context.lineTo(first.x, first.y);
  for (const point of rest) context.lineTo(point.x, point.y);
  context.stroke();
}

/**
 * Paints the whole drawing: paper first, then every stroke in order.
 *
 * @param context - the canvas's 2D context, in sheet units
 * @param strokes - the drawing
 */
export function paintDrawing(context: CanvasRenderingContext2D, strokes: SketchStroke[]) {
  context.fillStyle = SKETCH_PAPER;
  context.fillRect(0, 0, SKETCH_WIDTH, SKETCH_HEIGHT);
  for (const stroke of strokes) drawStroke(context, stroke);
}

/**
 * Whether the drawing has any ink left on it (an eraser-only drawing has none).
 *
 * @returns true when at least one pen stroke exists
 */
export function hasInk(strokes: SketchStroke[]): boolean {
  return strokes.some((stroke) => stroke.tool === 'pen' && stroke.points.length > 0);
}
