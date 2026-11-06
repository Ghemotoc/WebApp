/**
 * NotificationEmailsSection: "Notifications" in Settings: what we email, per kind (story
 * S1-E7-02; board Settings 6.3, the Notifications tab).
 *
 * Board values: eyebrow, the heading and intro, a table of Type and Email with one
 * drop-down per kind (Instant, Daily digest, Off), a last row "Account, safety and legal: Always
 * sent", and the notes about marketing and the one-click unsubscribe. Rows have a fine line
 * between them (DoD label rows). The board's Push column and quiet-hours note wait for push
 * notifications (S1-E7-03, after the apps), so they aren't shown (docs/board-fixes.md).
 * The section has id "notifications", so the link at the foot of every email opens it.
 * Who shows it: SettingsPage. What it calls: useEmailSettings → my_notification_email_settings()
 * and set_notification_email().
 */
import mailIcon from '@/assets/icons/mail.svg';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';

import { useEmailSettings } from '../hooks/useEmailSettings';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

import { NotificationEmailRow } from './NotificationEmailRow';

/** The table, its error, or nothing while it loads. */
function EmailChoices() {
  const { t } = useNotificationsTranslation();
  const emailSettings = useEmailSettings();
  if (emailSettings.loadFailed)
    return <Notice tone="error">{t('emailSettings.loadFailed')}</Notice>;
  if (!emailSettings.isLoaded) return null;
  return (
    <>
      {emailSettings.saveFailed && <Notice tone="error">{t('emailSettings.saveFailed')}</Notice>}
      {/* The table scrolls inside its own box on a narrow phone, never the page. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[15px]">
          <caption className="sr-only">{t('emailSettings.tableLabel')}</caption>
          <thead>
            <tr className="border-b border-hairline text-left text-[13px] font-semibold text-meta">
              <th scope="col" className="py-2 pr-4">
                {t('emailSettings.typeColumn')}
              </th>
              <th scope="col" className="py-2">
                {t('emailSettings.emailColumn')}
              </th>
            </tr>
          </thead>
          <tbody>
            {emailSettings.settings.map((setting) => (
              <NotificationEmailRow
                key={setting.kind}
                setting={setting}
                onChange={emailSettings.save}
              />
            ))}
            <tr>
              <th scope="row" className="py-3 pr-4 text-left font-semibold text-ink">
                {t('emailSettings.requiredLabel')}
              </th>
              <td className="py-3 text-body">{t('emailSettings.requiredValue')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/** The notes under the table. */
function EmailNotes() {
  const { t } = useNotificationsTranslation();
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm text-body">
      <li>{t('emailSettings.digestNote')}</li>
      <li className="flex items-start gap-2.5">
        <img
          src={mailIcon}
          alt=""
          aria-hidden="true"
          width="22"
          height="22"
          className="flex-none"
        />
        <span>
          <b>{t('emailSettings.noMarketingTitle')}</b> {t('emailSettings.noMarketing')}
        </span>
      </li>
      <li>{t('emailSettings.unsubscribeNote')}</li>
    </ul>
  );
}

/**
 * Renders the section.
 *
 * @returns the section
 */
export function NotificationEmailsSection() {
  const { t } = useNotificationsTranslation();
  return (
    <section
      id="notifications"
      aria-labelledby="settings-notifications-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{t('emailSettings.eyebrow')}</Eyebrow>
        <h2
          id="settings-notifications-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('emailSettings.heading')}
        </h2>
        <p className="m-0 text-body">{t('emailSettings.intro')}</p>
      </div>
      <EmailChoices />
      <EmailNotes />
    </section>
  );
}
