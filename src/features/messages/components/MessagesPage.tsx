/**
 * MessagesPage: /messages and /messages/:handle, the person's private chats (story S1-E9-01;
 * board Messages 5.5, redrawn in the liquid glass redesign by bundle G8c: boards Messages and
 * Chat).
 *
 * The header is the boards' page header: the eyebrow, the large title and the lead line on the
 * left, "Message settings" as a grey glass pill on the right. On desktops (1024 px and wider)
 * three columns in one glass card with 32 px corners: the chats, the open chat and "About this
 * chat". With no chat open, the middle says "Pick a chat" with a "New chat" pill. Narrower, one
 * column at a time: the chats at /messages, the chat (with "Chats" to go back, then About below
 * it) at /messages/:handle, so a phone never squeezes two lists side by side (CLAUDE.md rule 21).
 * A visitor is asked to log in.
 * Who shows it: the router; the profile's Message button and the top bar link here.
 * What it calls: ChatList, ChatPanel and NewChatButton.
 */
import { Link, useParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { NavIcon } from '@/components/icons/NavIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatList } from './ChatList';
import { ChatPanel } from './ChatPanel';
import { NewChatButton } from './NewChatButton';

/**
 * The middle column while no chat is open: what to do next, and a way to start a chat.
 *
 * @returns the column, shown from 1024 px
 */
function PickAChat() {
  const { t } = useMessagesTranslation();
  return (
    <div className="hidden flex-col items-start gap-3 p-8 lg:col-span-2 lg:flex">
      <h2 className="m-0 font-heading text-[22px] font-bold text-heading">{t('chat.pickTitle')}</h2>
      <p className="m-0 max-w-[460px] text-body">{t('chat.pick')}</p>
      <NewChatButton look="pill" />
    </div>
  );
}

/**
 * The card with the chats and, when a handle is in the address, that chat.
 *
 * @param props.handle - the other person's username from the address, or null
 * @returns the card
 */
function MessagesCard({ handle }: { handle: string | null }) {
  const { t } = useMessagesTranslation();
  // On a narrow screen the list gives way to the open chat.
  const listVisibility = handle === null ? 'flex' : 'hidden lg:flex';
  return (
    <div className="grid min-w-0 grid-cols-1 overflow-hidden rounded-[32px] border border-border bg-surface shadow-card lg:grid-cols-[300px_minmax(0,1fr)_260px]">
      <div className={`${listVisibility} min-w-0 flex-col pb-2`}>
        <ChatList openHandle={handle} />
      </div>
      {handle === null ? (
        <PickAChat />
      ) : (
        <>
          <Link
            to="/messages"
            className="inline-flex min-h-11 w-fit items-center gap-1.5 px-4 text-sm font-semibold text-link underline lg:hidden"
          >
            <NavIcon name="back" size={16} />
            {t('chat.back')}
          </Link>
          <ChatPanel key={handle.toLowerCase()} handle={handle} />
        </>
      )}
    </div>
  );
}

/**
 * The page's header: the title and lead on the left, "Message settings" on the right.
 *
 * @param props.isSignedIn - true to show the settings pill
 * @returns the header
 */
function MessagesHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const { t } = useMessagesTranslation();
  return (
    <header className="flex flex-col gap-5 pt-14 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-[720px] flex-col gap-2">
        <h1 className="page-title">{t('title')}</h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('lead')}</p>
      </div>
      {isSignedIn && (
        <Link
          to="/settings#messages"
          className={buttonClassName({ variant: 'secondary' }, 'w-fit shrink-0')}
        >
          <ActionIcon name="settings" size={16} />
          {t('settings.pageLink')}
        </Link>
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
    <PageContainer className="flex flex-col gap-8 pb-16">
      <title>{t('documentTitle')}</title>
      <MessagesHeader isSignedIn={isSignedIn} />
      {isKnown && userId === null && (
        <p className="m-0 text-body">
          {t('signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('logIn')}
          </Link>
        </p>
      )}
      {isSignedIn && <MessagesCard handle={handle} />}
    </PageContainer>
  );
}
