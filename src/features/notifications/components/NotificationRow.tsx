/**
 * NotificationRow: one notification in the list (story S1-E7-01; user story 4.1, board
 * E11-Notifications).
 *
 * As the board draws it: 16 px padding, a hairline above each row, the 36 px avatar, the sentence
 * "<b>who</b> what" with the titles in it in bold (emphasisedWords), a quote in the reading face
 * (Literata italic, muted) when there is one, and a line with the time only. Unread rows sit on
 * the tint; story 4.1 says "No coloured bar on the left edge", so there is none, and screen
 * readers hear "Unread", so colour is never the only sign. The whole sentence is one link that
 * opens the exact place, and opening it marks the row read. Rows from the team (moderation
 * decisions, the account's own news) start with a plum circle with the product's first letter,
 * so a moderator is never shown; their one action ("Read the reasons") is written in the
 * sentence as a link-coloured phrase, as the board does. A "new rank" row also names the rank in
 * its pill (IDEAS-3a; no sticker). A row whose item is gone (no address) is plain text.
 * Who uses it: NotificationList. What it calls: lib/notificationText.ts and lib/emphasisedWords.ts
 * for the words, PersonAvatar, NotificationIcon or BrandInitial at the start.
 */
import { Link } from 'react-router';

import { brand } from '@/config/brand';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { RankChip } from '@/features/forums/components/RankChip';
import { cn } from '@/lib/utils';

import type { AppNotification } from '../api/notifications';
import { emphasisedWords, titlesOf } from '../lib/emphasisedWords';
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
 * The sentence: who in bold, then what happened with its titles in bold, then the team's action.
 *
 * @returns the sentence
 */
function Sentence({
  text,
  notification,
}: {
  text: NotificationText;
  notification: AppNotification;
}) {
  const pieces = emphasisedWords(text.what, titlesOf(notification));
  const isTeam = notification.category === 'staff';
  return (
    <span className="type-body text-ink">
      <b>{text.who}</b>{' '}
      {pieces.map((piece, index) =>
        // The pieces never reorder, so their place is a safe key.
        piece.isTitle ? <b key={index}>{piece.text}</b> : <span key={index}>{piece.text}</span>,
      )}
      {isTeam && text.actionLabel !== null && (
        <>
          {' '}
          <span className="text-link underline">{text.actionLabel}</span>
        </>
      )}
    </span>
  );
}

/**
 * The words of the row: the sentence, the quote and the time.
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
      <Sentence text={text} notification={notification} />
      {text.quote !== null && text.quote !== '' && (
        <span className="font-story type-body text-ink-muted italic">“{text.quote}”</span>
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-2 type-meta">
        <time dateTime={notification.at}>{timeAgo(notification.at, i18n.language)}</time>
        {/* The rank just reached, in the same pill as on the profile (IDEAS-3a). */}
        {notification.writerRank !== null && <RankChip rank={notification.writerRank} />}
        {!notification.isRead && <span className="sr-only">{t('unread')}</span>}
      </span>
    </>
  );
}

/**
 * The plum circle with the product's first letter, for rows from the team (board E11's "g").
 *
 * @returns the decorative circle
 */
function BrandInitial() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-9 flex-none items-center justify-center rounded-full bg-primary type-meta font-semibold text-on-primary"
    >
      {brand.productName.slice(0, 1)}
    </span>
  );
}

/**
 * The start of the row: the team's circle, the first person's avatar, or the category icon when
 * the row names nobody (staff decisions never show who made them).
 *
 * @returns the decorative avatar or icon
 */
function RowStart({ notification }: { notification: AppNotification }) {
  const firstActor = notification.actors[0];
  if (notification.category === 'staff') return <BrandInitial />;
  if (firstActor === undefined) return <NotificationIcon category={notification.category} />;
  return <PersonAvatar name={firstActor.displayName} handle={firstActor.handle} size="medium" />;
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
  const wordsClasses = 'flex min-w-0 flex-1 flex-col gap-1 text-inherit no-underline';
  return (
    // Board E11: an unread row is tinted with a 2 px line down its left edge; a read row keeps a
    // see-through line of the same width, so the words never move when it is read.
    <li
      className={cn(
        'flex items-start gap-3 border-t border-l-2 border-hairline border-l-transparent p-4',
        isUnread && 'border-l-ink-heading bg-tint',
      )}
    >
      <RowStart notification={notification} />
      {text.href === null ? (
        <div className={wordsClasses}>
          <RowWords text={text} notification={notification} />
        </div>
      ) : (
        <Link
          to={text.href}
          className={cn(wordsClasses, 'rounded-field hover:[&_b]:underline')}
          onClick={() => {
            if (isUnread) onOpen(notification.id);
          }}
        >
          <RowWords text={text} notification={notification} />
        </Link>
      )}
    </li>
  );
}
