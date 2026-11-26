/**
 * MailMessages: the messages of one moderator mail thread, oldest first (story S1-E10-11).
 *
 * For the member: "You" or "The moderation team", never which person wrote (criterion 2), drawn
 * as blocks the way board J24 does (user stories bundle 10; it replaces the chat bubbles of bundle
 * G8c): who wrote it and when on top, the words under it, the team's blocks tinted.
 * For staff (isStaffView): the writer's username and internal notes, marked as notes only staff
 * see, as plain cards (staff screens stay plain). Plain text, kept as written (line breaks shown),
 * never HTML.
 * Who shows it: MailThreadPage and StaffMailThreadPage.
 */
import { dayAndTime } from '@/lib/dayAndTime';

import type { MailMessage } from '../api/moderatorMail';
import { useMailTranslation } from '../registerMailTranslations';
import { dateLocaleFor } from '../../../lib/romania-time';

/**
 * Who wrote a message, as the reader is told.
 *
 * @returns the words
 */
function useAuthorLine(message: MailMessage, isStaffView: boolean): string {
  const { t } = useMailTranslation();
  if (message.isInternalNote) return t('thread.note', { handle: message.authorHandle ?? '' });
  if (!message.fromTeam)
    return isStaffView
      ? t('thread.member', { handle: message.authorHandle ?? '' })
      : t('thread.you');
  return isStaffView
    ? t('thread.teamBy', { handle: message.authorHandle ?? '' })
    : t('thread.team');
}

/**
 * The message's background: notes dashed, the team's tinted, the member's plain.
 *
 * @returns the classes
 */
function toneOf(message: MailMessage): string {
  if (message.isInternalNote) return 'border-dashed bg-tint';
  if (message.fromTeam) return 'bg-panel';
  return 'bg-surface';
}

/**
 * One message as the member sees it (user stories bundle 10, board J24): who wrote it and when on
 * top, then the words, in a block; the team's blocks are tinted. Who wrote it is always in words,
 * never colour alone.
 *
 * @returns a list item
 */
function MemberMessageItem({ message }: { message: MailMessage }) {
  const { i18n } = useMailTranslation();
  const author = useAuthorLine(message, false);
  // Step 1: the team's messages get the tint, the member's own the plain box.
  const blockStyle = message.fromTeam ? 'bg-tint' : 'bg-surface';
  return (
    <li className={`flex flex-col gap-1 rounded-card px-4 py-4 ${blockStyle}`}>
      {/* Step 2: who and when, the name in bold. */}
      <p className="m-0 type-meta text-ink-muted">
        <span className="font-semibold text-ink-heading">{author}</span> ·{' '}
        <time dateTime={message.at}>{dayAndTime(message.at, i18n.language)}</time>
      </p>
      <p className="m-0 type-body break-words whitespace-pre-line text-ink">{message.body}</p>
    </li>
  );
}

/**
 * One message as staff see it: a plain card with the writer's username.
 *
 * @returns a list item
 */
function StaffMessageItem({ message }: { message: MailMessage }) {
  const { i18n } = useMailTranslation();
  const author = useAuthorLine(message, true);
  const when = new Intl.DateTimeFormat(dateLocaleFor(i18n.language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(message.at));
  const tone = toneOf(message);
  return (
    <li className={`flex flex-col gap-2 rounded-card border border-border p-4 ${tone}`}>
      <p className="m-0 type-body text-ink-muted">
        <span className="font-semibold text-ink-heading">{author}</span> · {when}
      </p>
      <p className="m-0 whitespace-pre-line break-words text-ink-muted">{message.body}</p>
    </li>
  );
}

/**
 * Renders the list.
 *
 * @returns the list of messages
 */
export function MailMessages({
  messages,
  isStaffView = false,
}: {
  messages: MailMessage[];
  isStaffView?: boolean;
}) {
  const { t } = useMailTranslation();
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-label={t('thread.messagesLabel')}>
      {messages.map((message, index) =>
        isStaffView ? (
          <StaffMessageItem key={`${message.at}-${index}`} message={message} />
        ) : (
          <MemberMessageItem key={`${message.at}-${index}`} message={message} />
        ),
      )}
    </ol>
  );
}
