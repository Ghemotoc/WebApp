/**
 * The icons on Manage chapters, drawn as inline SVG from board 4.4 (story S1-E3-04). Plain
 * icons, not doodles: the DoD keeps arrows, plus and small handles under 18 px out of the doodle
 * set. Each is hidden from screen readers; the button around it carries the name.
 * Who uses it: ManageChaptersPage, ManagedChapterRow and ChapterRowActions.
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

/** Six dots: the drag handle. */
export function GripIcon() {
  return (
    <Frame strokeWidth="2.4">
      <path d="M9 5h.01" />
      <path d="M9 12h.01" />
      <path d="M9 19h.01" />
      <path d="M15 5h.01" />
      <path d="M15 12h.01" />
      <path d="M15 19h.01" />
    </Frame>
  );
}

/** An arrow head pointing up: "Move up". */
export function ChevronUpIcon() {
  return (
    <Frame>
      <path d="m18 15-6-6-6 6" />
    </Frame>
  );
}

/** An arrow head pointing down: "Move down". */
export function ChevronDownIcon() {
  return (
    <Frame>
      <path d="m6 9 6 6 6-6" />
    </Frame>
  );
}

/** A plus: "New chapter". */
export function PlusIcon() {
  return (
    <Frame>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Frame>
  );
}
