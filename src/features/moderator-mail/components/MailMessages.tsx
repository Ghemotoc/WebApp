/**
 * MailMessages: the messages of one moderator mail thread, oldest first (story S1-E10-11).
 *
 * For the member: "You" or "The moderation team", never which person wrote (criterion 2).
 * For staff (isStaffView): the writer's username and internal notes, marked as notes only staff
 * see. Plain text, kept as written (line breaks shown), never HTML.
 * Who shows it: MailThreadPage and StaffMailThreadPage.
 */
import type { MailMessage } from '../api/moderatorMail';
import { useMailTranslation } from '../registerMailTranslations';

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
 * One message.
 *
 * @returns a list item
 */
function MessageItem({ message, isStaffView }: { message: MailMessage; isStaffView: boolean }) {
  const { i18n } = useMailTranslation();
  const author = useAuthorLine(message, isStaffView);
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(message.at));
  const tone = toneOf(message);
  return (
    <li className={`flex flex-col gap-2 rounded-card border border-border p-4 ${tone}`}>
      <p className="m-0 text-sm text-meta">
        <span className="font-semibold text-heading">{author}</span> · {when}
      </p>
      <p className="m-0 whitespace-pre-line break-words text-body">{message.body}</p>
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
      {messages.map((message, index) => (
        <MessageItem key={`${message.at}-${index}`} message={message} isStaffView={isStaffView} />
      ))}
    </ol>
  );
}
