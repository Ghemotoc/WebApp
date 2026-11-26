/**
 * TicketMessageList: the messages of one support ticket, oldest first (story S1-E11-13; bundle
 * ADMIN-2h1).
 *
 * It draws what it is given: who wrote each message, as the reader is told, and the tone (the
 * person's own, the team's tinted, an internal note dashed). The member's page names "You" and
 * "The support team" only; the staff page names usernames and marks notes. Plain text, kept as
 * written (line breaks shown), never HTML. The staff page adds a short detail after the time: how a
 * message came in or whether an answer was emailed (part h2). The member's page draws them as
 * blocks straight on the page (user stories bundle 10, board J21; it replaces the chat bubbles of
 * bundle G11c): who wrote it and when on top, the words under it, the team's blocks tinted.
 * Who shows it: MySupportTicketPage and StaffSupportTicketPage.
 */
import { dayAndTime } from '@/lib/dayAndTime';

import { useSupportTranslation } from '../registerSupportTranslations';
import { dateLocaleFor } from '../../../lib/romania-time';

/** One message, ready to draw. */
export interface TicketMessageItem {
  author: string;
  tone: 'person' | 'team' | 'note';
  body: string;
  at: string;
  /** A short extra word after the time, such as "Emailed" (staff page, part h2). */
  detail?: string;
}

/** The background for each tone: the team's tinted, a note dashed, the person's plain. */
const toneClasses: Record<TicketMessageItem['tone'], string> = {
  person: 'bg-surface',
  team: 'bg-panel',
  note: 'border-dashed bg-tint',
};

/**
 * One message as a block (the member's page, user stories bundle 10, board J21): who wrote it and
 * when on top, then the words. The team's blocks are tinted, the person's plain, and who wrote it
 * is always in words, never colour alone.
 *
 * @returns a list item
 */
function MessageBlockItem({ message }: { message: TicketMessageItem }) {
  const { i18n } = useSupportTranslation();
  // Step 1: the team's messages get the tint, the person's own the plain box.
  const blockStyle = message.tone === 'team' ? 'bg-tint' : 'bg-surface';
  return (
    <li className={`flex flex-col gap-1 rounded-card px-4 py-4 ${blockStyle}`}>
      {/* Step 2: who and when, as a meta line, the name in bold. */}
      <p className="m-0 type-meta text-ink-muted">
        <span className="font-semibold text-ink-heading">{message.author}</span> ·{' '}
        <time dateTime={message.at}>{dayAndTime(message.at, i18n.language)}</time>
      </p>
      <p className="m-0 type-body break-words whitespace-pre-line text-ink">{message.body}</p>
    </li>
  );
}

/**
 * One message as a card (the staff page).
 *
 * @returns a list item
 */
function MessageItem({ message }: { message: TicketMessageItem }) {
  const { i18n } = useSupportTranslation();
  const when = new Intl.DateTimeFormat(dateLocaleFor(i18n.language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(message.at));
  return (
    <li
      className={`flex flex-col gap-2 rounded-card border border-border p-4 ${toneClasses[message.tone]}`}
    >
      <p className="m-0 type-body text-ink-muted">
        <span className="font-semibold text-ink-heading">{message.author}</span> · {when}
        {message.detail !== undefined && ` · ${message.detail}`}
      </p>
      <p className="m-0 whitespace-pre-line break-words text-ink-muted">{message.body}</p>
    </li>
  );
}

/**
 * Renders the list.
 *
 * @param props.messages - the messages, oldest first
 * @param props.label - the list's accessible name
 * @param props.layout - "cards" (staff, the default) or "blocks" (the member's page, bundle 10)
 * @returns the list of messages
 */
export function TicketMessageList({
  messages,
  label,
  layout = 'cards',
}: {
  messages: TicketMessageItem[];
  label: string;
  layout?: 'cards' | 'blocks';
}) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-label={label}>
      {messages.map((message, index) =>
        layout === 'blocks' ? (
          <MessageBlockItem key={`${message.at}-${index}`} message={message} />
        ) : (
          <MessageItem key={`${message.at}-${index}`} message={message} />
        ),
      )}
    </ol>
  );
}
