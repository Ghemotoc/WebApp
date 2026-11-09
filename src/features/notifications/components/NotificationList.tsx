/**
 * NotificationList: the notifications under their day headings, Today, Yesterday, Earlier this
 * week and Older (story S1-E7-01; board 6.2), or the empty state.
 *
 * Board values (liquid glass redesign, bundle G8d): each day is a section with a small heading and
 * a glass card of rows (28 px corners, 1 px border, the card shadow). Who uses it: NotificationsPage. What it calls:
 * lib/dayGroups.ts and NotificationRow.
 */
import type { AppNotification } from '../api/notifications';
import { dayGroupOf, dayGroups } from '../lib/dayGroups';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

import { NotificationRow } from './NotificationRow';
import { NotificationsEmpty } from './NotificationsEmpty';

/** What the list needs. */
export interface NotificationListProps {
  notifications: AppNotification[];
  ownHandle: string | null;
  onOpen: (notificationId: string) => void;
}

/**
 * Renders the day sections.
 *
 * @returns the sections, or the empty state when there is nothing to show
 */
export function NotificationList({ notifications, ownHandle, onOpen }: NotificationListProps) {
  const { t } = useNotificationsTranslation();
  if (notifications.length === 0) return <NotificationsEmpty />;
  // Step 1: one section per heading that has rows, newest first (the list already is).
  const now = new Date();
  const sections = dayGroups
    .map((group) => ({
      group,
      items: notifications.filter((item) => dayGroupOf(item.at, now) === group),
    }))
    .filter((section) => section.items.length > 0);
  return (
    <>
      {sections.map(({ group, items }) => (
        <section
          key={group}
          aria-labelledby={`notifications-${group}`}
          className="flex flex-col gap-2.5"
        >
          <h2
            id={`notifications-${group}`}
            className="m-0 font-heading text-lg font-bold text-heading"
          >
            {t(`days.${group}`)}
          </h2>
          <ul className="m-0 list-none overflow-hidden rounded-[28px] border border-border bg-surface p-0 shadow-card">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                ownHandle={ownHandle}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
