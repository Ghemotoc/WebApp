/**
 * NavIcon: the line icons of the header and the tab bar (bundle G4 SHELL; drawn as on the canvas
 * phone and web boards: 24 px grid, 1.8 px rounded strokes in the current text colour).
 *
 * The liquid glass design has no doodles (Robert, 7 Nov 2026), so the header and the tab bar use
 * these plain icons, each always with a written label or an accessible name beside it.
 * Decorative: hidden from screen readers.
 * Who uses it: TabBar, PhoneHeader, NotificationBell, MessagesHeaderLink, the back links of
 * Messages and moderator mail, and ReportButton's pill and icon looks (the flag, bundle G8c). The
 * action icons of the messages pages live in ActionIcon, so this file stays small: every page,
 * the chapter reader included, loads it. What it calls: nothing.
 */
import type { SVGProps } from 'react';

/** The drawing of each icon, as SVG paths and shapes on a 24 px grid. */
const drawings = {
  // Discover: a compass.
  discover: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  // Library: a closed book.
  library: (
    <>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2" />
      <path d="M8 7h7" />
    </>
  ),
  // Write: a pen.
  write: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  // Forums: a speech bubble.
  forums: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  // Chats (messages): two overlapping bubbles.
  messages: (
    <>
      <path d="M14 9a2 2 0 0 1-2 2H6l-3 3V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z" />
      <path d="M18 9h1a2 2 0 0 1 2 2v10l-3-3h-6a2 2 0 0 1-2-2v-1" />
    </>
  ),
  // Notifications: a bell.
  bell: (
    <>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  // Search: a magnifying glass.
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  // Back: a left arrow.
  back: (
    <>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </>
  ),
  // Report: a flag (bundle G8c, the boards' Report pills and buttons).
  flag: (
    <>
      <path d="M4 22V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </>
  ),
} as const;

/** The icons there are. */
export type NavIconName = keyof typeof drawings;

/**
 * Draws one icon at the size given (default 22 px) in the current text colour.
 *
 * @param props.name - which icon
 * @param props.size - width and height in pixels
 * @returns the SVG element
 */
export function NavIcon({
  name,
  size = 22,
  ...svgProps
}: SVGProps<SVGSVGElement> & { name: NavIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...svgProps}
    >
      {drawings[name]}
    </svg>
  );
}
