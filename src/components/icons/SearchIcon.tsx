/**
 * SearchIcon: a magnifying glass, drawn as an inline SVG (story S1-E1-03).
 * Used by: SearchInput. A form-field icon, so a plain icon is allowed (DoD design rules).
 * Decorative: hidden from screen readers; the search field has its own label.
 */
import type { SVGProps } from 'react';

/**
 * Draws the icon at the size given (default 20 px) in the current text colour.
 *
 * @param props.size - width and height in pixels
 * @returns the SVG element
 */
export function SearchIcon({
  size = 20,
  ...svgProps
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...svgProps}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
