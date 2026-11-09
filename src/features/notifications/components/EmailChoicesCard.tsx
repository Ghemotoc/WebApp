/**
 * EmailChoicesCard: the side card on Notifications that sums up what is emailed (story S1-E7-02;
 * board Notifications, the "Your choices" card, in the liquid glass redesign, bundle G8d).
 *
 * One label row per kind ("New chapters in stories I follow: Instant"), then "Account, safety
 * and legal: Always sent", and a link to change them in Settings › Notifications. The board also
 * lists browser alerts and quiet hours; those wait for push notifications (S1-E7-03, after the
 * apps), so they aren't shown (docs/board-fixes.md). While the choices load, or if they can't be
 * read, the card shows only its heading and the link, which still works.
 * Who uses it: NotificationsPage. What it calls: useEmailSettings (my_notification_email_settings()).
 */
import { Link } from 'react-router';

import { LabelRows, type LabelRow } from '@/components/ui/LabelRows';

import { useEmailSettings } from '../hooks/useEmailSettings';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/**
 * Renders the card.
 *
 * @returns the section headed "Email choices"
 */
export function EmailChoicesCard() {
  const { t } = useNotificationsTranslation();
  const emailSettings = useEmailSettings();
  // Step 1: one row per kind, in the Settings table's order, then the kinds that are always sent.
  const rows: LabelRow[] = emailSettings.settings.map((setting) => ({
    label: t(`emailSettings.kinds.${setting.kind}`),
    value: t(`emailSettings.deliveries.${setting.delivery}`),
  }));
  if (emailSettings.isLoaded) {
    rows.push({
      label: t('emailSettings.requiredLabel'),
      value: t('emailSettings.requiredValue'),
    });
  }
  return (
    <section
      aria-labelledby="notification-choices-heading"
      className="flex flex-col gap-3 rounded-[28px] border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="notification-choices-heading"
        className="m-0 font-heading text-lg font-bold text-heading"
      >
        {t('choicesCard.heading')}
      </h2>
      {rows.length > 0 && <LabelRows rows={rows} />}
      <Link
        to="/settings#notifications"
        className="w-fit text-sm font-semibold text-link underline"
      >
        {t('choicesCard.link')}
      </Link>
    </section>
  );
}
