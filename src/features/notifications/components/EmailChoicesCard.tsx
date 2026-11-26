/**
 * EmailChoicesCard: "How you’re told", the first section beside the notifications (story
 * S1-E7-02; user story 4.1, board E11-Notifications).
 *
 * As the board draws it: the subheading, label rows with a hairline above each (the kind at the
 * left, how it reaches the person at the right) and "Change notification settings", a text
 * button to Settings › Notifications. Each kind's email choice is read as words: Instant is
 * "Here and by email", Daily digest "Here, daily email" and Off "Here only", because everything
 * shows here whatever the email choice. Under 18, instant emails arrive as the daily digest
 * (email_delivery_for()), and my_notification_email_settings() already says so.
 * The board's last row, "Browser alerts · Quiet 22:00 to 07:00", waits for browser alerts
 * (S1-E7-03, after the apps); the row here is the quiet hours that exist, the ones for message
 * emails (IDEAS-2 idea 6; always on under 18), read from the person's own message settings
 * (docs/board-fixes.md). While the choices load, or if they can't be read, the section shows only
 * its heading and the button, which still works.
 * Who uses it: NotificationsPage. What it calls: useEmailSettings
 * (my_notification_email_settings()) and useMyMessageSettings (my_message_settings()).
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { LabelRows, type LabelRow } from '@/components/ui/LabelRows';
import { useMyMessageSettings } from '@/features/messages/hooks/useMessages';

import type { EmailDelivery } from '../api/emailSettings';
import { useEmailSettings } from '../hooks/useEmailSettings';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/** How each email choice reads in this section. */
const toldKey: Record<EmailDelivery, string> = {
  instant: 'howTold.hereAndEmail',
  daily: 'howTold.hereDaily',
  off: 'howTold.hereOnly',
};

/**
 * The message emails row: off, on, or on with quiet hours.
 *
 * @returns the row, or null while the message settings load
 */
function useMessageEmailRow(): LabelRow | null {
  const { t } = useNotificationsTranslation();
  const settings = useMyMessageSettings();
  if (settings.data === undefined) return null;
  const email = settings.data.email;
  const label = t('howTold.messages');
  if (!email.emailsOn) return { label, value: t('howTold.off') };
  if (!email.quietHoursOn) return { label, value: t('howTold.on') };
  return {
    label,
    value: t('howTold.quiet', { from: email.quietFrom, until: email.quietUntil }),
  };
}

/**
 * Renders the section.
 *
 * @returns the section headed "How you’re told"
 */
export function EmailChoicesCard() {
  const { t } = useNotificationsTranslation();
  const emailSettings = useEmailSettings();
  const messageRow = useMessageEmailRow();
  // Step 1: one row per kind, in the Settings table's order, then the message emails.
  const rows: LabelRow[] = emailSettings.settings.map((setting) => ({
    label: t(`howTold.kinds.${setting.kind}`),
    value: t(toldKey[setting.delivery]),
  }));
  if (messageRow !== null) rows.push(messageRow);
  return (
    <section aria-labelledby="notification-choices-heading" className="flex flex-col gap-2">
      <h2 id="notification-choices-heading" className="m-0 mb-2 type-subheading">
        {t('choicesCard.heading')}
      </h2>
      {rows.length > 0 && <LabelRows rows={rows} look="spread" />}
      <Link to="/settings#notifications" className={buttonClassName({ variant: 'text' })}>
        {t('choicesCard.link')}
      </Link>
    </section>
  );
}
