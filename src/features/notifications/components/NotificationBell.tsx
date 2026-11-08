/**
 * NotificationBell: the bell in the top bar, with the unread count (story S1-E7-01, criterion 3;
 * every signed-in board draws it before "Write").
 *
 * Look (bundle G4 SHELL; handoff "App header and tab bar": bell 44 px, a mark when something is
 * new): a clear 44 px round button with the line bell in ink. The board marks unread with a dot;
 * the story asks for the count, so the mark is a small bubble with the number, in the theme's
 * "on" colour (the accent by day, pale at night) with its tested text (docs/board-fixes.md). Its
 * accessible name says the number too ("Notifications, 3 new"), so it never relies on the picture.
 * Who shows it: AppLayout, in the top bar's end slot and the phone header, only while signed in.
 * Where it goes: /notifications. What it calls: hooks/useUnreadNotificationCount.ts (every minute
 * and on focus). Its words are in common.json (nav.notifications…), because the bell is on every
 * page.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';

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
      className="relative inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
    >
      <NavIcon name="bell" size={22} />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-chip-on px-1 text-[11px] leading-none font-bold text-chip-on-text"
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}
