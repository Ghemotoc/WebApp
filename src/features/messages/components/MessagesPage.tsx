/**
 * MessagesPage: /messages and /messages/:handle, the person's private chats (story S1-E9-01;
 * board Messages 5.5).
 *
 * On desktops (1024 px and wider) three columns in one card: the chats, the open chat and "About
 * this chat". Narrower, one column at a time: the chats at /messages, the chat (with "All chats"
 * to go back, then About below it) at /messages/:handle, so a phone never squeezes two lists side
 * by side (CLAUDE.md rule 21). A visitor is asked to log in.
 * Who shows it: the router; the profile's Message button and the top bar link here.
 * What it calls: ChatList and ChatPanel.
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatList } from './ChatList';
import { ChatPanel } from './ChatPanel';
import { MessageSettingsLink } from './MessageSettingsLink';

/**
 * The card with the list and the chat.
 *
 * @param handle - the open chat's username, or null at /messages
 * @returns the card
 */
function MessagesCard({ handle }: { handle: string | null }) {
  const { t } = useMessagesTranslation();
  const listVisibility = handle === null ? 'flex' : 'hidden lg:flex';
  return (
    <div className="grid min-w-0 grid-cols-1 overflow-hidden rounded-card border border-border bg-surface shadow-card lg:grid-cols-[300px_minmax(0,1fr)_260px]">
      <div className={`${listVisibility} min-w-0 flex-col pb-2`}>
        <ChatList openHandle={handle} />
      </div>
      {handle === null ? (
        <p className="m-0 hidden p-6 text-body lg:col-span-2 lg:block">{t('chat.pick')}</p>
      ) : (
        <>
          <Link
            to="/messages"
            className="inline-flex min-h-11 w-fit items-center px-4 text-sm font-semibold text-link underline lg:hidden"
          >
            {t('chat.back')}
          </Link>
          <ChatPanel key={handle.toLowerCase()} handle={handle} />
        </>
      )}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function MessagesPage() {
  const { t } = useMessagesTranslation();
  const { handle = null } = useParams();
  const { userId, isKnown } = useSession();
  return (
    <PageContainer className="flex flex-col gap-6 pb-16">
      <title>{t('documentTitle')}</title>
      <header className="flex max-w-[720px] flex-col gap-4 pt-14">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
          {t('title')}
        </h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('lead')}</p>
        {isKnown && userId !== null && (
          <MessageSettingsLink
            text={t('settings.pageLink')}
            label={t('settings.pageLink')}
            withIcon
          />
        )}
      </header>
      {isKnown && userId === null && (
        <p className="m-0 text-body">
          {t('signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('logIn')}
          </Link>
        </p>
      )}
      {isKnown && userId !== null && <MessagesCard handle={handle} />}
    </PageContainer>
  );
}
