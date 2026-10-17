/**
 * ChevronDownIcon: a drop-down, drawn as an inline SVG (story S1-E1-03).
 * Used by: drop-downs (Select). Plain icons are allowed for arrows, ticks and form fields (DoD design rules);
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
export function ChevronDownIcon({
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
