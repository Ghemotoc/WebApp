/**
 * ChatList: the left column of Messages: "Chats", the + to start a new chat, the All chats and
 * Requests switch, the notice about who may message the person, and the chats themselves
 * (story S1-E9-01; board Messages 5.5).
 *
 * Requests are first messages from people who don't follow the person; they wait under
 * "Requests" until accepted (criterion 2). The switch is two toggle buttons with aria-pressed and
 * a tick on the chosen one, so the choice never relies on colour (DoD, pill system).
 * Who shows it: MessagesPage. What it calls: useConversations; NewChatDialog for the +.
 */
import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { useOnlineHandles } from '@/features/privacy/hooks/useOnlineStatus';

import type { ConversationSummary } from '../api/messages';
import { useConversations } from '../hooks/useMessages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatListItem } from './ChatListItem';
import { MessagesRulesNotice } from './MessagesRulesNotice';
import { NewChatButton } from './NewChatButton';

/** Which chats the list shows. */
type ListView = 'all' | 'requests';

/** One button of the All chats and Requests switch. */
function ViewButton(props: {
  isChosen: boolean;
  label: string;
  count?: number;
  onChoose: () => void;
}) {
  const { t } = useMessagesTranslation();
  const chosenStyle = props.isChosen
    ? 'bg-primary text-on-primary'
    : 'bg-transparent text-heading hover:bg-tint';
  return (
    <button
      type="button"
      aria-pressed={props.isChosen}
      onClick={props.onChoose}
      className={`inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border-0 px-3 text-sm font-semibold ${chosenStyle}`}
    >
      {props.isChosen && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5 10 17l9-10" />
        </svg>
      )}
      {props.label}
      {props.count !== undefined && props.count > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] leading-none font-bold text-on-gold">
          <span aria-hidden="true">{props.count}</span>
          <span className="sr-only">{t('list.requestsWaiting', { count: props.count })}</span>
        </span>
      )}
    </button>
  );
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
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 id="chats-heading" className="m-0 font-heading text-[26px] font-bold text-heading">
          {t('list.title')}
        </h2>
        <NewChatButton />
      </div>
      <div
        role="group"
        aria-label={t('list.tabsLabel')}
        className="mx-4 flex gap-1 rounded-full border border-control-border p-1"
      >
        <ViewButton
          isChosen={view === 'all'}
          label={t('list.all')}
          onChoose={() => setView('all')}
        />
        <ViewButton
          isChosen={view === 'requests'}
          label={t('list.requests')}
          count={requestCount}
          onChoose={() => setView('requests')}
        />
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
