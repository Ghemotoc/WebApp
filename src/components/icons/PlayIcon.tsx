/**
 * PlayIcon: a "play" sign (a triangle), drawn as an inline SVG (story S1-E5-10).
 * Used by: the Featured this week band's pause button on Discover. Plain icons are allowed for
 * anything under 18 px (DoD design rules). Decorative: hidden from screen readers, so the button
 * around it must have its own accessible name.
 */
import type { SVGProps } from 'react';

/**
 * Draws the icon at the size given (default 14 px), filled in the current text colour.
 *
 * @param props.size - width and height in pixels
 * @returns the SVG element
 */
export function PlayIcon({ size = 14, ...svgProps }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...svgProps}
    >
      <path d="M7 4v16l13-8z" />
    </svg>
  );
}
