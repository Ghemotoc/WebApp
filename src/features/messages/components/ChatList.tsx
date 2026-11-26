/**
 * ChatList: the left column of Messages: the Chats and Requests switch, the rules in words and
 * the chats themselves (story S1-E9-01; user story 4.2, boards E12-Messages and E13-Chat).
 *
 * With no chat open (board E12) the column shows the switch, then the rules (MessagesRulesNotice)
 * or, under Requests, what a request is, then the rows. Requests are first messages from people
 * who don't follow the person; they wait under "Requests" until accepted (criterion 2), and move
 * to Chats once accepted. The switch is the shared SegmentedControl (two radio buttons, the
 * chosen one in bold under the bubble, so the choice never rests on colour alone); "Requests · 1"
 * says how many wait. Robert, 9 Nov 2026, 12:14 UTC: the first tab is "Conversații" (Chats).
 * With a chat open (board E13, from 1024 px) the column is the rows alone: every chat and
 * request, newest first, so the open one is always in the list.
 * Who shows it: MessagesPage. What it calls: useConversations and useOnlineHandles.
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

/** Which chats the list shows: chats, requests, or (beside an open chat) every one. */
type ListView = 'all' | 'requests' | 'everything';

/** The chats a view shows. */
function chatsFor(chats: ConversationSummary[], view: ListView): ConversationSummary[] {
  if (view === 'everything') return chats;
  return chats.filter((chat) => chat.isRequestToMe === (view === 'requests'));
}

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
  const shown = chatsFor(chats, view);
  // Who of them is online for this reader, read once for the whole list (S1-E13-01).
  const online = useOnlineHandles(shown.map((chat) => chat.otherHandle));
  if (shown.length === 0) {
    return (
      <p className="m-0 type-body text-ink-muted">
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
 * The switch and the words under it, shown while no chat is open.
 *
 * @returns the switch and the rules, or what a request is
 */
function ListTools({
  view,
  onViewChange,
  requestCount,
}: {
  view: 'all' | 'requests';
  onViewChange: (view: 'all' | 'requests') => void;
  requestCount: number;
}) {
  const { t } = useMessagesTranslation();
  return (
    <>
      <SegmentedControl
        legend={t('list.tabsLabel')}
        isLegendVisible={false}
        name="chat-view"
        options={viewOptions(t, requestCount)}
        value={view}
        onChange={onViewChange}
      />
      {view === 'requests' ? (
        <p className="m-0 type-body text-ink-muted">{t('list.requestsHint')}</p>
      ) : (
        <MessagesRulesNotice />
      )}
    </>
  );
}

/**
 * Renders the column.
 *
 * @param props.openHandle - the username of the chat on screen, if any
 * @returns the list column
 */
export function ChatList({ openHandle }: { openHandle: string | null }) {
  const { t } = useMessagesTranslation();
  const chats = useConversations();
  const [chosenView, setChosenView] = useState<'all' | 'requests'>('all');
  const requestCount = (chats.data ?? []).filter((chat) => chat.isRequestToMe).length;
  // Beside an open chat the column is the rows alone (board E13).
  const view: ListView = openHandle === null ? chosenView : 'everything';
  return (
    <section aria-labelledby="chats-heading" className="flex min-w-0 flex-col gap-4">
      {/* The switch's first choice says the same word, so the heading is for screen readers. */}
      <h2 id="chats-heading" className="sr-only">
        {t('list.title')}
      </h2>
      {openHandle === null && (
        <ListTools view={chosenView} onViewChange={setChosenView} requestCount={requestCount} />
      )}
      {chats.isError && <Notice tone="error">{t('list.loadFailed')}</Notice>}
      {chats.data !== undefined && (
        <ChatRows chats={chats.data} view={view} openHandle={openHandle} />
      )}
    </section>
  );
}
