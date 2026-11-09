/**
 * ChatList: the left column of Messages: the Chats and Requests switch with the + to start a new
 * chat beside it, the notice about who may message the person, and the chats themselves
 * (story S1-E9-01; board Messages 5.5, redrawn in bundle G8c).
 *
 * Requests are first messages from people who don't follow the person; they wait under
 * "Requests" until accepted (criterion 2), and move to Chats once accepted. The switch is the
 * shared glass SegmentedControl (two radio buttons, the chosen one in bold under the white
 * bubble, so the choice never rests on colour alone); "Requests · 1" says how many wait.
 * Robert, 9 Nov 2026, 12:14 UTC: the first tab is "Conversații" (Chats), not "Toate
 * conversațiile". The column's heading would say the same word right above it, so it is kept for
 * screen readers only.
 * Who shows it: MessagesPage. What it calls: useConversations; NewChatDialog for the +.
 */
import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useOnlineHandles } from '@/features/privacy/hooks/useOnlineStatus';

import type { ConversationSummary } from '../api/messages';
import { useConversations } from '../hooks/useMessages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatListItem } from './ChatListItem';
import { MessagesRulesNotice } from './MessagesRulesNotice';
import { NewChatButton } from './NewChatButton';

/** Which chats the list shows. */
type ListView = 'all' | 'requests';

/**
 * The chats for the chosen view, or the empty line.
 *
 * @returns the list
 */
function ChatRows({
  chats,
  view,
  openHandle,
}: {
  chats: ConversationSummary[];
  view: ListView;
  openHandle: string | null;
}) {
  const { t } = useMessagesTranslation();
  const shown = chats.filter((chat) => chat.isRequestToMe === (view === 'requests'));
  // Who of them is online for this reader, read once for the whole list (S1-E13-01).
  const online = useOnlineHandles(shown.map((chat) => chat.otherHandle));
  if (shown.length === 0) {
    return (
      <p className="m-0 px-4 py-6 text-sm text-meta">
        {t(view === 'requests' ? 'list.requestsEmpty' : 'list.empty')}
      </p>
    );
  }
  return (
    <ul
      className="m-0 list-none p-0"
      aria-label={t(view === 'requests' ? 'list.requests' : 'list.all')}
    >
      {shown.map((chat) => (
        <ChatListItem
          key={chat.otherHandle}
          chat={chat}
          isOpen={chat.otherHandle.toLowerCase() === openHandle?.toLowerCase()}
          isOnline={online.has(chat.otherHandle.toLowerCase())}
        />
      ))}
    </ul>
  );
}

/**
 * The two choices of the switch; Requests carries the number waiting ("Requests · 1").
 *
 * @param t - the messages translations
 * @param requestCount - how many requests wait
 * @returns the options
 */
function viewOptions(
  t: (key: string, values?: Record<string, unknown>) => string,
  requestCount: number,
) {
  const requests =
    requestCount > 0 ? t('list.requestsCount', { number: requestCount }) : t('list.requests');
  return [
    { value: 'all' as const, label: t('list.all') },
    { value: 'requests' as const, label: requests },
  ];
}

/**
 * Renders the column.
 *
 * @param openHandle - the username of the chat on screen, if any
 * @returns the list column
 */
export function ChatList({ openHandle }: { openHandle: string | null }) {
  const { t } = useMessagesTranslation();
  const chats = useConversations();
  const [view, setView] = useState<ListView>('all');
  const requestCount = (chats.data ?? []).filter((chat) => chat.isRequestToMe).length;
  return (
    <section aria-labelledby="chats-heading" className="flex min-w-0 flex-col gap-4">
      {/* The switch's first choice says the same word, so the heading is for screen readers. */}
      <h2 id="chats-heading" className="sr-only">
        {t('list.title')}
      </h2>
      <div className="flex items-center gap-2 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <SegmentedControl
            legend={t('list.tabsLabel')}
            isLegendVisible={false}
            name="chat-view"
            isFullWidth
            options={viewOptions(t, requestCount)}
            value={view}
            onChange={setView}
          />
        </div>
        <NewChatButton />
      </div>
      <div className="px-4">
        {view === 'requests' ? (
          <p className="m-0 text-sm text-meta">{t('list.requestsHint')}</p>
        ) : (
          <MessagesRulesNotice />
        )}
      </div>
      {chats.isError && <Notice tone="error">{t('list.loadFailed')}</Notice>}
      {chats.data !== undefined && (
        <ChatRows chats={chats.data} view={view} openHandle={openHandle} />
      )}
    </section>
  );
}
