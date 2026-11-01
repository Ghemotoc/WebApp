/**
 * ReadingRuler: a soft tinted band over the line being read (bundle IDEAS-1, part a; idea
 * IDEA-20261031-8: "a known help for focus and dyslexia").
 *
 * How it works:
 * - The band sits behind the text, inside the chapter's page box, so it never hides a letter;
 *   the box keeps its own stacking (isolate), so the band paints over the page's colour and
 *   under the words.
 * - Moving the pointer over the text puts the band on the line under it. The Up and Down arrow
 *   keys move it one line at a time and scroll the page to keep it in view, while nothing that
 *   types (a field, the panel) has focus.
 * - It is aria-hidden and takes no clicks or focus, so a screen reader reads the chapter exactly
 *   as before (the idea's second criterion).
 * - The lines are measured from the browser's boxes for the text and again whenever the box
 *   changes size (a new text size, line spacing or width, or a turned phone).
 * Who uses it: ChapterReaderPage's text block, loaded only for a reader who turned it on.
 * What it calls: lib/rulerLines.ts.
 */
import { useEffect, useState, type RefObject } from 'react';

import { lineAt, linesFromBoxes, stepLine, type RulerLine } from '../lib/rulerLines';

/** How much room the band leaves above and below the line, in px. */
const bandPadding = 3;
/** How close to the window's edge the band may come before the page scrolls, in px. */
const scrollMargin = 96;

/**
 * The boxes the browser draws for the words themselves, one or more per line.
 *
 * Only text counts: a whole paragraph's box, a picture or a button beside a paragraph (the
 * comment marker) would otherwise join several lines into one tall band.
 *
 * @param text - the chapter's text
 * @returns the boxes, in window coordinates
 */
function textBoxes(text: Element): DOMRect[] {
  const boxes: DOMRect[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    // Step 1: skip text inside a control or a part screen readers skip (a marker, a count).
    const parent = node.parentElement;
    if (parent === null || parent.closest('button, [aria-hidden="true"]') !== null) continue;
    // Step 2: one box per line the text runs across.
    range.selectNodeContents(node);
    boxes.push(...Array.from(range.getClientRects()));
  }
  return boxes;
}

/**
 * Measures the text's lines, from the top of the box.
 *
 * @param boxRef - the chapter's page box
 * @returns the lines, measured again when the box changes size
 */
function useRulerLines(boxRef: RefObject<HTMLElement | null>): RulerLine[] {
  const [lines, setLines] = useState<RulerLine[]>([]);
  useEffect(() => {
    const box = boxRef.current;
    const text = box?.querySelector('.tmc-chapter-text');
    if (box === null || box === undefined || text === null || text === undefined) return;
    const measure = () => {
      const top = box.getBoundingClientRect().top;
      const boxes = textBoxes(text).map((rect) => ({
        top: rect.top - top,
        bottom: rect.bottom - top,
      }));
      setLines(linesFromBoxes(boxes));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [boxRef]);
  return lines;
}

/**
 * Puts the band on the line under the pointer.
 *
 * @param boxRef - the chapter's page box
 * @param lines - the text's lines
 * @param setLine - moves the band
 */
function usePointerLine(
  boxRef: RefObject<HTMLElement | null>,
  lines: RulerLine[],
  setLine: (index: number | null) => void,
) {
  useEffect(() => {
    const box = boxRef.current;
    if (box === null) return;
    const follow = (event: PointerEvent) => {
      setLine(lineAt(lines, event.clientY - box.getBoundingClientRect().top));
    };
    box.addEventListener('pointermove', follow);
    return () => box.removeEventListener('pointermove', follow);
  }, [boxRef, lines, setLine]);
}

/**
 * Whether a key press belongs to something else: a field, a button group or an open panel.
 *
 * @param target - where the key was pressed
 * @returns true when the ruler should leave the key alone
 */
function isOwnedElsewhere(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target.closest('input, textarea, select, [role="dialog"], section[aria-labelledby]') !== null
  );
}

/**
 * Keeps a line in view by scrolling the page when it nears the window's edge.
 *
 * @param box - the chapter's page box
 * @param line - the line the band is on
 */
function keepInView(box: HTMLElement, line: RulerLine) {
  const top = box.getBoundingClientRect().top;
  if (top + line.bottom > window.innerHeight - scrollMargin) {
    window.scrollBy({ top: top + line.bottom - (window.innerHeight - scrollMargin) });
  } else if (top + line.top < scrollMargin) {
    window.scrollBy({ top: top + line.top - scrollMargin });
  }
}

/**
 * Which way an arrow key moves the band.
 *
 * @param event - the key press
 * @returns 1 for Down, -1 for Up, or null for any other key or with a modifier held
 */
function arrowStep(event: KeyboardEvent): 1 | -1 | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (event.key === 'ArrowDown') return 1;
  if (event.key === 'ArrowUp') return -1;
  return null;
}

/**
 * The line an arrow key takes the band to.
 *
 * @param box - the chapter's page box
 * @param lines - the text's lines
 * @param current - the band's line, or null before it has one
 * @param step - which way
 * @returns the new line; before the band has one, the first line in the window
 */
function lineAfterKey(box: HTMLElement, lines: RulerLine[], current: number | null, step: 1 | -1) {
  if (current === null) return lineAt(lines, scrollMargin - box.getBoundingClientRect().top) ?? 0;
  return stepLine(current, step, lines.length);
}

/**
 * Moves the band one line with the Up and Down arrow keys.
 *
 * @param boxRef - the chapter's page box
 * @param lines - the text's lines
 * @param current - the line the band is on, or null before it has one
 * @param setLine - moves the band
 */
function useArrowKeys(
  boxRef: RefObject<HTMLElement | null>,
  lines: RulerLine[],
  current: number | null,
  setLine: (index: number | null) => void,
) {
  useEffect(() => {
    const move = (event: KeyboardEvent) => {
      // Step 1: only the plain Up and Down keys, while nothing that types has focus.
      const box = boxRef.current;
      const step = arrowStep(event);
      if (box === null || step === null || lines.length === 0) return;
      if (isOwnedElsewhere(event.target)) return;
      // Step 2: move the band and keep it in view, instead of scrolling the page by a step.
      event.preventDefault();
      const next = lineAfterKey(box, lines, current, step);
      setLine(next);
      const nextLine = lines[next];
      if (nextLine !== undefined) keepInView(box, nextLine);
    };
    document.addEventListener('keydown', move);
    return () => document.removeEventListener('keydown', move);
  }, [boxRef, lines, current, setLine]);
}

/**
 * Renders the band.
 *
 * @param props.boxRef - the chapter's page box, which the band sits inside
 * @returns the band, or nothing until it has a line
 */
export function ReadingRuler({ boxRef }: { boxRef: RefObject<HTMLElement | null> }) {
  const lines = useRulerLines(boxRef);
  const [current, setCurrent] = useState<number | null>(null);
  usePointerLine(boxRef, lines, setCurrent);
  useArrowKeys(boxRef, lines, current, setCurrent);
  const line = current === null ? undefined : lines[current];
  if (line === undefined) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="reading-ruler"
      className="tmc-reading-ruler"
      style={{ top: line.top - bandPadding, height: line.bottom - line.top + bandPadding * 2 }}
    />
  );
}
