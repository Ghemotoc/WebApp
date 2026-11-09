/**
 * ActionIcon: the line icons for actions inside messages and moderator mail (bundle G8c): Block,
 * Send, Settings, a plus for "New chat" and "Write to the moderators", and an "i" for notes.
 *
 * Why not in NavIcon: NavIcon is in the bundle every page loads (the tab bar and top bar use it),
 * and the chapter reader has a script budget (e2e/reader-performance.spec.ts). These icons are
 * only needed on the messages and moderator mail pages, so they travel with those pages instead.
 * Same drawing rules as NavIcon: a 24 px grid, a 1.8 px stroke in the current text colour, hidden
 * from screen readers because the button or link beside it carries the words.
 * Who uses it: ChatHeader, MessageComposer, MessagesPage, NewChatButton, MailReplyForm, MyMailPage
 * and NewMailPage.
 */
import type { SVGProps } from 'react';

/** Each icon's drawing, in a 24 by 24 box. */
const drawings = {
  // Block: a circle with a line through it (bundle G8c).
  block: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </>
  ),
  // Send: a paper plane (bundle G8c).
  send: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </>
  ),
  // Settings: a cog (bundle G8c).
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  // Write to someone: a plus (bundle G8c, "New chat" and "Write to the moderators").
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  // Information: an "i" in a circle (bundle G8c, the linked decision on "Write to the moderators").
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
} as const;

/** The icons there are. */
export type ActionIconName = keyof typeof drawings;

/**
 * Draws one icon at the size given (default 16 px) in the current text colour.
 *
 * @param props.name - which icon
 * @param props.size - width and height in pixels
 * @returns the SVG element
 */
export function ActionIcon({
  name,
  size = 16,
  ...svgProps
}: SVGProps<SVGSVGElement> & { name: ActionIconName; size?: number }) {
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
