/**
 * MessagesPage: /messages and /messages/:handle, the person's private chats (story S1-E9-01;
 * user stories 4.2 and 4.3, boards E12-Messages and E13-Chat of "Build: the full design as user
 * stories").
 *
 * Board E12, no chat open: the title, the lead and a row with "+ New chat" (a quiet button) and
 * "Message settings" (a text button); then, from 1024 px, the chats beside a "Pick a chat" card.
 * Board E13, a chat open: the title alone, then three columns from 1024 px (the chats, the chat,
 * About this chat). Narrower, one thing at a time (user story 4.2): the chats at /messages, and
 * at /messages/:handle the chat full screen under its own bar (ChatFocusBar: Back, the name and
 * More), with About below it and no tab bar (CLAUDE.md rule 21). A visitor is asked to log in.
 * When a reader arrives from a share dialog's "Send in Messages" (bundle GAPS-7, part a; board
 * 3.6 Share), a notice above the card shows the link and says what to do next: pick a chat, then
 * send. "Don't send" drops the link.
 * Who shows it: the router; the profile's Message button and the top bar link here.
 * What it calls: ChatList, ChatPanel, NewChatButton and useSharedLink.
 */
import { Link, useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import { useSharedLink } from '../hooks/useSharedLink';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatList } from './ChatList';
import { ChatPanel } from './ChatPanel';
import { NewChatButton } from './NewChatButton';

/**
 * The right-hand card while no chat is open (board E12): what to do next, and New chat across
 * the card.
 *
 * @returns the card, shown from 1024 px
 */
function PickAChat() {
  const { t } = useMessagesTranslation();
  return (
    <div className="hidden flex-col gap-3 rounded-card bg-surface-solid p-12 lg:flex">
      <h2 className="m-0 type-subheading">{t('chat.pickTitle')}</h2>
      <p className="m-0 max-w-[460px] type-body text-ink-muted">{t('chat.pick')}</p>
      <NewChatButton isWide />
    </div>
  );
}

/**
 * The chats and, when a handle is in the address, that chat.
 *
 * Board E12 (no chat open): the chats and "Pick a chat" side by side, 1 : 1.4, 64 px apart.
 * Board E13 (a chat open): the chats, the chat and About this chat in columns of 320 px, the rest
 * and 280 px, 48 px apart. Narrower than 1024 px one thing at a time: the chats at /messages,
 * the chat with About under it at /messages/:handle (user story 4.2).
 *
 * @param props.handle - the other person's username from the address, or null
 * @returns the columns
 */
function MessagesColumns({ handle }: { handle: string | null }) {
  if (handle === null) {
    return (
      <div className="grid min-w-0 grid-cols-1 items-start gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <ChatList openHandle={null} />
        <PickAChat />
      </div>
    );
  }
  return (
    <ChatPanel
      key={handle.toLowerCase()}
      handle={handle}
      chatList={<ChatList openHandle={handle} />}
    />
  );
}

/**
 * The notice while a story link is being sent into a chat (GAPS-7a): the link, what to do next
 * and a way out. Nothing is sent until the reader presses Send in a chat.
 *
 * @param props.hasOpenChat - true once a chat is open, when the link sits in the message box
 * @returns the notice, or nothing when no link is being shared
 */
function SharedLinkNotice({ hasOpenChat }: { hasOpenChat: boolean }) {
  const { t } = useMessagesTranslation();
  const shared = useSharedLink();
  if (shared.link === null) return null;
  return (
    <Notice tone="info">
      <span className="flex flex-col gap-2">
        <span>{t(hasOpenChat ? 'share.ready' : 'share.pick')}</span>
        <span className="font-semibold [overflow-wrap:anywhere]">{shared.link}</span>
        <Button variant="secondary" className="w-fit" onClick={shared.clear}>
          {t('share.cancel')}
        </Button>
      </span>
    </Notice>
  );
}

/**
 * The page's header. Board E12: the title, the lead, then "+ New chat" and "Message settings".
 * Board E13 (a chat open): the title alone, and on phones and tablets not even that, because
 * the chat's own bar names the person (it stays for screen readers).
 *
 * @param props.isSignedIn - true to show the two actions
 * @param props.hasOpenChat - true while a chat is open
 * @returns the header
 */
function MessagesHeader({
  isSignedIn,
  hasOpenChat,
}: {
  isSignedIn: boolean;
  hasOpenChat: boolean;
}) {
  const { t } = useMessagesTranslation();
  if (hasOpenChat) {
    return (
      <header className="sr-only lg:not-sr-only lg:pt-12">
        <h1 className="page-title">{t('title')}</h1>
      </header>
    );
  }
  return (
    <header className="flex flex-col gap-2 pt-12">
      <h1 className="page-title">{t('title')}</h1>
      <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('lead')}</p>
      {isSignedIn && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <NewChatButton />
          <Link to="/settings#messages" className={buttonClassName({ variant: 'text' })}>
            {t('settings.pageLink')}
          </Link>
        </div>
      )}
    </header>
  );
}

/**
 * Renders the page.
 *
 * @returns the header and the chats, or the log-in prompt
 */
export function MessagesPage() {
  const { t } = useMessagesTranslation();
  const { handle = null } = useParams();
  const { userId, isKnown } = useSession();
  const isSignedIn = isKnown && userId !== null;
  return (
    <PageContainer className="flex flex-col gap-16 pb-16">
      <title>{t('documentTitle')}</title>
      <MessagesHeader isSignedIn={isSignedIn} hasOpenChat={handle !== null} />
      {isKnown && userId === null && (
        <p className="m-0 text-ink-muted">
          {t('signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('logIn')}
          </Link>
        </p>
      )}
      {isSignedIn && <SharedLinkNotice hasOpenChat={handle !== null} />}
      {isSignedIn && <MessagesColumns handle={handle} />}
    </PageContainer>
  );
}
