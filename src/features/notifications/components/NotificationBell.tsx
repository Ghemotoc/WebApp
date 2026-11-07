/**
 * NotificationBell: the bell in the top bar, with the unread count (story S1-E7-01, criterion 3;
 * every signed-in board draws it before "Write").
 *
 * Board values: a 44 px round button on the plum tint with a gold inner shadow at the bottom and
 * the bell doodle icon. The board marks unread with a dot; the story asks for the count, so the
 * badge is a small gold bubble with the number (docs/board-fixes.md). Its accessible name says
 * the number too ("Notifications, 3 new"), so it never relies on the picture.
 * Who shows it: AppLayout, in the top bar's end slot, only while signed in. Where it goes:
 * /notifications. What it calls: hooks/useUnreadNotificationCount.ts (every minute and on focus).
 * Its words are in common.json (nav.notifications…), because the bell is on every page.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import bellIcon from '@/assets/icons/bell.svg';

import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';

/** Above this the badge says "99+", so it stays small. */
const largestShownCount = 99;

/**
 * Renders the bell.
 *
 * @returns the link, or nothing while signed out
 */
export function NotificationBell() {
  const { t } = useTranslation();
  const { isSignedIn, unreadCount } = useUnreadNotificationCount();
  if (!isSignedIn) return null;
  const badge = unreadCount > largestShownCount ? `${largestShownCount}+` : String(unreadCount);
  return (
    <NavLink
      to="/notifications"
      aria-label={
        unreadCount > 0
          ? t('nav.notificationsUnread', { count: unreadCount })
          : t('nav.notifications')
      }
      className="relative inline-flex size-11 items-center justify-center rounded-full bg-tint text-heading shadow-[inset_0_-2px_0_var(--gold)]"
    >
      <img
        src={bellIcon}
        alt=""
        aria-hidden="true"
        width={26}
        height={26}
        className="block size-[26px]"
      />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface-solid bg-gold px-1 text-[11px] leading-none font-bold text-on-gold"
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}
