/**
 * MessageSettingsLink: a "Change" or "Message settings" link to Settings › Messages (story
 * S1-E9-04; board Messages 5.5).
 *
 * The visible word can be short ("Change"), so the accessible name says what it changes; it
 * starts with the visible word (WCAG 2.5.3, label in name).
 * The page's own link wears the board's doodle cog (LOOK-5); the short inline "Change" links don't.
 * Who shows it: MessagesPage, MessagesRulesNotice and AboutChatPanel.
 */
import { Link } from 'react-router';

import settingsIcon from '@/assets/icons/settings.svg';

/** What the link needs. */
export interface MessageSettingsLinkProps {
  /** The visible word. */
  text: string;
  /** The full name for screen readers, starting with the visible word. */
  label: string;
  /** True to show the doodle cog before the words (the page header's link). */
  withIcon?: boolean;
}

/**
 * Renders the link.
 *
 * @returns the link to /settings#messages
 */
export function MessageSettingsLink({ text, label, withIcon = false }: MessageSettingsLinkProps) {
  return (
    <Link
      to="/settings#messages"
      aria-label={label}
      className="inline-flex min-h-6 w-fit items-center gap-2 font-semibold text-link underline"
    >
      {/* Decorative: the words say where the link goes. */}
      {withIcon && <img src={settingsIcon} alt="" aria-hidden="true" width={20} height={20} />}
      {text}
    </Link>
  );
}
