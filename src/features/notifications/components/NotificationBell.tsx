/**
 * NotificationBell: the bell in the top bar, with the unread count (story S1-E7-01, criterion 3;
 * every signed-in board draws it before "Write").
 *
 * Look (bundle G4 SHELL; handoff "App header and tab bar": bell 44 px, a mark when something is
 * new): a clear 44 px round button with the line bell in ink. Something new shows a small count,
 * 1 to 9 then 9+ (CountBadge; design books item 16, Robert's pick of 24 Nov 2026, replacing the
 * CALM-2 dot); the full count is in the accessible name ("Notifications, 12 new"), so the badge is
 * only for the eye.
 * Who shows it: AppLayout, in the top bar's end slot and the phone header, only while signed in.
 * Where it goes: /notifications. What it calls: hooks/useUnreadNotificationCount.ts (every minute
 * and on focus). Its words are in common.json (nav.notifications…), because the bell is on every
 * page.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';
import { CountBadge } from '@/components/ui/CountBadge';

import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount';

/**
 * Renders the bell.
 *
 * @returns the link, or nothing while signed out
 */
export function NotificationBell() {
  const { t } = useTranslation();
  const { isSignedIn, unreadCount } = useUnreadNotificationCount();
  if (!isSignedIn) return null;
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
      <CountBadge count={unreadCount} />
    </NavLink>
  );
}
