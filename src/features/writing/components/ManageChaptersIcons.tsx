/**
 * The arrows on a story's Chapters page, drawn as inline SVG from board D03 (story S1-E3-04,
 * user story 5.3). Plain line icons, not doodles. Each is hidden from screen readers; the button
 * around it carries the name. The plus and the "…" come from ActionIcon.
 * Who uses it: ChapterRowActions.
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

/** An arrow pointing up: "Move chapter 3 earlier" (board D03). */
export function ArrowEarlierIcon() {
  return (
    <Frame>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </Frame>
  );
}

/** An arrow pointing down: "Move chapter 3 later" (board D03). */
export function ArrowLaterIcon() {
  return (
    <Frame>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </Frame>
  );
}
