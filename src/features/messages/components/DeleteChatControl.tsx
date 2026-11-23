/**
 * DeleteChatControl: "Delete chat" in About this chat, with a confirmation (story S1-E9-04; board
 * Messages 5.5: "This removes the chat for you. When both of you delete it, the messages are
 * deleted for good.").
 *
 * The confirmation is CALM-9 board E13's popup: an alertdialog titled "Delete this chat?", the
 * line "It goes from your messages straight away. When [name] deletes it too, the messages are
 * gone for good." and the buttons "Keep the chat" and "Delete the chat" (danger colour). It is a
 * native <dialog> opened with showModal(), so focus moves inside and Escape keeps the chat;
 * focus starts on "Keep the chat", the safe choice, put there after showModal() because the
 * main button comes first (design books item 8).
 *
 * The chat goes for the reader only and the other person isn't told; if someone writes again,
 * the chat comes back with only the new messages. Once both have deleted it, the nightly
 * clean-up deletes the messages for good (purge_deleted_chats()). After deleting, the reader is
 * back on Messages. No doodles (DoD: safety screens).
 * Who shows it: AboutChatPanel, for a chat that has started and isn't a request to the reader.
 * What it calls: useDeleteChat → delete_conversation().
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { ButtonRow } from '@/components/ui/ButtonRow';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';

import { useDeleteChat } from '../hooks/useMessageSettings';
import { useMessagesTranslation } from '../registerMessagesTranslations';

/**
 * Renders the button, its explanation and the confirmation.
 *
 * @param props.handle - the other person's username
 * @param props.name - the other person's pen name or username, as the chat shows it
 * @returns the control
 */
export function DeleteChatControl({ handle, name }: { handle: string; name: string }) {
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
      <p className="m-0 type-body text-ink-muted">{t('deleteChat.explain')}</p>
      <DeleteChatDialog
        isOpen={isOpen}
        name={name}
        hasFailed={deleting.hasFailed}
        isDeleting={deleting.isDeleting}
        onClose={close}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}

/** What the confirmation needs. */
interface DeleteChatDialogProps {
  isOpen: boolean;
  /** The other person's name, said in the line under the title. */
  name: string;
  hasFailed: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * The "Delete this chat?" popup (CALM-9, board E13).
 *
 * @param props - whether it is open, the name, the deleting state and the two actions
 * @returns the native <dialog> with role alertdialog
 */
function DeleteChatDialog(props: DeleteChatDialogProps) {
  const { t } = useMessagesTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open and close the native dialog as the prop changes; showModal() traps focus inside.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (props.isOpen && !dialog.open) {
      dialog.showModal();
      // The main button now comes first (design books item 8), so the focus is put on the
      // safe choice by hand instead of on the first button.
      dialog.querySelector<HTMLElement>('[data-safe-choice]')?.focus();
    }
    if (!props.isOpen && dialog.open) dialog.close();
  }, [props.isOpen]);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="delete-chat-heading"
      aria-describedby="delete-chat-body"
      onClose={props.onClose}
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-border bg-surface p-6 text-ink shadow-card backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-4">
        <h2
          id="delete-chat-heading"
          className="m-0 font-heading type-heading leading-[1.15] font-bold text-ink-heading"
        >
          {t('deleteChat.title')}
        </h2>
        <p id="delete-chat-body" className="m-0 type-body leading-relaxed text-ink-muted">
          {t('deleteChat.body', { name: props.name })}
        </p>
        {/* A failed attempt keeps the popup open with a plain message. */}
        {props.hasFailed && <Notice tone="error">{t('deleteChat.failed')}</Notice>}
        <ButtonRow className="mt-2">
          <Button variant="destructive" disabled={props.isDeleting} onClick={props.onConfirm}>
            {t(props.isDeleting ? 'deleteChat.deleting' : 'deleteChat.confirm')}
          </Button>
          <Button variant="secondary" onClick={props.onClose} data-safe-choice>
            {t('deleteChat.cancel')}
          </Button>
        </ButtonRow>
      </div>
    </dialog>
  );
}
