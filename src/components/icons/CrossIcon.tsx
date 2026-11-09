/**
 * CrossIcon: an ×, drawn as an inline SVG (bundle ADMIN-2, part e1b).
 * Used by: the Reject button on Moderation › Pictures to check. Plain icons are allowed for close
 * and status marks (DoD design rules); everything else uses the line icons (ActionIcon, NavIcon). Decorative:
 * hidden from screen readers, so the control around it must have its own accessible name.
 */
import type { SVGProps } from 'react';

/**
 * Draws the icon at the size given (default 14 px) in the current text colour.
 *
 * @param props.size - width and height in pixels
 * @returns the SVG element
 */
export function CrossIcon({ size = 14, ...svgProps }: SVGProps<SVGSVGElement> & { size?: number }) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
