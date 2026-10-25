/**
 * ArrowDownIcon: a downward arrow, drawn as an inline SVG (story S1-E6-04; board 3.5).
 * Used by: the comment's private Downvote chip (S1-E6-04). Plain icons are allowed for arrows, ticks and form fields (DoD design rules);
 * everything else uses the doodle icon set. Decorative: hidden from screen readers, so the
 * control around it must have its own accessible name.
 */
import type { SVGProps } from 'react';

/**
 * Draws the icon at the size given (default 14 px) in the current text colour.
 *
 * @param props.size - width and height in pixels
 * @returns the SVG element
 */
export function ArrowDownIcon({
  size = 14,
  ...svgProps
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...svgProps}
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
