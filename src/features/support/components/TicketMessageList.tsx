/**
 * TicketMessageList: the messages of one support ticket, oldest first (story S1-E11-13; bundle
 * ADMIN-2h1).
 *
 * It draws what it is given: who wrote each message, as the reader is told, and the tone (the
 * person's own, the team's tinted, an internal note dashed). The member's page names "You" and
 * "The support team" only; the staff page names usernames and marks notes. Plain text, kept as
 * written (line breaks shown), never HTML. The staff page adds a short detail after the time: how a
 * message came in or whether an answer was emailed (part h2). The member's page draws them as a
 * chat (bundle G11c, the canvas's SupportRequest board): the person's own messages as plum bubbles
 * on the right, the team's as glass bubbles on the left, each with who wrote it and when under it.
 * Who shows it: MySupportTicketPage and StaffSupportTicketPage.
 */
import { useSupportTranslation } from '../registerSupportTranslations';

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
 * One message as a chat bubble (the member's page): the person's own on the right in plum, the
 * team's on the left in glass. Who wrote it is in words under the bubble, never colour alone.
 *
 * @returns a list item
 */
function ChatBubbleItem({ message }: { message: TicketMessageItem }) {
  const { i18n } = useSupportTranslation();
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(message.at));
  // Step 1: the side and the bubble's look follow who wrote it.
  const isOwn = message.tone === 'person';
  const sideStyle = isOwn ? 'items-end self-end' : 'items-start self-start';
  const bubbleStyle = isOwn
    ? 'rounded-[22px_22px_6px_22px] bg-primary text-on-primary'
    : 'rounded-[22px_22px_22px_6px] border border-border bg-surface text-ink shadow-card';
  return (
    <li className={`flex max-w-[min(560px,88%)] flex-col gap-1 ${sideStyle}`}>
      <p
        className={`m-0 px-[18px] py-3.5 text-[15px] leading-relaxed break-words whitespace-pre-line ${bubbleStyle}`}
      >
        {message.body}
      </p>
      <p className="m-0 text-[13px] text-meta">
        {message.author} · {when}
      </p>
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
        {message.detail !== undefined && ` · ${message.detail}`}
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
 * @param props.layout - "cards" (staff, the default) or "chat" (the member's page, G11c)
 * @returns the list of messages
 */
export function TicketMessageList({
  messages,
  label,
  layout = 'cards',
}: {
  messages: TicketMessageItem[];
  label: string;
  layout?: 'cards' | 'chat';
}) {
  // The chat sits in one glass card, as on the board; the staff cards stand on their own.
  const listStyle =
    layout === 'chat'
      ? 'gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6'
      : 'gap-3';
  return (
    <ol className={`m-0 flex list-none flex-col p-0 ${listStyle}`} aria-label={label}>
      {messages.map((message, index) =>
        layout === 'chat' ? (
          <ChatBubbleItem key={`${message.at}-${index}`} message={message} />
        ) : (
          <MessageItem key={`${message.at}-${index}`} message={message} />
        ),
      )}
    </ol>
  );
}
