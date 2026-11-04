/**
 * ChatListItem: one row of the Chats list: the person, when, and the last message's first words
 * (story S1-E9-01; board Messages 5.5).
 *
 * The open chat has the board's gold bar on the left and aria-current="page". Unread chats are
 * bold with a plum dot and say "new messages" to screen readers, so colour is never the only
 * sign. A removed last message reads "[Removed by the moderation team]". The online dot follows
 * the name while the other person shows as online to the reader (S1-E13-01).
 * Who shows it: ChatList. Where it goes: /messages/:handle.
 */
import { Link } from 'react-router';

import { OnlineDot } from '@/features/privacy/components/OnlineDot';

import type { ConversationSummary } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatAvatar } from './ChatAvatar';

/**
 * The time beside a chat: the hour today, the date before that.
 *
 * @returns the formatted time
 */
function shortTime(iso: string, language: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const options: Intl.DateTimeFormatOptions = isToday
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat(language, options).format(date);
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
  const { t, i18n } = useMessagesTranslation();
  const preview = usePreview(chat);
  const openStyle = isOpen ? 'border-l-gold bg-tint' : 'border-l-transparent';
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        to={`/messages/${chat.otherHandle}`}
        aria-current={isOpen ? 'page' : undefined}
        className={`flex min-h-[64px] items-center gap-3 border-l-4 px-4 py-3 text-ink no-underline hover:bg-tint ${openStyle}`}
      >
        <ChatAvatar name={chat.otherDisplayName} handle={chat.otherHandle} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-heading">
              {chat.otherDisplayName}
              <span className="ml-1.5 inline-flex align-middle">
                <OnlineDot isOnline={isOnline} />
              </span>
              {chat.hasUnread && (
                <>
                  <span
                    aria-hidden="true"
                    className="ml-1.5 inline-block size-2 rounded-full bg-primary"
                  />
                  <span className="sr-only">, {t('list.unread')}</span>
                </>
              )}
            </span>
            <span className="flex-none text-xs text-meta">
              {shortTime(chat.lastMessageAt, i18n.language)}
            </span>
          </span>
          <span
            className={`truncate text-sm ${chat.hasUnread ? 'font-semibold text-ink' : 'text-meta'}`}
          >
            {preview}
          </span>
        </span>
      </Link>
    </li>
  );
}
