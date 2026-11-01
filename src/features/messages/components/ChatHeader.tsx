/**
 * ChatHeader: the top of a chat: the other person's avatar, name and username, then Block and
 * Report (story S1-E9-01 for the person, S1-E9-02 for the two actions; board Messages 5.5).
 *
 * Block opens "Block <name>?" (ChatBlockDialog). Report reports the person's profile (rule 6);
 * a single message is reported from its own Report beside it (ChatMessages). Both are plain text
 * buttons with the person named in their accessible names, so a screen reader knows whose they
 * are. The online dot follows the username while the person shows as online to the reader
 * (S1-E13-01). No doodles (DoD: reporting screens).
 * Who shows it: ChatPanel. What it calls: ChatBlockDialog and ReportButton (S1-E10-01).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { OnlineDot } from '@/features/privacy/components/OnlineDot';
import { useOnlineHandles } from '@/features/privacy/hooks/useOnlineStatus';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { Conversation } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatAvatar } from './ChatAvatar';
import { ChatBlockDialog } from './ChatBlockDialog';

/**
 * Renders the header.
 *
 * @param props.chat - the open chat
 * @returns the header
 */
export function ChatHeader({ chat }: { chat: Conversation }) {
  const { t } = useMessagesTranslation();
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const name = chat.displayName;
  // The dot by the name while they are online for this reader (S1-E13-01).
  const online = useOnlineHandles([chat.handle]);
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
      <ChatAvatar name={name} handle={chat.handle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 id="chat-heading" className="m-0 truncate font-heading text-xl font-bold text-heading">
          {name}
        </h2>
        <p className="m-0 flex items-center gap-2 truncate text-sm text-meta">
          @{chat.handle}
          <OnlineDot isOnline={online.has(chat.handle.toLowerCase())} />
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="text"
          aria-haspopup="dialog"
          aria-label={t('block.open', { name })}
          onClick={() => setIsBlockOpen(true)}
        >
          {t('block.button')}
        </Button>
        <ReportButton
          itemType="profile"
          itemReference={chat.handle}
          itemLabel={`@${chat.handle}`}
        />
      </div>
      <ChatBlockDialog
        isOpen={isBlockOpen}
        onClose={() => setIsBlockOpen(false)}
        handle={chat.handle}
        name={name}
      />
    </header>
  );
}
