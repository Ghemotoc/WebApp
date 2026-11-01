/**
 * ChatPanel: one chat: the person at the top, the messages, and at the bottom whatever the reader
 * can do now (story S1-E9-01; board Messages 5.5).
 *
 * The bottom is one of four things, decided by the database (conversation_with()):
 * - a request to the reader: Accept request and Delete request (criterion 2);
 * - the reader may write: the message box (with a first-message hint before the first one);
 * - the reader's own request waits: "Your message is waiting in …'s requests" (criterion 2);
 * - otherwise "<name> isn't taking messages right now", whatever the reason (S1-E9-03).
 * The messages scroll inside their own region, which keeps the newest in view.
 * Who shows it: MessagesPage, with AboutChatPanel beside it. What it calls: useConversation.
 */
import { useEffect, useRef } from 'react';

import { Notice } from '@/components/ui/Notice';

import type { Conversation } from '../api/messages';
import { useConversation } from '../hooks/useMessages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { AboutChatPanel } from './AboutChatPanel';
import { ChatAvatar } from './ChatAvatar';
import { ChatMessages } from './ChatMessages';
import { MessageComposer } from './MessageComposer';
import { RequestActions } from './RequestActions';

/** The state useConversation gives. */
type ChatState = ReturnType<typeof useConversation>;

/** A plain line at the bottom of the chat. */
function BottomNote({ text }: { text: string }) {
  return <p className="m-0 border-t border-border p-4 text-sm text-meta">{text}</p>;
}

/**
 * What the reader can do at the bottom of the chat.
 *
 * @returns the request's buttons, the box, or a note
 */
function ChatBottom({ chat, state }: { chat: Conversation; state: ChatState }) {
  const { t } = useMessagesTranslation();
  const name = chat.displayName;
  if (chat.isRequestToMe) {
    return (
      <RequestActions
        otherName={name}
        isAnswering={state.isAnswering}
        failure={state.answerState.failure}
        onAnswer={state.answer}
      />
    );
  }
  if (chat.canSend) {
    return (
      <>
        {chat.status === null && <BottomNote text={t('chat.startHint', { name })} />}
        <MessageComposer
          otherName={name}
          isSending={state.isSending}
          failure={state.sendState.failure}
          waitMinutes={state.sendState.waitMinutes}
          onSend={state.send}
        />
      </>
    );
  }
  return <BottomNote text={t(chat.isWaiting ? 'chat.waiting' : 'chat.notTaking', { name })} />;
}

/**
 * The scrolling messages, kept at the newest one as messages arrive.
 *
 * @returns the scroll region
 */
function MessagesRegion({ chat }: { chat: Conversation }) {
  const { t } = useMessagesTranslation();
  const regionRef = useRef<HTMLDivElement>(null);
  const newest = chat.messages.at(-1)?.id;
  // Step: whenever a new message arrives, scroll to the bottom.
  useEffect(() => {
    const region = regionRef.current;
    if (region !== null) region.scrollTop = region.scrollHeight;
  }, [newest]);
  return (
    <div
      ref={regionRef}
      tabIndex={0}
      role="region"
      aria-label={t('chat.messagesLabel', { name: chat.displayName })}
      className="max-h-[min(560px,65vh)] min-h-[240px] overflow-y-auto bg-paper p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      <ChatMessages messages={chat.messages} otherName={chat.displayName} />
    </div>
  );
}

/**
 * The chat, once loaded.
 *
 * @returns the chat section and the About column
 */
function LoadedChat({ chat, state }: { chat: Conversation; state: ChatState }) {
  const { t } = useMessagesTranslation();
  return (
    <>
      <title>{t('chatDocumentTitle', { name: chat.displayName })}</title>
      <section
        aria-labelledby="chat-heading"
        className="flex min-w-0 flex-col border-border lg:border-x"
      >
        <header className="flex items-center gap-3 border-b border-border p-4">
          <ChatAvatar name={chat.displayName} handle={chat.handle} />
          <div className="flex min-w-0 flex-col">
            <h2
              id="chat-heading"
              className="m-0 truncate font-heading text-xl font-bold text-heading"
            >
              {chat.displayName}
            </h2>
            <p className="m-0 truncate text-sm text-meta">@{chat.handle}</p>
          </div>
        </header>
        <MessagesRegion chat={chat} />
        <ChatBottom chat={chat} state={state} />
      </section>
      <AboutChatPanel chat={chat} />
    </>
  );
}

/**
 * Renders the chat with this person.
 *
 * @param handle - the other person's username from the address
 * @returns the chat, or a plain line while it can't be shown
 */
export function ChatPanel({ handle }: { handle: string }) {
  const { t } = useMessagesTranslation();
  const state = useConversation(handle);
  if (state.chat.isError)
    return (
      <div className="p-4">
        <Notice tone="error">{t('chat.loadFailed')}</Notice>
      </div>
    );
  if (state.chat.isPending) return null;
  if (state.chat.data === null) return <p className="m-0 p-4 text-body">{t('chat.notFound')}</p>;
  return <LoadedChat chat={state.chat.data} state={state} />;
}
