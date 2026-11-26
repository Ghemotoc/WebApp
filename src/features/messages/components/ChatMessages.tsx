/**
 * ChatMessages: the messages of one chat, oldest first, as speech bubbles (story S1-E9-01;
 * board Messages 5.5; board Chat in the liquid glass redesign, bundle G8c).
 *
 * Board E13-Chat (user story 4.3): the person's own messages sit on the right on the tint, the
 * other person's on the left on the solid surface, with "name · time" under each and a quiet
 * "Today" (or the date) where the day changes. Each message from the other person has a small
 * "…" that shows its Report (CLAUDE.md rule 6); a report takes that message and up to 20 before
 * it to the moderation team (S1-E9-02). Words are plain text, shown as written with their line
 * breaks, never HTML or Markdown, so nothing in a message can run or lead to another website.
 * One exception
 * (bundle GAPS-7, part a): a link to a story, chapter or passage on this website can be pressed
 * and opens inside the app; lib/storyLinks.ts decides what counts, and the story's own rules
 * (rating, blocks, visibility) still decide whether the reader may open it. A message the
 * moderation team removed reads "[Removed by the moderation team]".
 * Who shows it: ChatPanel. What it calls: ReportButton (S1-E10-01) and lib/storyLinks.ts.
 */
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';

import { splitStoryLinks } from '@/lib/storyLinks';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ChatMessage } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';
import { dateLocaleFor } from '../../../lib/romania-time';

/** The hour and minute of a message. */
function timeOf(iso: string, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** The day a message was sent, for the line between days. */
function dayOf(iso: string, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), { dateStyle: 'medium' }).format(
    new Date(iso),
  );
}

/** Whether a message was sent today, so the day line can say "Today" as the board does. */
function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

/**
 * A message's words, with this website's story links made pressable and everything else plain.
 *
 * @param props.body - the message as written
 * @returns the words and links in order
 */
function MessageWords({ body }: { body: string }) {
  return (
    <>
      {splitStoryLinks(body).map((piece, index) =>
        piece.kind === 'storyLink' ? (
          // The pieces never reorder, so their place is a safe key.
          <Link
            key={index}
            to={piece.path}
            className="font-semibold text-inherit underline [overflow-wrap:anywhere]"
          >
            {piece.text}
          </Link>
        ) : (
          <span key={index}>{piece.text}</span>
        ),
      )}
    </>
  );
}

/**
 * The small "…" beside a message from the other person, and the Report it shows (user story 4.3:
 * "Each message from the other person has Report in its menu"). A disclosure button, so the
 * bubble stays as the board draws it until the reader asks; Report then asks the reason
 * (S1-E10-01) and takes the message and up to 20 before it to the moderation team (S1-E9-02).
 *
 * @returns the button and, while open, Report
 */
function MessageMenu({ message, otherName }: { message: ChatMessage; otherName: string }) {
  const { t, i18n } = useMessagesTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const time = timeOf(message.at, i18n.language);
  return (
    <div className="flex flex-none items-center gap-2">
      <button
        type="button"
        aria-label={t('chat.moreFor', { name: otherName, time })}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-tint hover:text-ink-heading"
      >
        <ActionIcon name="more" size={18} />
      </button>
      <div id={menuId} hidden={!isOpen}>
        <ReportButton
          itemType="message"
          itemReference={message.id}
          itemLabel={t('chat.reportLabel', { name: otherName, time })}
        />
      </div>
    </div>
  );
}

/**
 * One message: the bubble, then "name · time" under it (board E13: the other person's on the
 * solid surface at the left, the reader's on the tint at the right, 16 px corners, at most 78 %
 * of the column).
 *
 * @returns a list item
 */
function MessageItem({ message, otherName }: { message: ChatMessage; otherName: string }) {
  const { t, i18n } = useMessagesTranslation();
  const time = timeOf(message.at, i18n.language);
  const sideStyle = message.fromMe ? 'items-end' : 'items-start';
  const rowStyle = message.fromMe ? 'justify-end' : 'justify-start';
  const bubbleStyle = message.fromMe ? 'bg-tint' : 'bg-surface-solid';
  const canReport = !message.fromMe && message.body !== null;
  return (
    <li className={`flex flex-col ${sideStyle}`}>
      <div className={`flex w-full items-center gap-1 ${rowStyle}`}>
        <p
          className={`m-0 max-w-[78%] rounded-card px-4 py-3 type-body break-words whitespace-pre-line text-ink ${bubbleStyle}`}
        >
          {message.body === null ? (
            <em>{t('chat.removed')}</em>
          ) : (
            <MessageWords body={message.body} />
          )}
        </p>
        {canReport && <MessageMenu message={message} otherName={otherName} />}
      </div>
      <p className="m-0 type-meta">
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
          <li key={`day-${day}`} className="text-center type-meta">
            {isToday(message.at) ? t('chat.today') : day}
          </li>,
          item,
        ];
      })}
    </ol>
  );
}
