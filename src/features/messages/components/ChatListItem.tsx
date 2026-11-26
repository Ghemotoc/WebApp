/**
 * ChatListItem: one row of the chats: the person, when, the last message's first words and
 * "New" while unread (story S1-E9-01; user story 4.2, boards E12-Messages and E13-Chat).
 *
 * As the boards draw it: a hairline above each row, the 36 px avatar, the name in the label
 * style with the time at the right in the meta style, the last line on one line with an ellipsis
 * under it, and a bold "New" at the far right while the chat has unread messages. Story 4.2:
 * "Chats are newest first, with the last line and New in bold when unread", so the last line is
 * bold then too and the word, not the weight alone, says it. The open chat sits on a soft tint
 * and has aria-current="page" (no side bar; NO-BARS, Robert, 23 Nov 2026). A removed last
 * message reads "[Removed by the moderation team]". The online dot follows the name while the
 * other person shows as online to the reader (S1-E13-01).
 * A story link being sent into a chat (GAPS-7a) stays in the address while the reader picks one.
 * Who shows it: ChatList. Where it goes: /messages/:handle.
 */
import { Link } from 'react-router';

import { OnlineDot } from '@/features/privacy/components/OnlineDot';

import type { ConversationSummary } from '../api/messages';
import { useSharedLink } from '../hooks/useSharedLink';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatAvatar } from './ChatAvatar';
import { dateLocaleFor } from '../../../lib/romania-time';

/** A day in milliseconds, for "yesterday" and the last week. */
const oneDay = 24 * 60 * 60 * 1000;

/** How many whole calendar days lie between a time and today (0 today, 1 yesterday). */
function daysAgo(date: Date): number {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThatDay = new Date(date);
  startOfThatDay.setHours(0, 0, 0, 0);
  return Math.round((startOfToday.getTime() - startOfThatDay.getTime()) / oneDay);
}

/**
 * The time beside a chat, as the boards write it: "12:40" today, "yesterday", the weekday in the
 * last week ("Mon"), and the date before that ("12 Nov").
 *
 * @returns the time words
 */
function useShortTime(iso: string): string {
  const { t, i18n } = useMessagesTranslation();
  const date = new Date(iso);
  const locale = dateLocaleFor(i18n.language);
  const days = daysAgo(date);
  if (days <= 0) {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  if (days === 1) return t('list.yesterday');
  if (days < 7) return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
}

/**
 * The line under the name.
 *
 * @returns the preview words
 */
function usePreview(chat: ConversationSummary): string {
  const { t } = useMessagesTranslation();
  if (chat.saidNoThanks) return t('list.saidNoThanks');
  if (chat.status !== 'accepted' && !chat.isRequestToMe) return t('list.waiting');
  if (chat.lastMessagePreview === null) return t('list.removed');
  return chat.lastMessageFromMe
    ? t('list.you', { text: chat.lastMessagePreview })
    : chat.lastMessagePreview;
}

/**
 * Renders the row.
 *
 * @returns a list item with a link to the chat
 */
export function ChatListItem(props: {
  chat: ConversationSummary;
  isOpen: boolean;
  /** The other person shows as online to the reader (S1-E13-01). */
  isOnline: boolean;
}) {
  const { chat, isOpen, isOnline } = props;
  const { t } = useMessagesTranslation();
  const preview = usePreview(chat);
  const time = useShortTime(chat.lastMessageAt);
  // A link being shared travels with the reader into the chat they pick (GAPS-7a).
  const shared = useSharedLink();
  const openStyle = isOpen ? 'bg-tint' : '';
  const previewStyle = chat.hasUnread ? 'font-semibold text-ink' : '';
  return (
    <li className="border-t border-hairline">
      <Link
        to={`/messages/${chat.otherHandle}${shared.query}`}
        aria-current={isOpen ? 'page' : undefined}
        className={`-mx-3 flex items-center gap-3 rounded-field px-3 py-3 text-ink no-underline hover:bg-tint ${openStyle}`}
      >
        <ChatAvatar name={chat.otherDisplayName} handle={chat.otherHandle} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 type-label text-ink-heading">
              <span className="truncate">{chat.otherDisplayName}</span>
              <OnlineDot isOnline={isOnline} />
            </span>
            <span className="flex-none type-meta">{time}</span>
          </span>
          <span className={`block truncate type-meta ${previewStyle}`}>{preview}</span>
        </span>
        {chat.hasUnread && <span className="type-label text-ink">{t('list.new')}</span>}
      </Link>
    </li>
  );
}
