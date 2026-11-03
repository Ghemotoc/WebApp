/**
 * TicketMessageList: the messages of one support ticket, oldest first (story S1-E11-13; bundle
 * ADMIN-2h1).
 *
 * It draws what it is given: who wrote each message, as the reader is told, and the tone (the
 * person's own, the team's tinted, an internal note dashed). The member's page names "You" and
 * "The support team" only; the staff page names usernames and marks notes. Plain text, kept as
 * written (line breaks shown), never HTML.
 * Who shows it: MySupportTicketPage and StaffSupportTicketPage.
 */
import { useSupportTranslation } from '../registerSupportTranslations';

/** One message, ready to draw. */
export interface TicketMessageItem {
  author: string;
  tone: 'person' | 'team' | 'note';
  body: string;
  at: string;
}

/** The background for each tone: the team's tinted, a note dashed, the person's plain. */
const toneClasses: Record<TicketMessageItem['tone'], string> = {
  person: 'bg-surface',
  team: 'bg-panel',
  note: 'border-dashed bg-tint',
};

/**
 * One message.
 *
 * @returns a list item
 */
function MessageItem({ message }: { message: TicketMessageItem }) {
  const { i18n } = useSupportTranslation();
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(message.at));
  return (
    <li
      className={`flex flex-col gap-2 rounded-card border border-border p-4 ${toneClasses[message.tone]}`}
    >
      <p className="m-0 text-sm text-meta">
        <span className="font-semibold text-heading">{message.author}</span> · {when}
      </p>
      <p className="m-0 whitespace-pre-line break-words text-body">{message.body}</p>
    </li>
  );
}

/**
 * Renders the list.
 *
 * @param props.messages - the messages, oldest first
 * @param props.label - the list's accessible name
 * @returns the list of messages
 */
export function TicketMessageList({
  messages,
  label,
}: {
  messages: TicketMessageItem[];
  label: string;
}) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-label={label}>
      {messages.map((message, index) => (
        <MessageItem key={`${message.at}-${index}`} message={message} />
      ))}
    </ol>
  );
}
