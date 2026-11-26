/**
 * NotificationsEmpty: what the list says when a tab, or the whole list, has nothing to show
 * (story S1-E7-01; user story 4.1: "Nothing new. Notifications about stories, replies and follows
 * show here.").
 *
 * One plain line in the body style, muted, where the rows would be (board E11 draws no box).
 * Who uses it: NotificationList.
 */
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/**
 * Renders the empty state.
 *
 * @returns the line
 */
export function NotificationsEmpty() {
  const { t } = useNotificationsTranslation();
  return (
    <p className="m-0 border-t border-hairline py-4 type-body text-ink-muted">{t('empty.body')}</p>
  );
}
