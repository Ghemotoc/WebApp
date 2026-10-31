/**
 * SketchPadCanvas: the sheet the writer draws on (story S1-E3-11; board 4.3, "Sketch pad").
 *
 * What it shows: a white sheet with a 1 px border and 16 px corners (board values), as wide as the
 * dialog and 3:8 as tall, repainted from the strokes whenever they change. The sheet takes
 * keyboard focus (the arrows draw, see useSketchPad) and then shows where the keyboard pen is with
 * a small ring. It is an "application" region, so a screen reader passes the arrow keys through;
 * its name says what it is, its description how to draw and how many lines it holds.
 * Who uses it: DrawingInsertDialog. What it calls: paintDrawing() in lib/sketchPad.ts.
 */
import { useEffect, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SKETCH_HEIGHT,
  SKETCH_WIDTH,
  paintDrawing,
  type SketchPoint,
  type SketchStroke,
} from '../lib/sketchPad';

/** What the sheet needs. */
export interface SketchPadCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  strokes: SketchStroke[];
  keyboardPen: SketchPoint;
  pointerHandlers: {
    onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Renders the sheet.
 *
 * @returns the focusable sheet with its canvas, its keyboard-pen ring and its hint
 */
export function SketchPadCanvas(props: SketchPadCanvasProps) {
  const { canvasRef, strokes, keyboardPen } = props;
  const { t } = useTranslation('editor');
  const [hasFocus, setHasFocus] = useState(false);

  // Step 1: repaint the whole drawing whenever the strokes change (a few hundred lines at most).
  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (context === null || context === undefined) return;
    paintDrawing(context, strokes);
  }, [canvasRef, strokes]);

  // Step 2: the keyboard pen's ring, placed in percent so it follows the sheet's size.
  const ringStyle = {
    left: `${(keyboardPen.x / SKETCH_WIDTH) * 100}%`,
    top: `${(keyboardPen.y / SKETCH_HEIGHT) * 100}%`,
  };
  return (
    <div className="flex flex-col gap-1.5">
      {/* The sheet is a real control: it takes focus and the arrow keys draw on it. ARIA's
          "application" role is the one for a drawing surface (a screen reader passes the keys
          through), but the lint rule counts that role as non-interactive, so it is switched off
          here for that reason only. */}
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div
        tabIndex={0}
        role="application"
        aria-roledescription={t('drawingDialog.sheetRole')}
        aria-label={t('drawingDialog.sheetLabel')}
        aria-describedby="sketch-pad-hint sketch-pad-count"
        onKeyDown={props.onKeyDown}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        className="relative rounded-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <canvas
          ref={canvasRef}
          width={SKETCH_WIDTH}
          height={SKETCH_HEIGHT}
          aria-hidden="true"
          {...props.pointerHandlers}
          className="block aspect-[8/3] w-full cursor-crosshair touch-none rounded-[16px] border border-border bg-surface"
        />
        {hasFocus && (
          <span
            aria-hidden="true"
            style={ringStyle}
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--focus-ring)"
          />
        )}
      </div>
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <p id="sketch-pad-hint" className="m-0 text-[13px] text-meta">
        {t('drawingDialog.sheetHint')}
      </p>
      <p id="sketch-pad-count" className="sr-only" aria-live="polite">
        {t('drawingDialog.lineCount', { count: strokes.length })}
      </p>
    </div>
  );
}
