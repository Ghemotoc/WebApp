/**
 * NotificationsEmpty: "You're all caught up", when a filter or the whole list has nothing to show
 * (story S1-E7-01; board 6.2).
 *
 * Board values: a dashed white card, centred, a 24 px heading (no doodle since bundle G4).
 * Who uses it: NotificationList.
 */

import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/**
 * Renders the empty state.
 *
 * @returns the card
 */
export function NotificationsEmpty() {
  const { t } = useNotificationsTranslation();
  return (
    <div className="relative flex flex-col items-center gap-3 rounded-card border border-dashed border-dashed-border bg-surface px-8 py-12 text-center">
      <h2 className="m-0 text-2xl font-bold">{t('empty.title')}</h2>
      <p className="m-0 max-w-[420px] text-base leading-relaxed text-body">{t('empty.body')}</p>
    </div>
  );
}
