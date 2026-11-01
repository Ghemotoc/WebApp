/**
 * MessageSettingsLink: a "Change" or "Message settings" link to Settings › Messages (story
 * S1-E9-04; board Messages 5.5).
 *
 * The visible word can be short ("Change"), so the accessible name says what it changes; it
 * starts with the visible word (WCAG 2.5.3, label in name).
 * Who shows it: MessagesPage, MessagesRulesNotice and AboutChatPanel.
 */
import { Link } from 'react-router';

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
      className="inline-flex min-h-6 w-fit items-center font-semibold text-link underline"
    >
      {text}
    </Link>
  );
}
