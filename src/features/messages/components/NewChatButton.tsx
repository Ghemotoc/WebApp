/**
 * NewChatButton: the round + beside "Chats", and the small dialog it opens to start a chat by
 * username (story S1-E9-01; board Messages 5.5).
 *
 * The dialog only opens /messages/:handle; whether the person may be written to is decided there
 * by the database, so this never reveals anything about anyone.
 * Who shows it: ChatList. What it calls: PeopleDialog (S1-E5-05) and the router.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { PeopleDialog } from '@/features/people/components/PeopleDialog';

import { useMessagesTranslation } from '../registerMessagesTranslations';

/**
 * Renders the + and its dialog.
 *
 * @returns the button and the dialog
 */
export function NewChatButton() {
  const { t } = useMessagesTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [handle, setHandle] = useState('');

  /** Opens the chat with the username typed, without the @. */
  function open(event: FormEvent) {
    event.preventDefault();
    const username = handle.trim().replace(/^@/, '');
    if (username === '') return;
    setIsOpen(false);
    setHandle('');
    void navigate(`/messages/${encodeURIComponent(username)}`);
  }

  return (
    <>
      <button
        type="button"
        aria-label={t('list.newChat')}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border border-control-border bg-surface text-heading hover:bg-tint"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <PeopleDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        eyebrow={t('newChat.eyebrow')}
        title={t('newChat.title')}
        closeLabel={t('newChat.close')}
      >
        <form noValidate onSubmit={open} className="flex flex-col gap-4">
          <TextInput
            id="new-chat-handle"
            label={t('newChat.label')}
            hint={t('newChat.hint')}
            autoComplete="off"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
          />
          <Button type="submit" className="w-fit" disabled={handle.trim() === ''}>
            {t('newChat.open')}
          </Button>
        </form>
      </PeopleDialog>
    </>
  );
}
