/**
 * ChatBlockDialog: "Block <name>?" from inside a chat (story S1-E9-02 criterion 1; board Messages
 * 5.5: "You won't be able to message, mention or follow each other. <name> won't be told.",
 * "Don't block" and "Block <name>").
 *
 * It uses the same block as the profile (useBlock → set_block(), S1-E5-05), which ends the
 * follows both ways; the database then refuses messages both ways. Nothing is sent to the other
 * person. Once blocked, the chat is gone from both lists, so the reader goes back to Messages.
 * No doodles (DoD: safety screens).
 * Who shows it: ChatHeader. What it calls: useBlock, then refreshes every Messages query.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PeopleDialog } from '@/features/people/components/PeopleDialog';
import { useBlock } from '@/features/people/hooks/useBlock';

import { messagesKeys } from '../hooks/useMessages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

/** What the dialog needs. */
export interface ChatBlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The other person's username, which set_block() takes. */
  handle: string;
  /** Their pen name or username, as the chat shows it. */
  name: string;
}

/**
 * Renders the dialog.
 *
 * @returns the dialog
 */
export function ChatBlockDialog({ isOpen, onClose, handle, name }: ChatBlockDialogProps) {
  const { t } = useMessagesTranslation();
  const block = useBlock();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /** Closing forgets a failed attempt, so the next opening starts clean. */
  function handleClose() {
    block.reset();
    onClose();
  }

  /** Blocks, refreshes Messages and goes back to the list; a failure stays open with the message. */
  async function handleConfirm() {
    const isBlocked = await block.change(handle, true).catch(() => null);
    if (isBlocked !== true) return;
    // Step 1: the list, the top bar's count and this chat all change with a block.
    await queryClient.invalidateQueries({ queryKey: messagesKeys.all });
    // Step 2: the chat is gone, so the reader goes back to Messages.
    handleClose();
    await navigate('/messages');
  }

  return (
    <PeopleDialog
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow={t('block.eyebrow')}
      title={t('block.title', { name })}
      closeLabel={t('block.close')}
    >
      <p className="m-0 text-body">{t('block.body', { name })}</p>
      {block.hasFailed && <Notice tone="error">{t('block.failed')}</Notice>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={handleClose}>
          {t('block.cancel')}
        </Button>
        <Button
          variant="destructive"
          disabled={block.isSaving}
          onClick={() => void handleConfirm()}
        >
          {block.isSaving ? t('block.saving') : t('block.confirm', { name })}
        </Button>
      </div>
    </PeopleDialog>
  );
}
