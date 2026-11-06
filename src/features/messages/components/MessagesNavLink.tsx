/**
 * MessagesNavLink: "Messages" in the top bar with the number of chats that have new messages,
 * while signed in (story S1-E9-01; every signed-in board draws it after Forums).
 *
 * The number is a small gold bubble, as on the board; its accessible name says it too
 * ("Messages, 2 chats with new messages"), so it never relies on the picture. The link counts as
 * current on /messages and on every chat under it.
 * Who shows it: TopBar, through AppLayout. What it calls: useUnreadMessageCount (every minute and
 * on focus). Its words are in common.json (nav.messages…), because the top bar is on every page.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { useUnreadMessageCount } from '../hooks/useMessages';

/** Above this the bubble says "99+", so it stays small. */
const largestShownCount = 99;

/** The link's classes: plum, bold and gold-underlined on Messages, as the other top bar links. */
function linkClasses({ isActive }: { isActive: boolean }): string {
  const shared =
    'inline-flex min-h-11 items-center gap-2 border-b-2 no-underline hover:text-link-hover';
  return isActive
    ? `${shared} border-gold font-bold text-heading`
    : `${shared} border-transparent text-body`;
}

/**
 * Renders the list item.
 *
 * @returns the link in an <li>, or nothing while signed out
 */
export function MessagesNavLink() {
  const { t } = useTranslation();
  const { isSignedIn, unreadCount } = useUnreadMessageCount();
  if (!isSignedIn) return null;
  const bubble = unreadCount > largestShownCount ? `${largestShownCount}+` : String(unreadCount);
  return (
    <li>
      <NavLink
        to="/messages"
        className={linkClasses}
        aria-label={unreadCount > 0 ? t('nav.messagesUnread', { count: unreadCount }) : undefined}
      >
        {t('nav.messages')}
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] leading-none font-bold text-on-gold"
          >
            {bubble}
          </span>
        )}
      </NavLink>
    </li>
  );
}
