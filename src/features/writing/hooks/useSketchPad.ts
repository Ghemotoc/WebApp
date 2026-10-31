/**
 * useSketchPad: the sketch pad's state (story S1-E3-11; board 4.3).
 *
 * It holds the strokes, the chosen tool and colour, and the keyboard pen's place. A pointer
 * (mouse, finger or stylus) draws a stroke while it is pressed; an arrow key draws one step from
 * the keyboard pen's place, and Shift with an arrow moves it without drawing (DoD: dragging has an
 * alternative). Undo takes the last stroke away and Clear empties the sheet.
 * Who uses it: DrawingInsertDialog, which hands the parts to SketchTools and SketchPadCanvas.
 * What it calls: lib/sketchPad.ts.
 */
import {
  useState,
  type Dispatch,
  type KeyboardEvent,
  type PointerEvent,
  type SetStateAction,
} from 'react';

import {
  SKETCH_HEIGHT,
  SKETCH_WIDTH,
  keyboardMove,
  sheetPointFrom,
  type SketchColour,
  type SketchPoint,
  type SketchStroke,
  type SketchTool,
} from '../lib/sketchPad';

/** The middle of the sheet, where the keyboard pen starts. */
const sheetCentre: SketchPoint = { x: SKETCH_WIDTH / 2, y: SKETCH_HEIGHT / 2 };

/** What a new stroke is drawn with. */
interface Brush {
  tool: SketchTool;
  colour: SketchColour;
}

/** Changes the strokes. */
type SetStrokes = Dispatch<SetStateAction<SketchStroke[]>>;

/**
 * Drawing with a pointer: press starts a stroke, moving extends it, lifting ends it.
 *
 * @returns the pointer handlers for the canvas
 */
function usePointerDrawing(brush: Brush, setStrokes: SetStrokes) {
  const [isDrawing, setIsDrawing] = useState(false);

  /** A pointer pressed on the sheet: a new stroke starts there. */
  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const box = event.currentTarget.getBoundingClientRect();
    const point = sheetPointFrom(event.clientX, event.clientY, box);
    setStrokes((current) => [...current, { ...brush, points: [point] }]);
    setIsDrawing(true);
  }

  /** A pressed pointer moving: the last stroke follows it. */
  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const box = event.currentTarget.getBoundingClientRect();
    const point = sheetPointFrom(event.clientX, event.clientY, box);
    setStrokes((current) => {
      const last = current.at(-1);
      if (last === undefined) return current;
      return [...current.slice(0, -1), { ...last, points: [...last.points, point] }];
    });
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: () => setIsDrawing(false),
    onPointerCancel: () => setIsDrawing(false),
  };
}

/**
 * Drawing with the keyboard: an arrow draws one step, Shift with an arrow only moves.
 *
 * @returns the keyboard pen's place, its key handler and a way to put it back in the middle
 */
function useKeyboardDrawing(brush: Brush, setStrokes: SetStrokes) {
  const [keyboardPen, setKeyboardPen] = useState<SketchPoint>(sheetCentre);

  /** An arrow key: draw one step (or, with Shift, only move the keyboard pen). */
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const next = keyboardMove(event.key, keyboardPen);
    if (next === null) return;
    // The arrows draw here instead of scrolling the dialog.
    event.preventDefault();
    if (!event.shiftKey) {
      setStrokes((current) => [...current, { ...brush, points: [keyboardPen, next] }]);
    }
    setKeyboardPen(next);
  }

  return { keyboardPen, onKeyDown, recentre: () => setKeyboardPen(sheetCentre) };
}

/**
 * The pad's state and what changes it.
 *
 * @returns the strokes, the tool, the colour, the keyboard pen and the handlers for the sheet
 */
export function useSketchPad() {
  const [strokes, setStrokes] = useState<SketchStroke[]>([]);
  const [tool, setTool] = useState<SketchTool>('pen');
  const [colour, setColour] = useState<SketchColour>('black');
  const pointerHandlers = usePointerDrawing({ tool, colour }, setStrokes);
  const keyboard = useKeyboardDrawing({ tool, colour }, setStrokes);
  return {
    strokes,
    tool,
    setTool,
    colour,
    setColour,
    keyboardPen: keyboard.keyboardPen,
    pointerHandlers,
    onKeyDown: keyboard.onKeyDown,
    undo: () => setStrokes((current) => current.slice(0, -1)),
    clear: () => setStrokes([]),
    reset: () => {
      setStrokes([]);
      setTool('pen');
      setColour('black');
      keyboard.recentre();
    },
  };
}
