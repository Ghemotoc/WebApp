/**
 * The toolbar's icons, drawn as inline SVG from board 4.3 (story S1-E3-02a): 18 px line icons,
 * like the rest of the app's icons. Each is hidden from screen readers; the button carries the name.
 * Who uses it: EditorToolbar.
 */
import type { SVGProps } from 'react';

/** The shared frame: 18 px, stroked in the current colour. */
function Frame(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

/** A bold "B". */
export function BoldIcon() {
  return (
    <Frame>
      <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
    </Frame>
  );
}

/** A slanted "I". */
export function ItalicIcon() {
  return (
    <Frame strokeWidth="1.9">
      <line x1="19" x2="10" y1="4" y2="4" />
      <line x1="14" x2="5" y1="20" y2="20" />
      <line x1="15" x2="9" y1="4" y2="20" />
    </Frame>
  );
}

/** An "H" with a small 2. */
export function HeadingIcon() {
  return (
    <Frame>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17 10a2 2 0 0 1 4 0c0 1.5-2 2.5-4 5h4" />
    </Frame>
  );
}

/** Quotation marks. */
export function QuoteIcon() {
  return (
    <Frame>
      <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
      <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
    </Frame>
  );
}

/** Three lines with dots. */
export function ListIcon() {
  return (
    <Frame>
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </Frame>
  );
}

/** Two chain links. */
export function LinkIcon() {
  return (
    <Frame>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Frame>
  );
}

/**
 * Four small diamonds set as a larger diamond: the scene break, drawn the same way in the
 * chapter text (the .tmc-chapter-text hr rule in src/styles/index.css; liquid glass
 * ChapterEditor board, G9e).
 */
export function SceneBreakIcon() {
  return (
    <Frame fill="currentColor" stroke="none">
      <path d="M12 4.2 14.4 6.6 12 9 9.6 6.6Z" />
      <path d="M8.6 9.6 11 12 8.6 14.4 6.2 12Z" />
      <path d="M15.4 9.6 17.8 12 15.4 14.4 13 12Z" />
      <path d="M12 15 14.4 17.4 12 19.8 9.6 17.4Z" />
    </Frame>
  );
}
