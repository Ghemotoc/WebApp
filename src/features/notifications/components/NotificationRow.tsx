/**
 * NotificationRow: one notification in the list (story S1-E7-01; board 6.2).
 *
 * Board values: 18 by 22 px padding, a hairline between rows, unread rows on a faint plum tint
 * with a gold dot, a 16 px line "<b>who</b> what", the quote under it, then the time, a grouped
 * pill ("12 reactions"), "Always on" for a decision and the one action in violet. A "new rank"
 * row also names the rank in its pill (bundle G4; DESIGN thread, 8 Nov 2026: no sticker).
 * Opening a row marks it as read. A row whose item is gone (no address) is plain text.
 * Who uses it: NotificationsPage. What it calls: lib/notificationText.ts for the words,
 * hooks/useMarkNotificationsRead.ts when opened.
 */
import { Link } from 'react-router';

import lockIcon from '@/assets/icons/lock.svg';
import { InfoPill } from '@/components/ui/InfoPill';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { RankChip } from '@/features/forums/components/RankChip';
import { cn } from '@/lib/utils';

import type { AppNotification } from '../api/notifications';
import { notificationText, type NotificationText } from '../lib/notificationText';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

import { NotificationIcon } from './NotificationIcon';

/** What a row needs. */
export interface NotificationRowProps {
  notification: AppNotification;
  /** The reader's own username, for "See who" on several new followers. */
  ownHandle: string | null;
  /** Called when the reader opens an unread row. */
  onOpen: (notificationId: string) => void;
}

/**
 * The words of the row: who, what, the quote and the line of details.
 *
 * @returns the row's text
 */
function RowWords({
  text,
  notification,
}: {
  text: NotificationText;
  notification: AppNotification;
}) {
  const { t, i18n } = useNotificationsTranslation();
  return (
    <>
      <span className="text-base leading-normal text-ink">
        <b>{text.who}</b> {text.what}
      </span>
      {text.quote !== null && text.quote !== '' && (
        <span className="text-[15px] leading-[1.55] text-body">“{text.quote}”</span>
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-meta">
        <time dateTime={notification.at}>{timeAgo(notification.at, i18n.language)}</time>
        {text.grouped !== null && <InfoPill tone="neutral">{text.grouped}</InfoPill>}
        {/* The rank just reached, in the same pill as on the profile (IDEAS-3a). */}
        {notification.writerRank !== null && <RankChip rank={notification.writerRank} isCompact />}
        {notification.isRequired && (
          <InfoPill tone="plum">
            <img src={lockIcon} alt="" aria-hidden="true" width={14} height={14} />
            {t('alwaysOn')}
          </InfoPill>
        )}
        {text.actionLabel !== null && (
          <span className="font-semibold text-link">{text.actionLabel}</span>
        )}
      </span>
    </>
  );
}

/**
 * Renders the row.
 *
 * @returns the list item
 */
export function NotificationRow({ notification, ownHandle, onOpen }: NotificationRowProps) {
  const { t } = useNotificationsTranslation();
  const text = notificationText(t, notification, ownHandle);
  const isUnread = !notification.isRead;
  const wordsClasses = 'flex min-w-0 flex-1 flex-col gap-1.5 text-inherit no-underline';
  return (
    <li
      className={cn(
        'flex items-start gap-4 border-t border-hairline px-[22px] py-[18px] first:border-t-0',
        isUnread ? 'bg-tint/40' : 'bg-surface',
      )}
    >
      <NotificationIcon category={notification.category} />
      {text.href === null ? (
        <div className={wordsClasses}>
          <RowWords text={text} notification={notification} />
        </div>
      ) : (
        <Link
          to={text.href}
          className={cn(wordsClasses, 'rounded-lg hover:[&_b]:underline')}
          onClick={() => {
            if (isUnread) onOpen(notification.id);
          }}
        >
          <RowWords text={text} notification={notification} />
        </Link>
      )}
      {isUnread && (
        <span className="mt-2 size-2.5 flex-none rounded-full bg-gold shadow-[0_0_0_2px_var(--surface)]">
          <span className="sr-only">{t('unread')}</span>
        </span>
      )}
    </li>
  );
}
