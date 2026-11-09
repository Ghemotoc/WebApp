/**
 * The reader's icons, drawn as inline SVG from board 3.5 (story S1-E4-01a). Plain icons, not
 * doodles: the reader has no doodles at all (DoD design rules), and arrows are plain icons
 * anyway. Each is hidden from screen readers; the link around it carries the name.
 * Who uses it: ChapterBar, ChapterEnd, LikeButton and the reading settings (S1-E4-02).
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
      focusable="false"
      {...props}
    />
  );
}

/** A bulleted list: "Contents". */
export function ContentsIcon() {
  return (
    <Frame strokeWidth="1.9">
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </Frame>
  );
}

/** An arrow head pointing back. */
export function BackIcon() {
  return (
    <Frame>
      <path d="m15 18-6-6 6-6" />
    </Frame>
  );
}

/** An arrow head pointing forward. */
export function ForwardIcon() {
  return (
    <Frame>
      <path d="m9 18 6-6-6-6" />
    </Frame>
  );
}

/** A heart: the Like button (S1-E6-03). Filled once the reader likes the chapter. */
export function HeartIcon({ isFilled }: { isFilled: boolean }) {
  return (
    <Frame strokeWidth="1.9" fill={isFilled ? 'currentColor' : 'none'}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Frame>
  );
}

/** A cross: "Close reading settings". */
export function CloseIcon() {
  return (
    <Frame>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Frame>
  );
}
