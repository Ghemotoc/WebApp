/**
 * The reader's icons, drawn as inline SVG from board 3.5 (story S1-E4-01a). Plain icons, not
 * doodles: the reader has no doodles at all (DoD design rules), and arrows are plain icons
 * anyway. Each is hidden from screen readers; the link around it carries the name.
 * Who uses it: ChapterBar, ChapterEnd, ChapterNavigation, LikeButton, the paragraph comments and
 * the reading settings (S1-E4-02; CALM-5).
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

/** A full arrow pointing back: the chapter bar's Back (CALM-5, design system FocusBar). */
export function BackArrowIcon() {
  return (
    <Frame>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Frame>
  );
}

/** A full arrow pointing on: "Next chapter" and "Next: chapter 15" (CALM-5). */
export function ForwardArrowIcon() {
  return (
    <Frame width="16" height="16">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Frame>
  );
}

/** The comment mark: a speech bubble (CALM-5, design system ParagraphComments). */
export function CommentIcon({ size = 16 }: { size?: number }) {
  return (
    <Frame width={size} height={size}>
      <path d="M4 5h16v11H9l-5 4z" />
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
