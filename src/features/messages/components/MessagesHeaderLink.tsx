/**
 * MessagesHeaderLink: the chats button in the phone header and, since the simplified design
 * (bundle CALM-2), in the wide top bar too, before the bell (bundle G4 SHELL;
 * handoff "App header and tab bar": header B has "a pill with bell, chats and avatar (44px each,
 * dot when something is new)"; "Apps: chats sit in the header next to the bell").
 *
 * A clear 44 px round link with the chats icon. One 8 px dot in the thread colour shows when a chat
 * has new messages, never a number badge, and the accessible name says how many ("Messages, 2
 * chats with new messages"), so it never relies on the dot.
 * Who shows it: PhoneHeader and AppLayout's top bar, only while signed in. Where it goes: /messages.
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
          className="absolute top-2.5 right-2.5 size-2 rounded-full bg-thread"
        />
      )}
    </NavLink>
  );
}
