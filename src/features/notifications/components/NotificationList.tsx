/**
 * NotificationList: the notifications under their day headings, Today, Yesterday, Earlier this
 * week and Older (story S1-E7-01; board 6.2), or the empty state.
 *
 * Board E11-Notifications (user story 4.1): each day is a section with a muted heading in the
 * label style and its rows under it, a hairline above each, with no card around them.
 * Who uses it: NotificationsPage. What it calls: lib/dayGroups.ts and NotificationRow.
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
          className="flex flex-col gap-3"
        >
          <h2 id={`notifications-${group}`} className="m-0 type-label text-ink-muted">
            {t(`days.${group}`)}
          </h2>
          <ul className="m-0 list-none p-0">
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
