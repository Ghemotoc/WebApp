/**
 * NewsEmailsSwitch: "Send me occasional news" in Settings › Notifications (bundle WAITLIST-1).
 *
 * A separate opt-in, never ticked for anyone (consent; Law 506/2004), and only for people 18 or
 * over (Q50): the database refuses anyone younger and the switch says so in plain words. The
 * same choice can be made on the sign-up form while the waiting list is on.
 * It has id "news-emails", so a news email's footer can link straight to it.
 * Who shows it: NotificationEmailsSection. What it calls: useNewsEmails.
 */
import { Notice } from '@/components/ui/Notice';

import { useNewsEmails } from '../hooks/useNewsEmails';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/**
 * Renders the box, or a plain error when the choice can't be read.
 *
 * @returns the switch
 */
export function NewsEmailsSwitch() {
  const { t } = useNotificationsTranslation();
  const news = useNewsEmails();
  if (news.loadFailed) return <Notice tone="error">{t('emailSettings.news.loadFailed')}</Notice>;
  if (news.isOn === null) return null;
  return (
    <div id="news-emails" className="flex scroll-mt-24 flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id="settings-news-emails"
          type="checkbox"
          checked={news.isOn}
          disabled={news.isSaving}
          onChange={(event) => news.save(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
        />
        <label htmlFor="settings-news-emails" className="text-[15px] text-body">
          {t('emailSettings.news.label')}
        </label>
      </div>
      <p role="alert" className="m-0 text-sm text-destructive empty:hidden">
        {news.saveFailure !== null && t(`emailSettings.news.failures.${news.saveFailure}`)}
      </p>
    </div>
  );
}
