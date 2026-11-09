/**
 * MailMessages: the messages of one moderator mail thread, oldest first (story S1-E10-11).
 *
 * For the member: "You" or "The moderation team", never which person wrote (criterion 2), drawn
 * as chat bubbles the way board ModMailOne does in the liquid glass redesign (bundle G8c): the
 * member's own words on the right in the main colour, the team's on the left in a glass bubble.
 * For staff (isStaffView): the writer's username and internal notes, marked as notes only staff
 * see, as plain cards (staff screens stay plain). Plain text, kept as written (line breaks shown),
 * never HTML.
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
 * One message as the member sees it: a bubble, with who and when under it.
 *
 * @returns a list item
 */
function MemberMessageItem({ message }: { message: MailMessage }) {
  const { i18n } = useMailTranslation();
  const author = useAuthorLine(message, false);
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(message.at));
  // The member's own words sit on the right, the team's on the left, as in a chat.
  const sideStyle = message.fromTeam ? 'items-start' : 'items-end';
  const bubbleStyle = message.fromTeam
    ? 'rounded-bl-md border border-border bg-surface text-ink'
    : 'rounded-br-md bg-primary text-on-primary';
  return (
    <li className={`flex flex-col gap-1 ${sideStyle}`}>
      <p
        className={`m-0 max-w-[min(560px,85%)] rounded-[18px] px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-line ${bubbleStyle}`}
      >
        {message.body}
      </p>
      <p className="m-0 text-xs text-meta">
        {author} · {when}
      </p>
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
