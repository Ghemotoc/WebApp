/**
 * ChatFocusBar: the one bar over a chat on phones and tablets (user story 4.3: "Phones: header A
 * with Back, the name and More (Block, Report), and no tab bar"; board E13-Chat at 768 and
 * 390 px).
 *
 * A floating glass bar, as the chapter bar is (CALM-5): Back to Messages, the person's name with
 * the kind of writer under it ("Fiction writer", usePartnerLine), and More. More is a disclosure
 * button: it shows Block and Report under the bar and hides them again; it stays open while
 * either one's dialog is open, so the dialog keeps its place. While this bar is on screen the
 * shell leaves its own header A out (usePageOwnsNarrowHeader); from 1024 px the website's top
 * bar and ChatHeader take over and this bar is hidden.
 * Who shows it: ChatPanel. What it calls: ChatActions (Block and Report) and usePartnerLine.
 */
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { NavIcon } from '@/components/icons/NavIcon';
import { usePageOwnsNarrowHeader } from '@/app/shell/pageHeaderContext';

import type { Conversation } from '../api/messages';
import { usePartnerLine } from '../hooks/usePartnerLine';
import { useSharedLink } from '../hooks/useSharedLink';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatActions } from './ChatHeader';

/** The bar's round 44 px buttons. */
const iconButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-heading no-underline hover:bg-tint';

/**
 * Renders the bar and, while More is open, Block and Report under it.
 *
 * @param props.chat - the open chat
 * @returns the bar, shown below 1024 px
 */
export function ChatFocusBar({ chat }: { chat: Conversation }) {
  const { t } = useMessagesTranslation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreId = useId();
  const line = usePartnerLine(chat);
  // A link being shared stays in the address on the way back to the chats (GAPS-7a).
  const shared = useSharedLink();
  // Below 1024 px this is the only bar (user story 4.3).
  usePageOwnsNarrowHeader();
  return (
    <div className="sticky top-[calc(16px+env(safe-area-inset-top))] z-30 mt-4 flex flex-col gap-2 lg:hidden">
      <nav
        aria-label={chat.displayName}
        className="glass-float flex items-center gap-1 rounded-full p-2"
      >
        <Link to={`/messages${shared.query}`} aria-label={t('bar.back')} className={iconButton}>
          <NavIcon name="back" size={22} />
        </Link>
        <p className="m-0 min-w-0 flex-1 text-center">
          <span className="block truncate type-label text-ink-heading">{chat.displayName}</span>
          {line.kind !== null && <span className="block truncate type-meta">{line.kind}</span>}
        </p>
        <button
          type="button"
          aria-label={t('bar.more')}
          aria-expanded={isMoreOpen}
          aria-controls={moreId}
          onClick={() => setIsMoreOpen((isOpen) => !isOpen)}
          className={`${iconButton} cursor-pointer`}
        >
          <ActionIcon name="more" size={22} />
        </button>
      </nav>
      <div id={moreId} hidden={!isMoreOpen} className="glass-float self-end rounded-card px-4">
        <ChatActions chat={chat} />
      </div>
    </div>
  );
}
