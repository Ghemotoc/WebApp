/**
 * MessagesHeaderLink: the chats button in the phone header and, since the simplified design
 * (bundle CALM-2), in the wide top bar too, before the bell (bundle G4 SHELL;
 * handoff "App header and tab bar": header B has "a pill with bell, chats and avatar (44px each,
 * dot when something is new)"; "Apps: chats sit in the header next to the bell").
 *
 * A clear 44 px round link with the chats icon. A small count, 1 to 9 then 9+, shows how many chats
 * have new messages (CountBadge; design books item 16, Robert's pick of 24 Nov 2026, replacing the
 * CALM-2 dot), and the accessible name says how many ("Messages, 2 chats with new messages"), so
 * the badge is only for the eye.
 * Who shows it: PhoneHeader and AppLayout's top bar, only while signed in. Where it goes: /messages.
 * What it calls: useUnreadMessageCount (every minute and on focus).
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';
import { CountBadge } from '@/components/ui/CountBadge';
import { badgeLinkName } from '@/components/ui/countBadgeText';

import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount';

/** The link's name, which always says what the badge shows ("Messages, 9+ new"). */
const linkNameKeys = {
  none: 'nav.messages',
  some: 'nav.messagesUnread',
  many: 'nav.messagesManyUnread',
};

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
      aria-label={badgeLinkName(t, linkNameKeys, unreadCount)}
      className="relative inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
    >
      <NavIcon name="messages" size={22} />
      <CountBadge count={unreadCount} />
    </NavLink>
  );
}
