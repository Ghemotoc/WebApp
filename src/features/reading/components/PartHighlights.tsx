/**
 * PartHighlights: underlines the words readers commented on, and lets a click on them open their
 * stanza's panel at their group (READER-SELECT; boards B13 and B14).
 *
 * The underline is painted by the browser over the real text (the CSS Custom Highlight API,
 * `::highlight(tmc-part)` in src/styles/index.css), so the writer's words are never wrapped in new
 * elements and the copy protection, the ruler and the offsets stay as they are. Three highlights:
 * - tmc-part: every part, a 2 px underline in the theme colour;
 * - tmc-part-open: the part the panel is open at, tinted;
 * - tmc-part-hover: the part the pointer is on, in the text or in the panel, tinted.
 * A browser without highlights (older Safari) shows no underline; the panel's groups and the
 * part buttons (PartButtons) still reach every part.
 * Clicking underlined words opens the panel at the first part under the pointer (board B13:
 * overlapping parts open at the first). A click that ends a selection does nothing here.
 * Who uses it: ChapterReading, fetched only when the chapter has parts. What it reads:
 * ParagraphCommentsContext. What it calls: lib/textParts.ts and openPanel.
 */
import { useContext, useEffect, useMemo } from 'react';

import { partKey, quoteOfPart } from '@/features/comments/lib/commentParts';

import type { CommentPart } from '../api/paragraphComments';
import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';
import {
  numberedParagraphOf,
  offsetInParagraph,
  rangeOfSpan,
  spanHolds,
  textPointAt,
} from '../lib/textParts';

/** The highlight names the style sheet paints. */
const UNDERLINE = 'tmc-part';
const OPEN = 'tmc-part-open';
const HOVER = 'tmc-part-hover';

/** One part with its key and its range on the page. */
interface PlacedPart {
  part: CommentPart;
  key: string;
  range: Range;
}

/**
 * Whether this browser can paint highlights.
 *
 * @returns true when CSS.highlights and Highlight exist
 */
function canHighlight(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight === 'function';
}

/**
 * Puts one highlight on the page, or takes it off when there are no ranges.
 *
 * @param name - the highlight's name
 * @param ranges - the words it covers
 */
function paint(name: string, ranges: Range[]) {
  if (ranges.length === 0) CSS.highlights.delete(name);
  else CSS.highlights.set(name, new Highlight(...ranges));
}

/**
 * The parts on the page, each with its range.
 *
 * @param parts - the chapter's parts
 * @returns the parts the page holds
 */
function placeParts(parts: CommentPart[]): PlacedPart[] {
  const root = document.querySelector('.tmc-chapter-text');
  if (root === null) return [];
  const placed: PlacedPart[] = [];
  for (const part of parts) {
    const range = rangeOfSpan(root, part);
    if (range !== null) placed.push({ part, key: partKey(quoteOfPart(part)), range });
  }
  return placed;
}

/**
 * The first part under a point of the window.
 *
 * @param placed - the parts on the page
 * @param x - the pointer's x
 * @param y - the pointer's y
 * @returns the part, or null when the point isn't on underlined words
 */
function partAt(placed: PlacedPart[], x: number, y: number): PlacedPart | null {
  // Step 1: the character under the pointer, as a paragraph and an offset in it.
  const point = textPointAt(x, y);
  const paragraph = numberedParagraphOf(point?.node ?? null);
  if (point === null || paragraph === null) return null;
  const offset = offsetInParagraph(paragraph.paragraph, point.node, point.offset);
  // Step 2: the first part holding it. The caret may land just after the last letter, so the
  // character before counts too.
  return (
    placed.find(
      (placedPart) =>
        spanHolds(placedPart.part, paragraph.block, offset) ||
        spanHolds(placedPart.part, paragraph.block, offset - 1),
    ) ?? null
  );
}

/**
 * Paints the underlines and the tints, and listens for clicks and pointing on the words.
 *
 * @returns nothing visible of its own
 */
export function PartHighlights() {
  const comments = useContext(ParagraphCommentsContext);
  const parts = comments?.counts.parts;
  const placed = useMemo(() => (parts === undefined ? [] : placeParts(parts)), [parts]);
  const openKey = comments?.panelQuote ? partKey(comments.panelQuote) : null;
  const hoverKey = comments?.hoverKey ?? null;

  // Step 1: the underline under every part, taken off when the reader leaves.
  useEffect(() => {
    if (!canHighlight()) return undefined;
    paint(
      UNDERLINE,
      placed.map((placedPart) => placedPart.range),
    );
    return () => {
      CSS.highlights.delete(UNDERLINE);
    };
  }, [placed]);

  // Step 2: the tints on the open part and the pointed-at part (board B13).
  useEffect(() => {
    if (!canHighlight()) return undefined;
    paint(
      OPEN,
      placed.filter((item) => item.key === openKey).map((item) => item.range),
    );
    paint(
      HOVER,
      placed.filter((item) => item.key === hoverKey).map((item) => item.range),
    );
    return () => {
      CSS.highlights.delete(OPEN);
      CSS.highlights.delete(HOVER);
    };
  }, [placed, openKey, hoverKey]);

  usePartPointer(placed);
  return null;
}

/**
 * Clicks and pointing on underlined words: a click opens the panel at the part, pointing tints
 * its group and shows the hand cursor.
 *
 * @param placed - the parts on the page
 */
function usePartPointer(placed: PlacedPart[]) {
  const comments = useContext(ParagraphCommentsContext);
  const openPanel = comments?.openPanel;
  const setHoverKey = comments?.setHoverKey;
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.tmc-chapter-text');
    if (root === null || placed.length === 0 || !openPanel || !setHoverKey) return undefined;
    let pointedKey: string | null = null;
    /** Opens the panel at the clicked part, unless the click ended a selection. */
    function onClick(event: MouseEvent) {
      if (!(window.getSelection()?.isCollapsed ?? true)) return;
      const hit = partAt(placed, event.clientX, event.clientY);
      if (hit !== null) openPanel?.(hit.part.block, quoteOfPart(hit.part));
    }
    /** Tints the pointed-at part's group, and shows the hand over underlined words. */
    function onMove(event: MouseEvent) {
      const key = partAt(placed, event.clientX, event.clientY)?.key ?? null;
      if (key === pointedKey) return;
      pointedKey = key;
      root?.classList.toggle('tmc-chapter-text--on-part', key !== null);
      setHoverKey?.(key);
    }
    /** Leaving the text ends the pointing. */
    function onLeave() {
      if (pointedKey === null) return;
      pointedKey = null;
      root?.classList.remove('tmc-chapter-text--on-part');
      setHoverKey?.(null);
    }
    root.addEventListener('click', onClick);
    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      root.classList.remove('tmc-chapter-text--on-part');
    };
  }, [placed, openPanel, setHoverKey]);
}
