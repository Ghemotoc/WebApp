/**
 * MessageSettingsLink: the short "Change" link to Settings › Messages (story S1-E9-04; board
 * Messages 5.5).
 *
 * The visible word is short ("Change"), so the accessible name says what it changes; it starts
 * with the visible word (WCAG 2.5.3, label in name). It is the boards' text button (ink, underlined,
 * 44 px tall; board E12-Messages).
 * Who shows it: MessagesRulesNotice and ChatPanel (the line that says why the box is gone).
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

/** What the link needs. */
export interface MessageSettingsLinkProps {
  /** The visible word. */
  text: string;
  /** The full name for screen readers, starting with the visible word. */
  label: string;
}

/**
 * Renders the link.
 *
 * @returns the link to /settings#messages
 */
export function MessageSettingsLink({ text, label }: MessageSettingsLinkProps) {
  return (
    <Link
      to="/settings#messages"
      aria-label={label}
      className={buttonClassName({ variant: 'text' }, 'w-fit')}
    >
      {text}
    </Link>
  );
}
