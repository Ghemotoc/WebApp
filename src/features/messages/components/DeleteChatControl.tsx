/**
 * DeleteChatControl: "Delete chat" in About this chat, with a confirmation (story S1-E9-04; board
 * Messages 5.5: "This removes the chat for you. When both of you delete it, the messages are
 * deleted for good.").
 *
 * The chat goes for the reader only and the other person isn't told; if someone writes again,
 * the chat comes back with only the new messages. Once both have deleted it, the nightly
 * clean-up deletes the messages for good (purge_deleted_chats()). After deleting, the reader is
 * back on Messages. No doodles (DoD: safety screens).
 * Who shows it: AboutChatPanel, for a chat that has started and isn't a request to the reader.
 * What it calls: useDeleteChat → delete_conversation().
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PeopleDialog } from '@/features/people/components/PeopleDialog';

import { useDeleteChat } from '../hooks/useMessageSettings';
import { useMessagesTranslation } from '../registerMessagesTranslations';

/**
 * Renders the button, its explanation and the confirmation.
 *
 * @param props.handle - the other person's username
 * @returns the control
 */
export function DeleteChatControl({ handle }: { handle: string }) {
  const { t } = useMessagesTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const deleting = useDeleteChat();
  const navigate = useNavigate();

  /** Closing forgets a failed attempt, so the next opening starts clean. */
  function close() {
    deleting.reset();
    setIsOpen(false);
  }

  /** Deletes, then goes back to the list; a failure stays open with the message. */
  async function confirm() {
    const isDeleted = await deleting.remove(handle).then(
      () => true,
      () => false,
    );
    if (!isDeleted) return;
    close();
    await navigate('/messages');
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3">
      <Eyebrow>{t('deleteChat.eyebrow')}</Eyebrow>
      <Button
        variant="destructive"
        className="w-fit"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        {t('deleteChat.button')}
      </Button>
      <p className="m-0 text-sm text-body">{t('deleteChat.explain')}</p>
      <PeopleDialog
        isOpen={isOpen}
        onClose={close}
        eyebrow={t('deleteChat.eyebrow')}
        title={t('deleteChat.title')}
        closeLabel={t('deleteChat.close')}
      >
        <p className="m-0 text-body">{t('deleteChat.explain')}</p>
        {deleting.hasFailed && <Notice tone="error">{t('deleteChat.failed')}</Notice>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={close}>
            {t('deleteChat.cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={deleting.isDeleting}
            onClick={() => void confirm()}
          >
            {t(deleting.isDeleting ? 'deleteChat.deleting' : 'deleteChat.confirm')}
          </Button>
        </div>
      </PeopleDialog>
    </div>
  );
}
