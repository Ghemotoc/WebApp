/**
 * ChatPanel: one chat: the person at the top with Block and Report (ChatHeader from 1024 px,
 * ChatFocusBar below; S1-E9-02), the messages, and at the bottom whatever the reader can do now
 * (story S1-E9-01; user story 4.3, board E13-Chat), with About this chat beside or under it.
 *
 * The bottom is one of six things, decided by the database (conversation_with()):
 * - a request to the reader: Accept request, No thanks and Delete request (criterion 2);
 * - the reader may write: the message box (with a first-message hint before the first one);
 * - the reader's own request waits: "Your message is waiting in …'s requests" (criterion 2);
 * - the other person said "No thanks": their fixed reply and when to ask again (IDEAS-2 idea 7);
 * - the reader's own "Let adults message me" switch stops it: a line saying so and Change
 *   (user story 4.3; only the reader whose switch it is ever sees this);
 * - otherwise "<name> isn't taking messages right now", whatever the reason (S1-E9-03).
 * The messages scroll inside their own region, which keeps the newest in view.
 * A story link being sent from a share dialog (GAPS-7a) starts in the message box and leaves the
 * address once the message is sent.
 * Who shows it: MessagesPage. What it calls: useConversation, ChatFocusBar, ChatHeader,
 * ChatMessages, the composer or a note, and AboutChatPanel.
 */
import { useEffect, useRef, type ReactNode } from 'react';

import { Notice } from '@/components/ui/Notice';

import type { Conversation } from '../api/messages';
import { useConversation } from '../hooks/useMessages';
import { useSharedLink } from '../hooks/useSharedLink';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { AboutChatPanel } from './AboutChatPanel';
import { ChatFocusBar } from './ChatFocusBar';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { MessageComposer } from './MessageComposer';
import { MessageSettingsLink } from './MessageSettingsLink';
import { RequestActions } from './RequestActions';

/** The state useConversation gives. */
type ChatState = ReturnType<typeof useConversation>;

/** A plain line at the bottom of the chat. */
function BottomNote({ text }: { text: string }) {
  return <p className="m-0 type-body text-ink-muted">{text}</p>;
}

/**
 * User story 4.3: when the reader's own "Let adults message me" switch is what stops the chat
 * (a 16 or 17-year-old and an adult), the box gives way to a line saying why and Change. The
 * database says when (conversation_with()'s adults_switch_stops); the adult never sees it.
 *
 * @returns the line and Change
 */
function AdultsSwitchNote({ name }: { name: string }) {
  const { t } = useMessagesTranslation();
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 type-body text-ink-muted">{t('chat.adultsOff', { name })}</p>
      <MessageSettingsLink text={t('settings.change')} label={t('settings.changeAdults')} />
    </div>
  );
}

/**
 * After "No thanks" (IDEAS-2 idea 7): the fixed, polite reply in the other person's name, and the
 * day the reader may send a new request. The words come from the locale files, never from them.
 *
 * @returns the note
 */
function NoThanksNote({ chat }: { chat: Conversation }) {
  const { t, i18n } = useMessagesTranslation();
  const askAgain = chat.askAgainFrom === null ? null : new Date(chat.askAgainFrom);
  const date =
    askAgain === null
      ? ''
      : new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-GB' : 'ro', {
          day: 'numeric',
          month: 'long',
        }).format(askAgain);
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 type-body text-ink-muted">
        {t('chat.noThanksReply', { name: chat.displayName })}
      </p>
      <p className="m-0 type-body text-ink-muted">{t('chat.noThanksAgain', { date })}</p>
    </div>
  );
}

/**
 * What the reader can do at the bottom of the chat.
 *
 * @returns the request's buttons, the box, or a note
 */
function ChatBottom({ chat, state }: { chat: Conversation; state: ChatState }) {
  const { t } = useMessagesTranslation();
  const name = chat.displayName;
  const shared = useSharedLink();

  /** Sends the message, then drops the shared link from the address so it isn't offered again. */
  async function sendAndForgetLink(body: string) {
    const result = await state.send(body);
    if (shared.link !== null) shared.clear();
    return result;
  }

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
          onSend={sendAndForgetLink}
          initialBody={shared.link ?? ''}
        />
      </>
    );
  }
  if (chat.saidNoThanks) return <NoThanksNote chat={chat} />;
  if (chat.adultsSwitchStops) return <AdultsSwitchNote name={name} />;
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
      className="max-h-[min(560px,65vh)] overflow-y-auto p-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      <ChatMessages messages={chat.messages} otherName={chat.displayName} />
    </div>
  );
}

/**
 * The chat, once loaded: the header (from 1024 px), the messages and the bottom, then About.
 *
 * @returns the chat section and the About column
 */
function LoadedChat({ chat, state }: { chat: Conversation; state: ChatState }) {
  const { t } = useMessagesTranslation();
  return (
    <>
      <title>{t('chatDocumentTitle', { name: chat.displayName })}</title>
      <section aria-labelledby="chat-heading" className="flex min-w-0 flex-col gap-6">
        <ChatHeader chat={chat} />
        <MessagesRegion chat={chat} />
        <ChatBottom chat={chat} state={state} />
      </section>
      <AboutChatPanel chat={chat} />
    </>
  );
}

/**
 * The middle of the columns while the chat loads, can't load or can't be found.
 *
 * @returns the chat and About, a notice, a plain line or nothing
 */
function ChatMiddle({ state }: { state: ChatState }) {
  const { t } = useMessagesTranslation();
  if (state.chat.isError) return <Notice tone="error">{t('chat.loadFailed')}</Notice>;
  if (state.chat.isPending) return null;
  if (state.chat.data === null) return <p className="m-0 text-ink-muted">{t('chat.notFound')}</p>;
  return <LoadedChat chat={state.chat.data} state={state} />;
}

/**
 * Renders the chat with this person, with the chats beside it from 1024 px (board E13: columns
 * of 320 px, the rest and 280 px, 48 px apart) and, below 1024 px, its own bar on top.
 *
 * @param props.handle - the other person's username from the address
 * @param props.chatList - the chats, shown in the first column from 1024 px
 * @returns the bar and the columns
 */
export function ChatPanel({ handle, chatList }: { handle: string; chatList: ReactNode }) {
  const state = useConversation(handle);
  const chat = state.chat.data ?? null;
  return (
    <div className="flex flex-col gap-6">
      {chat !== null && <ChatFocusBar chat={chat} />}
      <div className="grid min-w-0 grid-cols-1 items-start gap-12 lg:grid-cols-[320px_minmax(0,1fr)_280px]">
        <div className="hidden min-w-0 lg:block">{chatList}</div>
        <ChatMiddle state={state} />
      </div>
    </div>
  );
}
