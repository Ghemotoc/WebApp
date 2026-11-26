/**
 * ChatHeader: the top of a chat from 1024 px: the other person's avatar, their name as a link to
 * their profile, the line about what they write, then Block and Report (story S1-E9-01 for the
 * person, S1-E9-02 for the two actions; user story 4.3, board E13-Chat).
 *
 * As the board draws it: a hairline under the row, the name in the label style, the meta line
 * "Fiction writer · The Salt Mine Choir, 15 chapters" (usePartnerLine; none when the reader can
 * read none of their stories) and Block and Report as text buttons. Block opens "Block <name>?"
 * (ChatBlockDialog); Report reports the person's profile (rule 6). Both name the person in their
 * accessible names. The online dot follows the name while the person shows as online to the
 * reader (S1-E13-01). On phones and tablets ChatFocusBar holds the same things.
 * Who shows it: ChatPanel. What it calls: ChatBlockDialog, ReportButton (S1-E10-01) and
 * usePartnerLine.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { OnlineDot } from '@/features/privacy/components/OnlineDot';
import { useOnlineHandles } from '@/features/privacy/hooks/useOnlineStatus';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { Conversation } from '../api/messages';
import { usePartnerLine } from '../hooks/usePartnerLine';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatAvatar } from './ChatAvatar';
import { ChatBlockDialog } from './ChatBlockDialog';

/**
 * Block and Report as text buttons, with the block dialog.
 *
 * @param props.chat - the open chat
 * @returns the two buttons
 */
export function ChatActions({ chat }: { chat: Conversation }) {
  const { t } = useMessagesTranslation();
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const name = chat.displayName;
  return (
    <div className="flex items-center gap-6">
      <Button
        variant="text"
        aria-haspopup="dialog"
        aria-label={t('block.open', { name })}
        onClick={() => setIsBlockOpen(true)}
      >
        {t('block.button')}
      </Button>
      <ReportButton itemType="profile" itemReference={chat.handle} itemLabel={`@${chat.handle}`} />
      <ChatBlockDialog
        isOpen={isBlockOpen}
        onClose={() => setIsBlockOpen(false)}
        handle={chat.handle}
        name={name}
      />
    </div>
  );
}

/**
 * Renders the header.
 *
 * @param props.chat - the open chat
 * @returns the header, shown from 1024 px
 */
export function ChatHeader({ chat }: { chat: Conversation }) {
  const name = chat.displayName;
  const line = usePartnerLine(chat);
  // The dot by the name while they are online for this reader (S1-E13-01).
  const online = useOnlineHandles([chat.handle]);
  return (
    <header className="hidden items-center gap-3 border-b border-hairline pb-3 lg:flex">
      <ChatAvatar name={name} handle={chat.handle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 id="chat-heading" className="m-0 flex min-w-0 items-center gap-2 type-label">
          <Link
            to={`/u/${chat.handle}`}
            className="truncate text-ink-heading underline underline-offset-[3px]"
          >
            {name}
          </Link>
          <OnlineDot isOnline={online.has(chat.handle.toLowerCase())} />
        </h2>
        {line.full !== null && <p className="m-0 type-meta">{line.full}</p>}
      </div>
      <ChatActions chat={chat} />
    </header>
  );
}
