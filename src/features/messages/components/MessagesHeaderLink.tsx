/**
 * MessagesHeaderLink: the chats button in the phone header, beside the bell (bundle G4 SHELL;
 * handoff "App header and tab bar": header B has "a pill with bell, chats and avatar (44px each,
 * dot when something is new)"; "Apps: chats sit in the header next to the bell").
 *
 * A clear 44 px round link with the chats icon. A dot in the theme's "on" colour (the accent by day, pale at night) shows when a chat has
 * new messages, and the accessible name says how many ("Messages, 2 chats with new messages"), so
 * it never relies on the dot. On a wide screen Messages is a link in the top bar's track instead
 * (MessagesNavLink).
 * Who shows it: PhoneHeader, only while signed in. Where it goes: /messages.
 * What it calls: useUnreadMessageCount (every minute and on focus).
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';

import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount';

/**
 * Renders the link.
 *
 * @returns the round link, or nothing while signed out
 */
export function MessagesHeaderLink() {
  const { t } = useTranslation();
  const { isSignedIn, unreadCount } = useUnreadMessageCount();
  if (!isSignedIn) return null;
  return (
    <NavLink
      to="/messages"
      aria-label={
        unreadCount > 0 ? t('nav.messagesUnread', { count: unreadCount }) : t('nav.messages')
      }
      className="relative inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
    >
      <NavIcon name="messages" size={22} />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          data-new-dot
          className="absolute top-2.5 right-2.5 size-2 rounded-full bg-chip-on"
        />
      )}
    </NavLink>
  );
}
