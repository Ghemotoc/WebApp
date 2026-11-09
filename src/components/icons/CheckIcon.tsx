/**
 * CheckIcon: a tick, drawn as an inline SVG (story S1-E1-03).
 * Used by: selected chips. Plain icons are allowed for arrows, ticks and form fields (DoD design rules);
 * everything else uses the line icons (ActionIcon, NavIcon). Decorative: hidden from screen readers, so the
 * control around it must have its own accessible name.
 */
import type { SVGProps } from 'react';

/**
 * Draws the icon at the size given (default 14 px) in the current text colour.
 *
 * @param props.size - width and height in pixels
 * @returns the SVG element
 */
export function CheckIcon({ size = 14, ...svgProps }: SVGProps<SVGSVGElement> & { size?: number }) {
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
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
