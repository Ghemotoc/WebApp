/**
 * ChatMessages: the messages of one chat, oldest first, as speech bubbles (story S1-E9-01;
 * board Messages 5.5; board Chat in the liquid glass redesign, bundle G8c).
 *
 * The person's own messages sit on the right in plum, the other person's on the left in glass
 * with a round flag button beside them, named "Report the message from …" (CLAUDE.md rule 6); a
 * report takes that message and up to 20 before it to the moderation team (S1-E9-02). Each has
 * "name · time" under it. Words are plain text, shown as written with their line breaks, never
 * HTML or Markdown, so nothing in a message can run or link anywhere. A message the moderation
 * team removed reads "[Removed by the moderation team]".
 * Who shows it: ChatPanel. What it calls: ReportButton (S1-E10-01).
 */
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ChatMessage } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

/** The hour and minute of a message. */
function timeOf(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

/** The day a message was sent, for the line between days. */
function dayOf(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(iso));
}

/**
 * One message.
 *
 * @returns a list item
 */
function MessageItem({ message, otherName }: { message: ChatMessage; otherName: string }) {
  const { t, i18n } = useMessagesTranslation();
  const time = timeOf(message.at, i18n.language);
  const sideStyle = message.fromMe ? 'items-end' : 'items-start';
  const bubbleStyle = message.fromMe
    ? 'rounded-br-md bg-primary text-on-primary'
    : 'rounded-bl-md border border-border bg-surface text-ink';
  return (
    <li className={`flex flex-col gap-1 ${sideStyle}`}>
      <div className="flex max-w-full items-start gap-2">
        <p
          className={`m-0 max-w-[min(520px,85vw)] rounded-[18px] px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-line ${bubbleStyle}`}
        >
          {message.body ?? <em>{t('chat.removed')}</em>}
        </p>
        {!message.fromMe && message.body !== null && (
          <ReportButton
            itemType="message"
            itemReference={message.id}
            itemLabel={t('chat.reportLabel', { name: otherName, time })}
            look="icon"
          />
        )}
      </div>
      <p className="m-0 text-xs text-meta">
        {message.fromMe ? t('chat.you') : otherName} · {time}
      </p>
    </li>
  );
}

/**
 * Renders the list, with a day line wherever the day changes.
 *
 * @returns the ordered list of messages
 */
export function ChatMessages({
  messages,
  otherName,
}: {
  messages: ChatMessage[];
  otherName: string;
}) {
  const { t, i18n } = useMessagesTranslation();
  return (
    <ol
      className="m-0 flex list-none flex-col gap-4 p-0"
      aria-label={t('chat.messagesLabel', { name: otherName })}
    >
      {messages.flatMap((message, index) => {
        // A day line before the first message of each day.
        const day = dayOf(message.at, i18n.language);
        const previous = messages[index - 1];
        const isNewDay = previous === undefined || dayOf(previous.at, i18n.language) !== day;
        const item = <MessageItem key={message.id} message={message} otherName={otherName} />;
        if (!isNewDay) return [item];
        return [
          <li
            key={`day-${day}`}
            className="self-center rounded-full border border-border bg-tint px-3 py-1 text-xs font-semibold text-heading"
          >
            {day}
          </li>,
          item,
        ];
      })}
    </ol>
  );
}
