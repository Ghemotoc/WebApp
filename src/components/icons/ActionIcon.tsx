/**
 * ActionIcon: the line icons inside messages, moderator mail and notifications (bundles G8c and
 * G8d): Block, Send, Settings, a plus for "New chat" and "Write to the moderators", an "i" for
 * notes, a tick for "Mark all as read", and the notification kinds as the board draws them (an
 * open book for stories, a speech bubble for replies, a person for follows, a shield for staff
 * and a lock for "Always on").
 *
 * Why not in NavIcon: NavIcon is in the bundle every page loads (the tab bar and top bar use it),
 * and the chapter reader has a script budget (e2e/reader-performance.spec.ts). These icons are
 * only needed on the pages that show them, so they travel with those pages instead.
 * Same drawing rules as NavIcon: a 24 px grid, a 1.8 px stroke in the current text colour, hidden
 * from screen readers because the button or link beside it carries the words.
 * Who uses it: ChatFocusBar, ChatMessages, MessageComposer, NewChatButton, MailReplyForm,
 * MyMailPage, NewMailPage, and in notifications NotificationIcon; the class and teacher check
 * pages (G8e); and, since NO-DOODLES replaced the old hand-drawn icon set, every screen that used
 * it (the home page hero and safety lines, sign-up, log-in ways, story stats, the writer
 * dashboard, the chapter editor's insert buttons, forum locks, export status and the profile's
 * safety card); and the forum
 * reply's formatting toolbar (GAPS-16b: link, quote, list); Story Atlas's "Category colours"
 * (palette, CALM-9, board E25); and a landing page's steps (target, pen, book; CALM-9, board A10);
 * and Story Atlas's Delete on a note (bin, user stories bundle 6, board E31); and the Marketing
 * page's Download PNG and Download SVG (download, board E32).
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
  // Bug: a beetle with feelers and legs, on the quiet "Report a bug" tab (TRIAL-FEEDBACK; Robert,
  // 26 Nov 2026). Drawn after Lucide's "bug" (ISC licence).
  bug: (
    <>
      <path d="m8 2 1.9 1.9" />
      <path d="M14.1 3.9 16 2" />
      <path d="M9 7.1V6a3 3 0 1 1 6 0v1.1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
      <path d="M6.5 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </>
  ),
  // Grip: six dots in two columns, the handle a card is dragged by (CALM-9, board E28).
  grip: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </g>
  ),
  // More: three dots in a row, a card's menu button (CALM-9, board E28).
  more: (
    <g fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </g>
  ),
  // Information: an "i" in a circle (bundle G8c, the linked decision on "Write to the moderators").
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  // Done: a tick (bundle G8d, "Mark all as read").
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  // Languages: a globe (TRANSLATE-1b, the "Read in" switch).
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
    </>
  ),
  // Stories: an open book (bundle G8d, Notifications board).
  book: (
    <>
      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 17a3 3 0 0 1 3-3h10" />
    </>
  ),
  // Replies: a speech bubble (bundle G8d).
  comment: <path d="M4 5h16v11H9l-5 4z" />,
  // Follows: a person (bundle G8d).
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  // Staff and decisions: a shield (bundle G8d).
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  // Always on: a padlock (bundle G8d).
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  // The icons below replaced the old hand-drawn icon set in bundle NO-DOODLES (Robert, 9 Nov
  // 2026: no doodles anywhere), drawn the same way as the rest.
  // Reading time and "in progress": a clock.
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  // Likes: a heart.
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  // Email: an envelope.
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  // Pictures: a framed mountain and sun.
  picture: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9.5" r="1.8" />
      <path d="m3.5 18 6-6 4 4 3-3 4 4" />
    </>
  ),
  // Certificates and "yours to keep": a rosette.
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" />
    </>
  ),
  // A real person, not an algorithm: a flag.
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  // Reads: an eye.
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // Followers: two people.
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  // Writing and drawing: a pen.
  pen: (
    <>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      <path d="m14.5 5.5 3 3" />
    </>
  ),
  // Delete: a bin (board E31's Delete on a note).
  bin: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
    </>
  ),
  // Download: an arrow down onto a line (board E32).
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  // Music: a note.
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  // Video: a play button in a frame.
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  // A place: a map pin ("Set in" on the new story form, CALM-9, board D02).
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  // Story Atlas: a folded map (CALM-9a, board D01).
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
  // New character: a person with a plus (CALM-9a, board E21).
  personPlus: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </>
  ),
  // A story's start page in the Atlas ("At a glance"): a house (CALM-9a).
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
    </>
  ),
  // Ideas: a spark of eight short rays (CALM-9a).
  spark: (
    <>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m6 6 2.5 2.5" />
      <path d="m15.5 15.5 2.5 2.5" />
      <path d="m18 6-2.5 2.5" />
      <path d="M8.5 15.5 6 18" />
    </>
  ),
  // Marketing: a star (CALM-9a).
  star: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z" />,
  // Link: two chain links (bundle GAPS-16b; board 5.2's formatting toolbar).
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  // Quote: two quotation marks (GAPS-16b).
  quote: (
    <>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 4-2 6-4 6" />
      <path d="M14 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 4-2 6-4 6" />
    </>
  ),
  // Target: three rings round a dot, for a goal (a landing page's first step, CALM-9, board A10).
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  // Undo: an arrow curling back to the left (the chapter editor's toolbar, board D05).
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  // List: three dots, each with a line (GAPS-16b).
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  // Palette: a painter's palette with three paint dots (CALM-9, board E25's "Category colours").
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4c0-4.1-4-7.2-9-7.2z" />
      <path d="M7.5 11.5h.01M10 7.5h.01M15 7.5h.01" />
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
