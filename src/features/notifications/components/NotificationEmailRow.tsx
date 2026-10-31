/**
 * NotificationEmailRow: one row of the notification email table in Settings: the kind, and a
 * drop-down with Instant, Daily digest and Off (story S1-E7-02; board Settings 6.3).
 *
 * Who shows it: NotificationEmailsSection. Saving goes up through onChange.
 */
import { Select } from '@/components/ui/Select';

import { useNotificationsTranslation } from '../registerNotificationsTranslations';
import type { EmailDelivery, EmailSetting } from '../api/emailSettings';

/** The choices, in the board's order. */
const deliveries: EmailDelivery[] = ['instant', 'daily', 'off'];

/** What a row needs. */
export interface NotificationEmailRowProps {
  setting: EmailSetting;
  onChange: (setting: EmailSetting) => void;
}

/**
 * Renders the row.
 *
 * @param props.setting - the kind and its current choice
 * @param props.onChange - called with the new choice
 * @returns a table row
 */
export function NotificationEmailRow({ setting, onChange }: NotificationEmailRowProps) {
  const { t } = useNotificationsTranslation();
  const label = t(`emailSettings.kinds.${setting.kind}`);
  return (
    <tr className="border-b border-hairline">
      <th scope="row" className="py-3 pr-4 text-left font-semibold text-ink">
        {label}
      </th>
      <td className="py-3">
        <Select
          id={`notification-email-${setting.kind}`}
          label={t('emailSettings.selectLabel', { label })}
          value={setting.delivery}
          options={deliveries.map((delivery) => ({
            value: delivery,
            label: t(`emailSettings.deliveries.${delivery}`),
          }))}
          onChange={(value) => onChange({ kind: setting.kind, delivery: value as EmailDelivery })}
        />
      </td>
    </tr>
  );
}
